import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import formbody from "@fastify/formbody";
import { WhatsAppManager } from "@zapflow/whatsapp-client";
import { authRoutes } from "./routes/auth";
import { businessRoutes } from "./routes/business";
import { whatsappRoutes } from "./routes/whatsapp";
import { conversationRoutes } from "./routes/conversations";
import { appointmentRoutes } from "./routes/appointments";
import { analyticsRoutes } from "./routes/analytics";
import { webhookRoutes } from "./routes/webhooks";
import { startReminderWorker } from "./workers/message-worker";

const app = Fastify({ logger: { level: "info" } });

const waManager = new WhatsAppManager();

async function bootstrap() {
  await app.register(cors, { origin: true });
  await app.register(formbody);
  await app.register(jwt, { secret: process.env.API_SECRET ?? "dev-secret-change-me" });

  // Health check
  app.get("/health", () => ({ ok: true, ts: new Date().toISOString() }));

  // Routes
  await app.register(authRoutes);
  await app.register(businessRoutes);
  await app.register(whatsappRoutes(waManager));
  await app.register(conversationRoutes);
  await app.register(appointmentRoutes);
  await app.register(analyticsRoutes);
  await app.register(webhookRoutes);

  // Workers
  startReminderWorker(waManager);

  const port = parseInt(process.env.API_PORT ?? "3001");
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`🚀 ZapFlow API running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
