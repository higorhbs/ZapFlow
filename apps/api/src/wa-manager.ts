import { WhatsAppManager } from "@flowdesk/whatsapp-client";

export const waManager = new WhatsAppManager();

export function isWhatsAppRuntime() {
  return process.env.ENABLE_WORKERS === "true";
}