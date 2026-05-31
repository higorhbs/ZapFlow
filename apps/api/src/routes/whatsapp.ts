import fs from "fs";
import path from "path";
import { type FastifyInstance } from "fastify";
import { getBusiness, getConversation, setBusinessConnected, upsertConversation, createMessage } from "@flowdesk/firebase";
import { requireAuth } from "../middleware/auth";
import { isWhatsAppRuntime, waManager } from "../wa-manager";
import { ensureWhatsAppClient, hasStoredSession } from "../wa-lifecycle";

function waUnavailable(reply: { status: (code: number) => { send: (payload: Record<string, unknown>) => unknown } }) {
  return reply.status(503).send({
    status: "error",
    message: "WhatsApp exige API com processo contínuo (servidor com ENABLE_WORKERS=true).",
  });
}

async function resetWhatsAppSession(businessId: string, sessionsRoot: string) {
  const existing = waManager.get(businessId);
  if (existing) {
    try {
      await existing.logout();
    } catch {
      const sessionDir = path.join(sessionsRoot, businessId);
      if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
    }
    waManager.remove(businessId);
    return;
  }

  const sessionDir = path.join(sessionsRoot, businessId);
  if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
}

async function connectForQr(businessId: string, sessionsRoot: string, force: boolean, log: { error: (meta: Record<string, unknown>, message: string) => void }) {
  if (force) await resetWhatsAppSession(businessId, sessionsRoot);

  const client = ensureWhatsAppClient(waManager, sessionsRoot, businessId);
  if (client.isConnected()) {
    await setBusinessConnected(businessId, true);
    return { status: "already_connected" as const };
  }

  if (client.lastQrDataUrl && !force) {
    return { status: "qr" as const, qr: client.lastQrDataUrl };
  }

  void client.connect().catch((err: unknown) => {
    log.error({ err }, "whatsapp connect failed");
  });

  return {
    status: "connecting" as const,
    message: "Gerando QR Code. Aguarde alguns segundos nesta tela.",
  };
}

export async function whatsappRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth as never);

  const sessionsRoot = process.env.WA_SESSION_PATH?.trim();
  if (!sessionsRoot) throw new Error("WA_SESSION_PATH é obrigatório.");

  app.post("/businesses/:id/whatsapp/connect", async (req: any, reply: any) => {
    if (!isWhatsAppRuntime()) return waUnavailable(reply);

    const { id } = req.params;
    const force = req.query.force === "1";
    const business = await getBusiness(id, req.tenantId);
    if (!business) return reply.status(404).send({ error: "Negócio não encontrado" });

    try {
      const result = await connectForQr(id, sessionsRoot, force, req.log);
      if (result.status === "already_connected" || waManager.get(id)?.isConnected()) {
        await setBusinessConnected(id, true);
      }
      return reply.send(result);
    } catch (err) {
      req.log.error({ err }, "whatsapp connect failed");
      return reply.status(500).send({
        status: "error",
        message: err instanceof Error ? err.message : "Falha ao gerar QR Code",
      });
    }
  });

  app.get("/businesses/:id/whatsapp/status", async (req: any, reply: any) => {
    if (!isWhatsAppRuntime()) {
      return { connected: false, status: "unavailable", message: "API sem suporte a WhatsApp" };
    }

    const { id } = req.params;
    const business = await getBusiness(id, req.tenantId);
    if (!business) return reply.status(404).send({ error: "Negócio não encontrado" });

    let client = waManager.get(id);
    if (!client && hasStoredSession(sessionsRoot, id)) {
      client = ensureWhatsAppClient(waManager, sessionsRoot, id);
    }

    if (
      client &&
      !client.isConnected() &&
      client.status !== "connecting" &&
      client.status !== "qr" &&
      hasStoredSession(sessionsRoot, id)
    ) {
      void client.connect().catch((err: unknown) => {
        req.log.error({ err }, "whatsapp reconnect failed");
      });
    }

    const connected = client?.isConnected() ?? false;
    if (connected !== business.isConnected) {
      await setBusinessConnected(id, connected);
    }

    return {
      connected,
      status: client?.status ?? "disconnected",
      qr: !connected && client?.lastQrDataUrl ? client.lastQrDataUrl : undefined,
    };
  });

  app.post("/businesses/:id/whatsapp/disconnect", async (req: any, reply: any) => {
    if (!isWhatsAppRuntime()) return waUnavailable(reply);

    const { id } = req.params;
    const business = await getBusiness(id, req.tenantId);
    if (!business) return reply.status(404).send({ error: "Negócio não encontrado" });

    const client = waManager.get(id);
    if (client) {
      await client.logout();
      waManager.remove(id);
      await setBusinessConnected(id, false);
    }

    return { status: "disconnected" };
  });

  app.post("/businesses/:id/whatsapp/send", async (req: any, reply: any) => {
    if (!isWhatsAppRuntime()) return waUnavailable(reply);

    const { id } = req.params;
    const { to, text, conversationId } = req.body;
    if (!to?.trim() || !text?.trim()) {
      return reply.status(400).send({ error: "Destino e mensagem são obrigatórios" });
    }

    const business = await getBusiness(id, req.tenantId);
    if (!business) return reply.status(404).send({ error: "Negócio não encontrado" });

    const client = waManager.get(id);
    if (!client?.isConnected()) return reply.status(400).send({ error: "WhatsApp not connected" });

    let convId = conversationId;
    if (convId) {
      const conv = await getConversation(id, convId);
      if (!conv) return reply.status(404).send({ error: "Conversa não encontrada" });
    } else {
      convId = (await upsertConversation(id, to.trim())).id;
    }

    const waMessageId = await client.sendText(to.trim(), text.trim());
    const message = await createMessage(id, convId, {
      role: "HUMAN",
      content: text.trim(),
    });

    return { messageId: waMessageId, message };
  });
}