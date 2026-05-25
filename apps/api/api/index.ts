/**
 * Handler Vercel Serverless para a API Fastify.
 *
 * ATENÇÃO: Em ambiente serverless, conexões persistentes (WhatsApp Baileys,
 * BullMQ workers) NÃO funcionam. Use apenas para:
 *   - Auth (login/register)
 *   - CRUD de negócios, catálogo, FAQ
 *   - Leitura de conversas e agendamentos
 *   - Analytics
 *
 * Para funcionalidades que precisam de conexão persistente (WhatsApp, workers),
 * hospede a API em Railway, Render ou Fly.io com ENABLE_WORKERS=true.
 */

import type { IncomingMessage, ServerResponse } from "http";
import { buildApp } from "../src/app";

// Cache da instância Fastify entre invocações (warm lambda)
let appInstance: Awaited<ReturnType<typeof buildApp>> | null = null;

async function getApp() {
  if (!appInstance) {
    appInstance = await buildApp();
    await appInstance.ready();
  }
  return appInstance;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    app.server.emit("request", req, res);
  } catch (err) {
    console.error("[vercel-handler] Error:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}
