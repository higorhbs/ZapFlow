import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { loadMonorepoEnv } from "./load-env";
import { buildApp } from "./app";

loadMonorepoEnv();

if (!process.env.ENABLE_WORKERS) process.env.ENABLE_WORKERS = "false";

setGlobalOptions({
  region: "southamerica-east1",
  maxInstances: 10,
});

let appPromise: ReturnType<typeof buildApp> | null = null;

async function getApp() {
  if (!appPromise) appPromise = buildApp();
  const app = await appPromise;
  await app.ready();
  return app;
}

export const api = onRequest(async (req, res) => {
  const app = await getApp();
  const originalUrl = req.url || "/";
  req.url = originalUrl.replace(/^\/api(?=\/|$)/, "") || "/";
  app.server.emit("request", req, res);
});
