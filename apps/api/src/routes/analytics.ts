import { FastifyInstance } from "fastify";
import { prisma } from "@zapflow/database";
import { requireAuth } from "../middleware/auth";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function analyticsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/businesses/:id/analytics", async (req, reply) => {
    const { id } = req.params as { id: string };
    const business = await prisma.business.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!business) return reply.status(404).send({ error: "Not found" });

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const [
      totalConversations,
      openConversations,
      monthConversations,
      lastMonthConversations,
      totalMessages,
      monthMessages,
      pendingAppointments,
      monthAppointments,
      pendingPayments,
      paidThisMonth,
    ] = await Promise.all([
      prisma.conversation.count({ where: { businessId: id } }),
      prisma.conversation.count({ where: { businessId: id, status: "OPEN" } }),
      prisma.conversation.count({ where: { businessId: id, createdAt: { gte: monthStart, lte: monthEnd } } }),
      prisma.conversation.count({ where: { businessId: id, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      prisma.message.count({ where: { conversation: { businessId: id } } }),
      prisma.message.count({ where: { conversation: { businessId: id }, createdAt: { gte: monthStart } } }),
      prisma.appointment.count({ where: { businessId: id, status: { in: ["PENDING", "CONFIRMED"] } } }),
      prisma.appointment.count({ where: { businessId: id, scheduledAt: { gte: monthStart, lte: monthEnd } } }),
      prisma.payment.count({ where: { businessId: id, status: "PENDING" } }),
      prisma.payment.aggregate({
        where: { businessId: id, status: "PAID", paidAt: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
    ]);

    const conversationGrowth =
      lastMonthConversations > 0
        ? Math.round(((monthConversations - lastMonthConversations) / lastMonthConversations) * 100)
        : 100;

    return {
      conversations: {
        total: totalConversations,
        open: openConversations,
        thisMonth: monthConversations,
        growth: conversationGrowth,
      },
      messages: {
        total: totalMessages,
        thisMonth: monthMessages,
      },
      appointments: {
        pending: pendingAppointments,
        thisMonth: monthAppointments,
      },
      payments: {
        pending: pendingPayments,
        revenueThisMonth: Number(paidThisMonth._sum.amount ?? 0),
      },
    };
  });
}
