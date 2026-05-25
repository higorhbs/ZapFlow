import { FastifyInstance } from "fastify";
import { prisma } from "@zapflow/database";

export async function webhookRoutes(app: FastifyInstance) {
  // Webhook da Asaas para atualizar status de pagamentos
  app.post("/webhooks/asaas", async (req, reply) => {
    const event = req.body as any;
    const { event: eventType, payment } = event;

    if (!payment?.externalReference) {
      return reply.status(200).send({ received: true });
    }

    if (eventType === "PAYMENT_RECEIVED" || eventType === "PAYMENT_CONFIRMED") {
      await prisma.payment.updateMany({
        where: { asaasId: payment.id },
        data: { status: "PAID", paidAt: new Date() },
      });
    }

    if (eventType === "PAYMENT_OVERDUE") {
      await prisma.payment.updateMany({
        where: { asaasId: payment.id },
        data: { status: "OVERDUE" },
      });
    }

    return { received: true };
  });
}
