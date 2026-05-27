import { WhatsAppManager } from "@zapflow/whatsapp-client";

export const waManager = new WhatsAppManager();

export function isWhatsAppRuntime(): boolean {
  return process.env.ENABLE_WORKERS === "true" && process.env.VERCEL !== "1";
}
