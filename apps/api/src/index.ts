// Ponto de entrada para servidor persistente (desenvolvimento e produção em VPS/Railway/Render)
import { buildApp } from "./app";
import { startReminderWorker, startMessageWorker } from "./workers/message-worker";
import { waManager } from "./app";

async function bootstrap() {
  const app = await buildApp();

  // Workers só no processo persistente
  startMessageWorker(waManager);
  startReminderWorker(waManager);

  const port = parseInt(process.env.API_PORT ?? "3001");
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`🚀 ZapFlow API running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
