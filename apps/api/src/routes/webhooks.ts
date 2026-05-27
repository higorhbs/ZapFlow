import { FastifyInstance } from "fastify";
import { updatePaymentsByAsaasId } from "@zapflow/firebase";

export async function webhookRoutes(app: FastifyInstance) {
  app.post("/webhooks/asaas", async (req, reply) => {
    const event = req.body as { event?: string; payment?: { id?: string } };
    const { event: eventType, payment } = event;

    if (!payment?.id) {
      return reply.status(200).send({ received: true });
    }

    if (eventType === "PAYMENT_RECEIVED" || eventType === "PAYMENT_CONFIRMED") {
      await updatePaymentsByAsaasId(payment.id, { status: "PAID", paidAt: new Date().toISOString() });
    }

    if (eventType === "PAYMENT_OVERDUE") {
      await updatePaymentsByAsaasId(payment.id, { status: "OVERDUE" });
    }

    return { received: true };
  });
}
