import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
  useMultiFileAuthState,
  WASocket,
  proto,
  AnyMessageContent,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import { toDataURL } from "qrcode";
import path from "path";
import fs from "fs";
import EventEmitter from "events";

export interface WhatsAppMessage {
  from: string;       // phone JID
  body: string;
  messageId: string;
  timestamp: number;
  isGroup: boolean;
  pushName?: string;
}

export type ConnectionStatus = "connecting" | "open" | "close" | "qr";

export class WhatsAppClient extends EventEmitter {
  private sock: WASocket | null = null;
  private sessionPath: string;
  private logger = pino({ level: "silent" });
  public status: ConnectionStatus = "connecting";

  constructor(private businessId: string, sessionsRoot: string) {
    super();
    this.sessionPath = path.join(sessionsRoot, businessId);
    fs.mkdirSync(this.sessionPath, { recursive: true });
  }

  async connect() {
    const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      logger: this.logger as any,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.logger as any),
      },
      printQRInTerminal: false,
      generateHighQualityLinkPreview: false,
    });

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.status = "qr";
        const qrDataUrl = await toDataURL(qr);
        this.emit("qr", qrDataUrl);
      }

      if (connection === "open") {
        this.status = "open";
        this.emit("connected");
      }

      if (connection === "close") {
        this.status = "close";
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        this.emit("disconnected", { code, shouldReconnect });

        if (shouldReconnect) {
          setTimeout(() => this.connect(), 5000);
        }
      }
    });

    this.sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        if (!msg.message) continue;

        const jid = jidNormalizedUser(msg.key.remoteJid ?? "") ?? msg.key.remoteJid ?? "";
        const isGroup = jid.endsWith("@g.us");
        if (isGroup) continue; // só DM por enquanto

        const body =
          msg.message.conversation ??
          msg.message.extendedTextMessage?.text ??
          msg.message.buttonsResponseMessage?.selectedButtonId ??
          msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ??
          "";

        if (!body) continue;

        const parsed: WhatsAppMessage = {
          from: jid,
          body: body.trim(),
          messageId: msg.key.id ?? "",
          timestamp: (msg.messageTimestamp as number) ?? Date.now() / 1000,
          isGroup,
          pushName: msg.pushName ?? undefined,
        };

        this.emit("message", parsed);
      }
    });
  }

  async sendText(to: string, text: string): Promise<string | undefined> {
    if (!this.sock) throw new Error("Socket not connected");
    const jid = jidNormalizedUser(to) ?? (to.includes("@") ? to : `${to}@s.whatsapp.net`);
    const result = await this.sock.sendMessage(jid, { text });
    return result?.key.id ?? undefined;
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<string | undefined> {
    if (!this.sock) throw new Error("Socket not connected");
    const jid = jidNormalizedUser(to) ?? (to.includes("@") ? to : `${to}@s.whatsapp.net`);
    const result = await this.sock.sendMessage(jid, {
      image: { url: imageUrl },
      caption,
    });
    return result?.key.id ?? undefined;
  }

  async sendButtons(to: string, text: string, buttons: { id: string; text: string }[]): Promise<void> {
    if (!this.sock) throw new Error("Socket not connected");
    const jid = jidNormalizedUser(to) ?? (to.includes("@") ? to : `${to}@s.whatsapp.net`);
    await this.sock.sendMessage(jid, {
      text,
      footer: "Selecione uma opção:",
      buttons: buttons.map((b) => ({
        buttonId: b.id,
        buttonText: { displayText: b.text },
        type: 1,
      })),
    } as AnyMessageContent);
  }

  async sendList(
    to: string,
    header: string,
    body: string,
    buttonText: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
  ): Promise<void> {
    if (!this.sock) throw new Error("Socket not connected");
    const jid = jidNormalizedUser(to) ?? (to.includes("@") ? to : `${to}@s.whatsapp.net`);
    await this.sock.sendMessage(jid, {
      listMessage: {
        title: header,
        text: body,
        buttonText,
        listType: proto.Message.ListMessage.ListType.SINGLE_SELECT,
        sections,
      },
    } as unknown as AnyMessageContent);
  }

  async logout() {
    await this.sock?.logout();
    this.sock = null;
    this.status = "close";
    fs.rmSync(this.sessionPath, { recursive: true, force: true });
  }

  isConnected(): boolean {
    return this.status === "open";
  }
}

// Manager global de instâncias (uma por negócio)
export class WhatsAppManager {
  private clients = new Map<string, WhatsAppClient>();

  getOrCreate(businessId: string, sessionsRoot: string): WhatsAppClient {
    if (!this.clients.has(businessId)) {
      const client = new WhatsAppClient(businessId, sessionsRoot);
      this.clients.set(businessId, client);
    }
    return this.clients.get(businessId)!;
  }

  get(businessId: string): WhatsAppClient | undefined {
    return this.clients.get(businessId);
  }

  remove(businessId: string) {
    this.clients.delete(businessId);
  }

  all(): Map<string, WhatsAppClient> {
    return this.clients;
  }
}
