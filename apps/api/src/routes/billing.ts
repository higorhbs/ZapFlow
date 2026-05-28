import { FastifyInstance } from "fastify";
import { z } from "zod";
import Stripe from "stripe";
import { PLAN_PRICES } from "@zapflow/shared";
import { getTenant, updateTenant } from "@zapflow/firebase";
import { requireAuth } from "../middleware/auth";

const planSchema = z.object({
  plan: z.enum(["STARTER", "PRO", "UNLIMITED"]),
});

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
  return new Stripe(key);
}

function planPriceId(plan: "STARTER" | "PRO" | "UNLIMITED"): string {
  const map = {
    STARTER: process.env.STRIPE_PRICE_STARTER,
    PRO: process.env.STRIPE_PRICE_PRO,
    UNLIMITED: process.env.STRIPE_PRICE_UNLIMITED,
  } as const;
  const price = map[plan];
  if (!price) throw new Error(`Preço Stripe não configurado para plano ${plan}`);
  return price;
}

export async function billingRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/billing/checkout", async (req, reply) => {
    const { plan } = planSchema.parse(req.body ?? {});
    const tenant = await getTenant(req.tenantId);
    if (!tenant) return reply.status(404).send({ error: "Conta não encontrada" });

    const stripe = getStripe();
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.email,
        name: tenant.name,
        metadata: { tenantId: tenant.id },
      });
      customerId = customer.id;
      await updateTenant(tenant.id, { stripeCustomerId: customerId });
    }

    const origin = req.headers.origin || process.env.CORS_ORIGIN?.split(",")[0] || "http://localhost:3000";
    const priceId = planPriceId(plan);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/plan?checkout=success`,
      cancel_url: `${origin}/plan?checkout=cancel`,
      allow_promotion_codes: true,
      metadata: { tenantId: tenant.id, plan, planPriceId: priceId },
    });

    return { url: session.url };
  });

  app.post("/billing/portal", async (req, reply) => {
    const tenant = await getTenant(req.tenantId);
    if (!tenant?.stripeCustomerId) {
      return reply.status(400).send({ error: "Nenhum cliente Stripe vinculado." });
    }
    const stripe = getStripe();
    const origin = req.headers.origin || process.env.CORS_ORIGIN?.split(",")[0] || "http://localhost:3000";
    const portal = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${origin}/plan`,
    });
    return { url: portal.url };
  });

  app.get("/billing/prices", async () => {
    return {
      STARTER: { amount: PLAN_PRICES.STARTER.brl, priceId: process.env.STRIPE_PRICE_STARTER ?? null },
      PRO: { amount: PLAN_PRICES.PRO.brl, priceId: process.env.STRIPE_PRICE_PRO ?? null },
      UNLIMITED: { amount: PLAN_PRICES.UNLIMITED.brl, priceId: process.env.STRIPE_PRICE_UNLIMITED ?? null },
    };
  });
}

