import { FastifyInstance } from "fastify";
import { prisma } from "@zapflow/database";
import { requireAuth } from "../middleware/auth";
import { WhatsAppManager } from "@zapflow/whatsapp-client";
import { processMessage } from "../services/bot";

export function whatsappRoutes(waManager: WhatsAppManager) {
  return async function (app: FastifyInstance) {
    app.addHook("preHandler", requireAuth);

    const sessionsRoot = process.env.WA_SESSION_PATH ?? "./sessions";

    function attachMessageHandler(id: string, client: any) {
      if (client.listenerCount("message") > 0) return;

      client.on("message", async (msg: any) => {
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

    // Conecta / gera QR
    app.post("/businesses/:id/whatsapp/connect", async (req, reply) => {
      const { id } = req.params as { id: string };
      const business = await prisma.business.findFirst({ where: { id, tenantId: req.tenantId } });
      if (!business) return reply.status(404).send({ error: "Not found" });

      const client = waManager.getOrCreate(id, sessionsRoot);
      attachMessageHandler(id, client);

      return new Promise((resolve) => {
        if (client.isConnected()) {
          return resolve({ status: "already_connected" });
        }

        const timeout = setTimeout(() => resolve({ status: "timeout", message: "QR not scanned in time" }), 60000);

        client.once("qr", (qrDataUrl: string) => {
          clearTimeout(timeout);
          resolve({ status: "qr", qr: qrDataUrl });
        });

        client.once("connected", async () => {
          clearTimeout(timeout);
          await prisma.business.update({ where: { id }, data: { isConnected: true } });

          resolve({ status: "connected" });
        });

        client.connect().catch((err: Error) => {
          clearTimeout(timeout);
          resolve({ status: "error", message: err.message });
        });
      });
    });

    // Status da conexão
    app.get("/businesses/:id/whatsapp/status", async (req, reply) => {
      const { id } = req.params as { id: string };
      const business = await prisma.business.findFirst({ where: { id, tenantId: req.tenantId } });
      if (!business) return reply.status(404).send({ error: "Not found" });

      const client = waManager.get(id);
      return {
        connected: client?.isConnected() ?? false,
        status: client?.status ?? "disconnected",
      };
    });

    // Desconecta
    app.post("/businesses/:id/whatsapp/disconnect", async (req, reply) => {
      const { id } = req.params as { id: string };
      const business = await prisma.business.findFirst({ where: { id, tenantId: req.tenantId } });
      if (!business) return reply.status(404).send({ error: "Not found" });

      const client = waManager.get(id);
      if (client) {
        await client.logout();
        waManager.remove(id);
        await prisma.business.update({ where: { id }, data: { isConnected: false } });
      }
      return { status: "disconnected" };
    });

    // Envia mensagem manual
    app.post("/businesses/:id/whatsapp/send", async (req, reply) => {
      const { id } = req.params as { id: string };
      const { to, text } = req.body as { to: string; text: string };
      const business = await prisma.business.findFirst({ where: { id, tenantId: req.tenantId } });
      if (!business) return reply.status(404).send({ error: "Not found" });

      const client = waManager.get(id);
      if (!client?.isConnected()) return reply.status(400).send({ error: "WhatsApp not connected" });

      const msgId = await client.sendText(to, text);
      return { messageId: msgId };
    });
  };
}
