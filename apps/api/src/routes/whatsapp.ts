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

function waUnavailable(reply: FastifyReply) {
  return reply.status(503).send({
    status: "error",
    message:
      "WhatsApp precisa da API local (npm run dev, porta 3001). A Vercel não mantém sessão do WhatsApp.",
  });
}

function waitForQrOrConnected(client: WhatsAppClient, businessId: string): Promise<ConnectResult> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve({ status: "timeout", message: "QR expirou. Clique em Gerar QR Code novamente." });
    }, 90_000);

    const onQr = (qrDataUrl: string) => {
      cleanup();
      resolve({ status: "qr", qr: qrDataUrl });
    };

    const onConnected = async () => {
      cleanup();
      await setBusinessConnected(businessId, true);
      resolve({ status: "connected" });
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    function cleanup() {
      clearTimeout(timer);
      client.off("qr", onQr);
      client.off("connected", onConnected);
    }

    client.once("qr", onQr);
    client.once("connected", onConnected);
    client.connect().catch(onError);
  });
}

export async function whatsappRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  const sessionsRoot = process.env.WA_SESSION_PATH ?? "./sessions";

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
    const business = await getBusiness(id, req.tenantId);
    if (!business) return reply.status(404).send({ error: "Negócio não encontrado" });

    const prev = waManager.get(id);
    if (prev) {
      try {
        await prev.logout();
      } catch {
        /* sessão anterior pode já estar inválida */
      }
      waManager.remove(id);
    }

    const client = waManager.getOrCreate(id, sessionsRoot);
    attachMessageHandler(id, client);

    if (client.isConnected()) {
      return reply.send({ status: "already_connected" });
    }

    try {
      const result = await waitForQrOrConnected(client, id);
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
    return {
      connected: client?.isConnected() ?? false,
      status: client?.status ?? "disconnected",
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
