/**
 * Cria e configura a instância Fastify sem fazer listen().
 * Exportada para ser usada tanto no servidor local quanto no handler Vercel.
 */
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

export const waManager = new WhatsAppManager();

export async function buildApp() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });

  await app.register(cors, { origin: process.env.CORS_ORIGIN ?? true });
  await app.register(formbody);
  await app.register(jwt, {
    secret: process.env.API_SECRET ?? "dev-secret-change-me",
  });

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

  // Workers só no servidor persistente (não no serverless)
  if (process.env.ENABLE_WORKERS === "true") {
    startReminderWorker(waManager);
  }

  return app;
}
