import { loadMonorepoEnv } from "./load-env";

loadMonorepoEnv();

import { buildApp } from "./app";

async function bootstrap() {
  const app = await buildApp();
  const port = parseInt(process.env.API_PORT ?? "3001");
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`ZapFlow API running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
