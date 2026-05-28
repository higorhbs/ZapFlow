import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import { authRoutes } from "./routes/auth";
import { businessRoutes } from "./routes/business";
import { conversationRoutes } from "./routes/conversations";
import { appointmentRoutes } from "./routes/appointments";
import { analyticsRoutes } from "./routes/analytics";
import { webhookRoutes } from "./routes/webhooks";
import { privacyRoutes } from "./routes/privacy";
import { runPrivacyRetentionForAllTenants } from "./services/privacy-compliance";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });

  const corsOrigin = process.env.CORS_ORIGIN;
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsOrigin === "*" || corsOrigin === origin) return cb(null, true);
      if (
        !corsOrigin &&
        (/^https?:\/\/localhost(:\d+)?$/.test(origin) ||
          /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
          /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
          /^https:\/\/[a-z0-9-]+\.(web\.app|firebaseapp\.com)$/.test(origin))
      ) {
        return cb(null, true);
      }
      if (corsOrigin?.split(",").map((o) => o.trim()).includes(origin)) return cb(null, true);
      cb(new Error("CORS"), false);
    },
    credentials: true,
  });
  await app.register(formbody);

  app.get("/health", () => ({ ok: true, ts: new Date().toISOString() }));

  await app.register(authRoutes);
  await app.register(businessRoutes);
  await app.register(conversationRoutes);
  await app.register(appointmentRoutes);
  await app.register(analyticsRoutes);
  await app.register(privacyRoutes);
  await app.register(webhookRoutes);

  const { whatsappRoutes } = await import("./routes/whatsapp.js");
  await app.register(whatsappRoutes);

  if (process.env.ENABLE_WORKERS === "true") {
    const { waManager } = await import("./wa-manager.js");
    const { startReminderWorker, startMessageWorker } = await import(
      "./workers/message-worker.js"
    );
    startMessageWorker(waManager);
    startReminderWorker(waManager);
  }

  const retentionIntervalHours = Number(process.env.PRIVACY_RETENTION_INTERVAL_HOURS ?? 24);
  if (retentionIntervalHours > 0) {
    const run = async () => {
      try {
        const result = await runPrivacyRetentionForAllTenants(365);
        app.log.info({ result }, "privacy retention run completed");
      } catch (err) {
        app.log.error({ err }, "privacy retention run failed");
      }
    };
    setTimeout(run, 10_000);
    setInterval(run, retentionIntervalHours * 60 * 60 * 1000);
  }

  return app;
}
