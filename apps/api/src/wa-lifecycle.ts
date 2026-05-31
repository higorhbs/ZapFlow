import fs from "fs";
import path from "path";
import { setBusinessConnected } from "@flowdesk/firebase";
import type { WhatsAppClient, WhatsAppManager } from "@flowdesk/whatsapp-client";

const lifecycleAttached = new WeakSet<WhatsAppClient>();

export function hasStoredSession(sessionsRoot: string, businessId: string) {
  return fs.existsSync(path.join(sessionsRoot, businessId, "creds.json"));
}

export function listStoredSessionBusinessIds(sessionsRoot: string) {
  if (!fs.existsSync(sessionsRoot)) return [];
  return fs
    .readdirSync(sessionsRoot, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && hasStoredSession(sessionsRoot, dirent.name))
    .map((dirent) => dirent.name);
}

export function attachWhatsAppLifecycle(businessId: string, client: WhatsAppClient) {
  if (lifecycleAttached.has(client)) return;
  lifecycleAttached.add(client);

  client.on("connected", async () => {
    try {
      await setBusinessConnected(businessId, true);
    } catch (err) {
      console.error(`[whatsapp] failed to mark connected for ${businessId}:`, err);
    }
  });

  client.on("disconnected", async () => {
    try {
      await setBusinessConnected(businessId, false);
    } catch (err) {
      console.error(`[whatsapp] failed to mark disconnected for ${businessId}:`, err);
    }
  });
}

export function ensureWhatsAppClient(
  waManager: WhatsAppManager,
  sessionsRoot: string,
  businessId: string
) {
  const client = waManager.getOrCreate(businessId, sessionsRoot);
  attachWhatsAppLifecycle(businessId, client);
  return client;
}

export async function restoreWhatsAppSessions(waManager: WhatsAppManager, sessionsRoot: string) {
  const businessIds = listStoredSessionBusinessIds(sessionsRoot);
  if (businessIds.length === 0) return;

  console.log(`[whatsapp] Restoring ${businessIds.length} stored session(s)...`);
  for (const businessId of businessIds) {
    const client = ensureWhatsAppClient(waManager, sessionsRoot, businessId);
    if (client.isConnected()) continue;
    void client.connect().catch((err: unknown) => {
      console.error(`[whatsapp] restore connect failed for ${businessId}:`, err);
    });
  }
}