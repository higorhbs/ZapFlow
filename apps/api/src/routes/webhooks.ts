import { FastifyInstance } from "fastify";
import Stripe from "stripe";
import {
  getTenant,
  getTenantByStripeCustomerId,
  getBusinessAsaasIntegration,
  getPaymentsByAsaasId,
  updatePaymentsByAsaasId,
  updateTenant,
} from "@zapflow/firebase";
import { optionalEnv } from "../env";
import { notifyPaymentReceived } from "../services/payment-notify";

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
    const header = req.headers["asaas-access-token"];
    const globalToken = optionalEnv("ASAAS_WEBHOOK_TOKEN");

    if (payment?.id) {
      const linked = await getPaymentsByAsaasId(payment.id);
      const businessId = linked[0]?.businessId;
      if (businessId) {
        const integration = await getBusinessAsaasIntegration(businessId);
        if (integration?.webhookToken) {
          if (header !== integration.webhookToken) {
            return reply.status(401).send({ error: "Token do webhook inválido para este negócio" });
          }
        } else if (globalToken && header !== globalToken) {
          return reply.status(401).send({ error: "Token do webhook Asaas inválido" });
        }
      } else if (globalToken && header !== globalToken) {
        return reply.status(401).send({ error: "Token do webhook Asaas inválido" });
      }
    } else if (globalToken && header !== globalToken) {
      return reply.status(401).send({ error: "Token do webhook Asaas inválido" });
    }

    if (!payment?.id) {
      return reply.status(200).send({ received: true });
    }

    if (eventType === "PAYMENT_RECEIVED" || eventType === "PAYMENT_CONFIRMED") {
      const before = await getPaymentsByAsaasId(payment.id);
      const paidAt = new Date().toISOString();
      await updatePaymentsByAsaasId(payment.id, { status: "PAID", paidAt });
      for (const p of before) {
        if (p.status !== "PAID") {
          await notifyPaymentReceived({ ...p, status: "PAID", paidAt });
        }
      }
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
      let tenant = customerId ? await getTenantByStripeCustomerId(customerId) : null;
      if (!tenant && session.metadata?.tenantId) {
        tenant = await getTenant(String(session.metadata.tenantId));
      }
      if (tenant) {
        await updateTenant(tenant.id, {
          stripeCustomerId: customerId ?? tenant.stripeCustomerId,
          stripeSubscriptionId: subscriptionId ?? undefined,
          plan: (plan as any) ?? tenant.plan,
          planStatus: "ACTIVE",
        });
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
      let planStatus = statusMap[sub.status] ?? "ACTIVE";
      if (customerId) {
        const tenant = await getTenantByStripeCustomerId(customerId);
        if (tenant) {
          const resolvedPlan = (plan as any) ?? tenant.plan;
          if (resolvedPlan !== "STARTER" && planStatus === "TRIALING") planStatus = "ACTIVE";
          await updateTenant(tenant.id, {
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            plan: resolvedPlan,
            planStatus,
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
