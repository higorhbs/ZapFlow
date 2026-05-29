import { Worker, Queue, type ConnectionOptions } from "bullmq";
import { processMessage, BotContext } from "../services/bot";
import { requireEnv } from "../env";
import { WhatsAppManager } from "@zapflow/whatsapp-client";

export interface MessageJob {
  businessId: string;
  customerPhone: string;
  customerName?: string;
  messageBody: string;
}

export interface ReminderJob {
  appointmentId: string;
  businessId: string;
  customerPhone: string;
  message: string;
}

let messageQueue: Queue | null = null;
let reminderQueue: Queue | null = null;
let connection: ConnectionOptions | null = null;

export function getRedisConnection(): ConnectionOptions {
  if (!connection) {
    connection = {
      url: requireEnv("REDIS_URL"),
      maxRetriesPerRequest: null,
    };
  }
  return connection;
}

export function getMessageQueue(): Queue {
  if (!messageQueue) {
    messageQueue = new Queue("messages", { connection: getRedisConnection() });
  }
  return messageQueue;
}

export function getReminderQueue(): Queue {
  if (!reminderQueue) {
    reminderQueue = new Queue("reminders", { connection: getRedisConnection() });
  }
  return reminderQueue;
}

export function startMessageWorker(waManager: WhatsAppManager) {
  const worker = new Worker<MessageJob>(
    "messages",
    async (job) => {
      const { businessId, customerPhone, customerName, messageBody } = job.data;

      const ctx: BotContext = { businessId, customerPhone, customerName, messageBody };
      const responses = await processMessage(ctx);

      const client = waManager.get(businessId);
      if (!client || !client.isConnected()) {
        console.warn(`[worker] WhatsApp not connected for business ${businessId}`);
        return;
      }

      for (const resp of responses) {
        if (resp.imageUrl) {
          await client.sendImage(customerPhone, resp.imageUrl, resp.text);
        } else {
          await client.sendText(customerPhone, resp.text);
        }
        await new Promise((r) => setTimeout(r, 800));
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

export function startReminderWorker(waManager: WhatsAppManager) {
  const worker = new Worker<ReminderJob>(
    "reminders",
    async (job) => {
      const { businessId, customerPhone, message } = job.data;
      const client = waManager.get(businessId);
      if (!client || !client.isConnected()) return;
      await client.sendText(customerPhone, message);
    },
    { connection: getRedisConnection() }
  );

  return worker;
}
