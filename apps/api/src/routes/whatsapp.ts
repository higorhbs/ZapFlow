import { FastifyInstance, FastifyReply } from "fastify";
import { getBusiness, setBusinessConnected } from "@zapflow/firebase";
import { requireAuth } from "../middleware/auth";
import type { WhatsAppClient } from "@zapflow/whatsapp-client";
import { isWhatsAppRuntime, waManager } from "../wa-manager.js";
import { processMessage } from "../services/bot.js";

type ConnectResult = {
  status: string;
  qr?: string;
  message?: string;
};

const lifecycleAttached = new WeakSet<WhatsAppClient>();

function waUnavailable(reply: FastifyReply) {
  return reply.status(503).send({
    status: "error",
    message:
      "WhatsApp exige API com processo contínuo (servidor com ENABLE_WORKERS=true).",
  });
}

function waitForQr(client: WhatsAppClient, timeoutMs = 12_000): Promise<ConnectResult> {
  if (client.isConnected()) {
    return Promise.resolve({ status: "already_connected" });
  }
  if (client.lastQrDataUrl) {
    return Promise.resolve({ status: "qr", qr: client.lastQrDataUrl });
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      client.off("qr", onQr);
      if (client.lastQrDataUrl) {
        resolve({ status: "qr", qr: client.lastQrDataUrl });
        return;
      }
      resolve({
        status: "connecting",
        message: "Gerando QR Code. Aguarde alguns segundos nesta tela.",
      });
    }, timeoutMs);

    const onQr = (qrDataUrl: string) => {
      clearTimeout(timer);
      client.off("qr", onQr);
      resolve({ status: "qr", qr: qrDataUrl });
    };

    client.once("qr", onQr);
  });
}

export async function whatsappRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  const sessionsRoot = process.env.WA_SESSION_PATH ?? "./sessions";

  function attachLifecycle(id: string, client: WhatsAppClient) {
    if (lifecycleAttached.has(client)) return;
    lifecycleAttached.add(client);

    client.on("connected", async () => {
      try {
        await setBusinessConnected(id, true);
      } catch (err) {
        console.error(`[whatsapp] failed to mark connected for ${id}:`, err);
      }
    });

    client.on("disconnected", async () => {
      try {
        await setBusinessConnected(id, false);
      } catch (err) {
        console.error(`[whatsapp] failed to mark disconnected for ${id}:`, err);
      }
    });
  }

  function attachMessageHandler(id: string, client: WhatsAppClient) {
    if (client.listenerCount("message") > 0) return;

    client.on("message", async (msg) => {
      try {
        const responses = await processMessage({
          businessId: id,
          customerPhone: msg.from,
          customerName: msg.pushName,
          messageBody: msg.body,
        });

        for (const resp of responses) {
          if (resp.imageUrl) {
            await client.sendImage(msg.from, resp.imageUrl, resp.text);
          } else {
            await client.sendText(msg.from, resp.text);
          }
          await new Promise((r) => setTimeout(r, 800));
        }
      } catch (err) {
        console.error(`[whatsapp] Failed to process inbound message for business ${id}:`, err);
      }
    });
  }

  app.post("/businesses/:id/whatsapp/connect", async (req, reply) => {
    if (!isWhatsAppRuntime()) return waUnavailable(reply);

    const { id } = req.params as { id: string };
    const force = (req.query as { force?: string }).force === "1";
    const business = await getBusiness(id, req.tenantId);
    if (!business) return reply.status(404).send({ error: "Negócio não encontrado" });

    const prev = waManager.get(id);
    if (prev && force) {
      try {
        await prev.logout();
      } catch {
        /* sessão anterior pode já estar inválida */
      }
      waManager.remove(id);
    }

    const client = waManager.getOrCreate(id, sessionsRoot);
    attachLifecycle(id, client);
    attachMessageHandler(id, client);

    if (client.isConnected()) {
      await setBusinessConnected(id, true);
      return reply.send({ status: "already_connected" });
    }

    if (client.lastQrDataUrl && !force) {
      return reply.send({ status: "qr", qr: client.lastQrDataUrl });
    }

    try {
      void client.connect().catch((err) => {
        req.log.error({ err }, "whatsapp background connect failed");
      });
      const result = await waitForQr(client, 12_000);
      return reply.send(result);
    } catch (err) {
      req.log.error({ err }, "whatsapp connect failed");
      return reply.status(500).send({
        status: "error",
        message: err instanceof Error ? err.message : "Falha ao gerar QR Code",
      });
    }
  });

  app.get("/businesses/:id/whatsapp/status", async (req, reply) => {
    if (!isWhatsAppRuntime()) {
      return { connected: false, status: "unavailable", message: "API sem suporte a WhatsApp" };
    }

    const { id } = req.params as { id: string };
    const business = await getBusiness(id, req.tenantId);
    if (!business) return reply.status(404).send({ error: "Negócio não encontrado" });

    const client = waManager.get(id);
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

  app.post("/businesses/:id/whatsapp/disconnect", async (req, reply) => {
    if (!isWhatsAppRuntime()) return waUnavailable(reply);

    const { id } = req.params as { id: string };
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

  app.post("/businesses/:id/whatsapp/send", async (req, reply) => {
    if (!isWhatsAppRuntime()) return waUnavailable(reply);

    const { id } = req.params as { id: string };
    const { to, text } = req.body as { to: string; text: string };
    const business = await getBusiness(id, req.tenantId);
    if (!business) return reply.status(404).send({ error: "Negócio não encontrado" });

    const client = waManager.get(id);
    if (!client?.isConnected()) return reply.status(400).send({ error: "WhatsApp not connected" });

    const msgId = await client.sendText(to, text);
    return { messageId: msgId };
  });
}
