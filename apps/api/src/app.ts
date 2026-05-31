import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import fastifyRawBody from "fastify-raw-body";
import { authRoutes } from "./routes/auth";
import { webhookRoutes } from "./routes/webhooks";
import { privacyRoutes } from "./routes/privacy";
import { whatsappRoutes } from "./routes/whatsapp";
import { runPrivacyRetentionForAllTenants } from "./services/privacy-compliance";
import { billingRoutes } from "./routes/billing";
import { hasAdminCredential } from "@flowdesk/firebase";

export async function buildApp(): Promise<FastifyInstance> {
  const logLevel = process.env.LOG_LEVEL?.trim();
  const app = Fastify({
    logger: logLevel ? { level: logLevel } : true,
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
  await app.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
    routes: ["/webhooks/stripe"],
  });

  app.get("/health", () => ({ ok: true, ts: new Date().toISOString() }));
  app.get("/health/admin", () => ({
    ok: hasAdminCredential(),
    adminConfigured: hasAdminCredential(),
    projectId: process.env.FIREBASE_PROJECT_ID ?? null,
  }));
  app.get("/health/payments", () => ({
    asaasConfigured: Boolean(
      process.env.ASAAS_API_KEY?.trim() && process.env.ASAAS_BASE_URL?.trim()
    ),
  }));

  await app.register(authRoutes);
  await app.register(billingRoutes);
  const { asaasIntegrationRoutes } = await import("./routes/asaas-integration.js");
  await app.register(asaasIntegrationRoutes);
  await app.register(privacyRoutes);
  await app.register(webhookRoutes);
  await app.register(whatsappRoutes);

  const retentionRaw = process.env.PRIVACY_RETENTION_INTERVAL_HOURS?.trim();
  const retentionIntervalHours = retentionRaw ? Number(retentionRaw) : 0;
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
