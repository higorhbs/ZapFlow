import { FastifyInstance } from "fastify";
import { prisma, ConversationStatus } from "@zapflow/database";
import { requireAuth } from "../middleware/auth";

export async function conversationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/businesses/:id/conversations", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, page = "1", limit = "20" } = req.query as Record<string, string>;

    const business = await prisma.business.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!business) return reply.status(404).send({ error: "Not found" });

    const where = { businessId: id, ...(status ? { status: status as ConversationStatus } : {}) };
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    return { conversations, total, page: parseInt(page), limit: parseInt(limit) };
  });

  app.get("/businesses/:businessId/conversations/:conversationId", async (req, reply) => {
    const { businessId, conversationId } = req.params as { businessId: string; conversationId: string };
    const business = await prisma.business.findFirst({ where: { id: businessId, tenantId: req.tenantId } });
    if (!business) return reply.status(404).send({ error: "Not found" });

    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        appointments: true,
        payments: true,
      },
    });
  });

  // Assume atendimento humano
  app.patch("/businesses/:businessId/conversations/:conversationId/attend", async (req) => {
    const { conversationId } = req.params as { businessId: string; conversationId: string };
    return prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.ATTENDING },
    });
  });

  // Devolve para o bot
  app.patch("/businesses/:businessId/conversations/:conversationId/release", async (req) => {
    const { conversationId } = req.params as { businessId: string; conversationId: string };
    return prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.OPEN },
    });
  });

  // Fecha conversa
  app.patch("/businesses/:businessId/conversations/:conversationId/close", async (req) => {
    const { conversationId } = req.params as { businessId: string; conversationId: string };
    return prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.CLOSED },
    });
  });
}
