import { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { getTenantByStripeCustomerId, updatePaymentsByAsaasId, updateTenant } from "@zapflow/firebase";

function planFromPriceId(priceId: string | null | undefined): "STARTER" | "PRO" | "UNLIMITED" | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "STARTER";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "PRO";
  if (priceId === process.env.STRIPE_PRICE_UNLIMITED) return "UNLIMITED";
  return null;
}

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

  app.post("/webhooks/stripe", { config: { rawBody: true } }, async (req, reply) => {
    const key = process.env.STRIPE_SECRET_KEY;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!key || !secret) return reply.status(400).send({ error: "Stripe não configurado" });

    const stripe = new Stripe(key);
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      return reply.status(400).send({ error: "Assinatura Stripe ausente" });
    }

    let event: any;
    try {
      const raw = (req as any).rawBody as string | Buffer | undefined;
      if (!raw) return reply.status(400).send({ error: "Raw body ausente para webhook Stripe" });
      event = stripe.webhooks.constructEvent(raw, signature, secret);
    } catch (err) {
      req.log.error({ err }, "stripe webhook signature validation failed");
      return reply.status(400).send({ error: "Assinatura Stripe inválida" });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const plan = planFromPriceId(session.metadata?.planPriceId) || (session.metadata?.plan as any) || null;
      if (customerId) {
        const tenant = await getTenantByStripeCustomerId(customerId);
        if (tenant) {
          await updateTenant(tenant.id, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId ?? undefined,
            plan: (plan as any) ?? tenant.plan,
            planStatus: "ACTIVE",
          });
        }
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const sub = event.data.object as any;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      const priceId = sub.items.data[0]?.price?.id;
      const plan = planFromPriceId(priceId);
      const statusMap: Record<string, "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED"> = {
        active: "ACTIVE",
        trialing: "TRIALING",
        past_due: "PAST_DUE",
        canceled: "CANCELED",
        unpaid: "PAST_DUE",
      };
      if (customerId) {
        const tenant = await getTenantByStripeCustomerId(customerId);
        if (tenant) {
          await updateTenant(tenant.id, {
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            plan: (plan as any) ?? tenant.plan,
            planStatus: statusMap[sub.status] ?? "ACTIVE",
          });
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as any;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (customerId) {
        const tenant = await getTenantByStripeCustomerId(customerId);
        if (tenant) {
          await updateTenant(tenant.id, {
            planStatus: "CANCELED",
            stripeSubscriptionId: undefined,
          });
        }
      }
    }

    return { received: true };
  });
}
