import { FastifyInstance } from "fastify";
import {
  getBusiness,
  listConversations,
  getConversation,
  updateConversationStatus,
  type ConversationStatus,
} from "@zapflow/firebase";
import { requireAuth } from "../middleware/auth";

export async function conversationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/businesses/:id/conversations", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, page = "1", limit = "20" } = req.query as Record<string, string>;
    if (!(await getBusiness(id, req.tenantId))) return reply.status(404).send({ error: "Not found" });
    const result = await listConversations(id, {
      status: status as ConversationStatus | undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    return { ...result, page: parseInt(page), limit: parseInt(limit) };
  });

  app.get("/businesses/:businessId/conversations/:conversationId", async (req, reply) => {
    const { businessId, conversationId } = req.params as { businessId: string; conversationId: string };
    if (!(await getBusiness(businessId, req.tenantId))) return reply.status(404).send({ error: "Not found" });
    const conv = await getConversation(businessId, conversationId);
    if (!conv) return reply.status(404).send({ error: "Not found" });
    return conv;
  });

  app.patch("/businesses/:businessId/conversations/:conversationId/attend", async (req) => {
    const { businessId, conversationId } = req.params as { businessId: string; conversationId: string };
    return updateConversationStatus(businessId, conversationId, "ATTENDING");
  });

  app.patch("/businesses/:businessId/conversations/:conversationId/release", async (req) => {
    const { businessId, conversationId } = req.params as { businessId: string; conversationId: string };
    return updateConversationStatus(businessId, conversationId, "OPEN");
  });

  app.patch("/businesses/:businessId/conversations/:conversationId/close", async (req) => {
    const { businessId, conversationId } = req.params as { businessId: string; conversationId: string };
    return updateConversationStatus(businessId, conversationId, "CLOSED");
  });
}
