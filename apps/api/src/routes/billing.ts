import { FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import Stripe from "stripe";
import { PLAN_PRICES } from "@zapflow/shared";
import { createTenant, getAdminAuth, getDb, getTenant, updateTenant } from "@zapflow/firebase";
import type { Tenant } from "@zapflow/firebase";
import { requireAuth } from "../middleware/auth";

const planSchema = z.object({
  plan: z.enum(["STARTER", "PRO", "UNLIMITED"]),
});

const cancelSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  lgpdConsent: z.boolean(),
});

const DAY_MS = 24 * 60 * 60 * 1000;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada no servidor.");
  return new Stripe(key);
}

function resolveBillingOrigin(req: FastifyRequest): string {
  const origin = req.headers.origin?.trim();
  if (origin) return origin;

  const referer = req.headers.referer?.trim();
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      /* ignore */
    }
  }

  const fromCors = process.env.CORS_ORIGIN?.split(",")
    .map((o) => o.trim())
    .find(Boolean);
  if (fromCors) return fromCors;

  const webOrigin = process.env.WEB_ORIGIN?.trim();
  if (webOrigin) return webOrigin;

  throw new Error("URL do app não detectada. Configure CORS_ORIGIN na API.");
}

async function ensureBillingTenant(req: FastifyRequest): Promise<Tenant> {
  const existing = await getTenant(req.tenantId);
  if (existing) return existing;

  let email = req.tenantEmail?.trim();
  if (!email) {
    const user = await getAdminAuth().getUser(req.tenantId);
    email = user.email?.trim();
  }
  if (!email) {
    throw new Error("E-mail da conta não encontrado. Atualize o perfil e tente novamente.");
  }

  return createTenant(req.tenantId, {
    name: email.split("@")[0] ?? "Usuário",
    email,
  });
}

function sendBillingError(req: FastifyRequest, reply: FastifyReply, err: unknown) {
  if (err instanceof z.ZodError) {
    return reply.status(400).send({ error: "Plano inválido." });
  }

  const stripeErr = err as { type?: string; message?: string };
  if (stripeErr?.type?.startsWith("Stripe")) {
    req.log.warn({ err: stripeErr }, "stripe checkout failed");
    return reply.status(502).send({
      error: stripeErr.message || "Stripe recusou a operação. Verifique os preços configurados.",
    });
  }

  const message = err instanceof Error ? err.message : "Erro ao iniciar checkout.";
  if (/STRIPE_|Preço Stripe|Stripe não/i.test(message)) {
    return reply.status(503).send({ error: message });
  }
  if (/Origin|CORS_ORIGIN|URL do app/i.test(message)) {
    return reply.status(400).send({ error: message });
  }
  if (/E-mail da conta/i.test(message)) {
    return reply.status(400).send({ error: message });
  }
  if (/LGPD|consentimento/i.test(message)) {
    return reply.status(400).send({ error: message });
  }

  req.log.error({ err }, "billing route failed");
  return reply.status(500).send({ error: message });
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

function planFromPriceId(priceId: string | null | undefined): Tenant["plan"] | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "STARTER";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "PRO";
  if (priceId === process.env.STRIPE_PRICE_UNLIMITED) return "UNLIMITED";
  return null;
}

const ACTIVE_SUB_STATUSES = ["active", "trialing", "past_due", "unpaid"] as const;
const SUBSCRIPTION_EXPAND = ["latest_invoice.payment_intent.latest_charge"] as const;

type StripeSubWithInvoice = any;

function normalizeReason(raw: string | undefined): string | undefined {
  const reason = raw?.trim();
  return reason ? reason.slice(0, 500) : undefined;
}

function anonymizeIp(raw: string | undefined): string {
  const ip = raw?.trim();
  if (!ip) return "unknown";
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  if (ip.includes(":")) {
    const parts = ip.split(":").slice(0, 3);
    return `${parts.join(":")}::`;
  }
  return "masked";
}

function getUsageMetrics(periodStartUnix: number, periodEndUnix: number) {
  const startMs = periodStartUnix * 1000;
  const endMs = periodEndUnix * 1000;
  const totalDays = Math.max(1, Math.ceil((endMs - startMs) / DAY_MS));
  const nowMs = Date.now();
  const rawUsed = nowMs <= startMs ? 0 : Math.ceil((nowMs - startMs) / DAY_MS);
  const usedDays = Math.max(0, Math.min(totalDays, rawUsed));
  const remainingDays = Math.max(0, totalDays - usedDays);
  return { usedDays, totalDays, remainingDays };
}

function getLatestInvoicePaymentInfo(sub: StripeSubWithInvoice): {
  chargeId?: string;
  amountPaidCents: number;
  currency: string;
} {
  const invoice = typeof sub.latest_invoice === "object" ? sub.latest_invoice : null;
  if (!invoice) {
    return { amountPaidCents: 0, currency: "brl" };
  }

  const paymentIntent =
    typeof invoice.payment_intent === "object" ? invoice.payment_intent : null;
  const latestCharge =
    paymentIntent && typeof paymentIntent.latest_charge === "object"
      ? paymentIntent.latest_charge
      : null;

  const amountPaidCents =
    (latestCharge?.amount_captured ?? latestCharge?.amount) ?? invoice.amount_paid ?? 0;

  return {
    chargeId: latestCharge?.id,
    amountPaidCents,
    currency: (invoice.currency ?? "brl").toLowerCase(),
  };
}

function getSubscriptionBillingPeriod(sub: StripeSubWithInvoice): { start: number; end: number } | null {
  const item = sub.items?.data?.[0];
  const start = sub.current_period_start ?? item?.current_period_start;
  const end = sub.current_period_end ?? item?.current_period_end;
  if (typeof start !== "number" || typeof end !== "number") return null;
  return { start, end };
}

async function findActiveSubscriptionForCustomer(
  stripe: ReturnType<typeof getStripe>,
  customerId: string,
  subscriptionId?: string
): Promise<StripeSubWithInvoice | null> {
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: [...SUBSCRIPTION_EXPAND],
      });
      if (ACTIVE_SUB_STATUSES.includes(sub.status as (typeof ACTIVE_SUB_STATUSES)[number])) {
        return sub as StripeSubWithInvoice;
      }
    } catch {
      /* tenta listar pelo customer */
    }
  }

  const list = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
    expand: [...SUBSCRIPTION_EXPAND],
  });
  return (
    (list.data.find((item) =>
      ACTIVE_SUB_STATUSES.includes(item.status as (typeof ACTIVE_SUB_STATUSES)[number])
    ) as StripeSubWithInvoice | undefined) ?? null
  );
}

async function resolveStripeCustomerId(
  stripe: ReturnType<typeof getStripe>,
  tenant: Tenant
): Promise<string | null> {
  if (tenant.stripeCustomerId) return tenant.stripeCustomerId;
  if (!tenant.email) return null;

  const customers = await stripe.customers.list({ email: tenant.email, limit: 20 });
  const byMeta = customers.data.find((c) => c.metadata?.tenantId === tenant.id);
  if (byMeta) return byMeta.id;

  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 5 });
    const active = subs.data.find((s) =>
      ACTIVE_SUB_STATUSES.includes(s.status as (typeof ACTIVE_SUB_STATUSES)[number])
    );
    if (active) return customer.id;
  }

  return customers.data[0]?.id ?? null;
}

async function reconcileTenantBilling(
  stripe: ReturnType<typeof getStripe>,
  tenant: Tenant
): Promise<Tenant> {
  const customerId = await resolveStripeCustomerId(stripe, tenant);
  if (!customerId) return tenant;

  const sub = await findActiveSubscriptionForCustomer(stripe, customerId, tenant.stripeSubscriptionId);
  const priceId = sub?.items?.data?.[0]?.price?.id;
  const plan = planFromPriceId(priceId);

  const patch: Partial<Tenant> = {};
  if (customerId !== tenant.stripeCustomerId) patch.stripeCustomerId = customerId;
  if (sub?.id && sub.id !== tenant.stripeSubscriptionId) patch.stripeSubscriptionId = sub.id;
  if (sub && priceId) patch.stripePriceId = priceId;
  if (sub && plan) patch.plan = plan;

  if (sub) {
    const resolvedPlan = plan ?? tenant.plan;
    const planStatus =
      sub.status === "past_due" || sub.status === "unpaid"
        ? "PAST_DUE"
        : sub.status === "trialing" && resolvedPlan === "STARTER"
          ? "TRIALING"
          : "ACTIVE";
    if (tenant.planStatus !== planStatus) patch.planStatus = planStatus;

    const period = getSubscriptionBillingPeriod(sub);
    if (period) patch.currentPeriodEnd = new Date(period.end * 1000).toISOString();
  }

  if (Object.keys(patch).length === 0) {
    return tenant.stripeCustomerId ? tenant : { ...tenant, stripeCustomerId: customerId };
  }

  const updated = await updateTenant(tenant.id, patch);
  return updated ?? { ...tenant, ...patch };
}

async function resolveSubscription(
  stripe: ReturnType<typeof getStripe>,
  tenant: Tenant
): Promise<StripeSubWithInvoice | null> {
  if (!tenant.stripeCustomerId) return null;
  return findActiveSubscriptionForCustomer(stripe, tenant.stripeCustomerId, tenant.stripeSubscriptionId);
}

export async function billingRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/billing/cancel/preview", async (req, reply) => {
    try {
      const stripe = getStripe();
      const tenant = await reconcileTenantBilling(stripe, await ensureBillingTenant(req));
      if (!tenant.stripeCustomerId) {
        return {
          canCancel: false,
          reason: "Nenhuma assinatura ativa para cancelar. Se você acabou de pagar, aguarde alguns segundos e atualize a página.",
        };
      }

      const sub = await resolveSubscription(stripe, tenant);
      if (!sub) {
        return {
          canCancel: false,
          reason: "Nenhuma assinatura ativa encontrada na Stripe para esta conta.",
        };
      }

      const period = getSubscriptionBillingPeriod(sub);
      if (!period) {
        return {
          canCancel: false,
          reason: "Ciclo de cobrança indisponível para calcular reembolso.",
        };
      }

      const usage = getUsageMetrics(period.start, period.end);
      const payment = getLatestInvoicePaymentInfo(sub);
      const refundableRatio = usage.totalDays > 0 ? usage.remainingDays / usage.totalDays : 0;
      const refundEstimateCents = Math.max(0, Math.floor(payment.amountPaidCents * refundableRatio));

      return {
        canCancel: true,
        subscriptionStatus: sub.status,
        periodStart: new Date(period.start * 1000).toISOString(),
        periodEnd: new Date(period.end * 1000).toISOString(),
        usedDays: usage.usedDays,
        totalCycleDays: usage.totalDays,
        remainingDays: usage.remainingDays,
        refundEstimateCents,
        refundEstimateBrl: Number((refundEstimateCents / 100).toFixed(2)),
        currency: payment.currency.toUpperCase(),
        lgpd: {
          requiresConsent: true,
          legalBasis: "EXECUCAO_CONTRATUAL",
          retentionDays: 365,
        },
      };
    } catch (err) {
      return sendBillingError(req, reply, err);
    }
  });

  app.post("/billing/sync", async (req, reply) => {
    try {
      const stripe = getStripe();
      const tenant = await reconcileTenantBilling(stripe, await ensureBillingTenant(req));
      const sub = tenant.stripeCustomerId
        ? await resolveSubscription(stripe, tenant)
        : null;
      return {
        ok: true,
        plan: tenant.plan,
        planStatus: tenant.planStatus,
        stripeCustomerId: tenant.stripeCustomerId ?? null,
        stripeSubscriptionId: tenant.stripeSubscriptionId ?? null,
        subscriptionStatus: sub?.status ?? null,
      };
    } catch (err) {
      return sendBillingError(req, reply, err);
    }
  });

  app.post("/billing/checkout", async (req, reply) => {
    try {
      const { plan } = planSchema.parse(req.body ?? {});
      const tenant = await ensureBillingTenant(req);

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

      const origin = resolveBillingOrigin(req);
      const priceId = planPriceId(plan);
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id: tenant.id,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/plan?checkout=success`,
        cancel_url: `${origin}/plan?checkout=cancel`,
        allow_promotion_codes: true,
        metadata: { tenantId: tenant.id, plan, planPriceId: priceId },
        subscription_data: {
          metadata: { tenantId: tenant.id, plan, planPriceId: priceId },
        },
      });

      if (!session.url) {
        return reply.status(502).send({ error: "Stripe não retornou URL de checkout." });
      }

      return { url: session.url };
    } catch (err) {
      return sendBillingError(req, reply, err);
    }
  });

  app.post("/billing/portal", async (req, reply) => {
    try {
      const stripe = getStripe();
      const tenant = await reconcileTenantBilling(stripe, await ensureBillingTenant(req));
      if (!tenant.stripeCustomerId) {
        return reply.status(400).send({ error: "Nenhum cliente Stripe vinculado. Escolha um plano primeiro." });
      }
      const origin = resolveBillingOrigin(req);
      const portal = await stripe.billingPortal.sessions.create({
        customer: tenant.stripeCustomerId,
        return_url: `${origin}/plan`,
      });
      if (!portal.url) {
        return reply.status(502).send({ error: "Stripe não retornou URL do portal." });
      }
      return { url: portal.url };
    } catch (err) {
      return sendBillingError(req, reply, err);
    }
  });

  app.post("/billing/cancel", async (req, reply) => {
    try {
      const { reason, lgpdConsent } = cancelSchema.parse(req.body ?? {});
      if (!lgpdConsent) {
        return reply.status(400).send({
          error: "Confirme o consentimento LGPD para processar o cancelamento.",
        });
      }

      const stripe = getStripe();
      const tenant = await reconcileTenantBilling(stripe, await ensureBillingTenant(req));
      if (!tenant.stripeCustomerId) {
        return reply.status(400).send({ error: "Nenhuma assinatura ativa para cancelar." });
      }

      const sub = await resolveSubscription(stripe, tenant);
      if (!sub) {
        return reply.status(400).send({ error: "Nenhuma assinatura ativa encontrada." });
      }
      const period = getSubscriptionBillingPeriod(sub);
      if (!period) {
        return reply.status(400).send({ error: "Ciclo de cobrança indisponível para cancelamento." });
      }

      const usage = getUsageMetrics(period.start, period.end);
      const payment = getLatestInvoicePaymentInfo(sub);
      const refundableRatio = usage.totalDays > 0 ? usage.remainingDays / usage.totalDays : 0;
      const refundAmountCents = Math.max(0, Math.floor(payment.amountPaidCents * refundableRatio));

      let refund: any = null;
      if (refundAmountCents > 0 && payment.chargeId) {
        refund = await stripe.refunds.create({
          charge: payment.chargeId,
          amount: refundAmountCents,
          reason: "requested_by_customer",
          metadata: {
            tenantId: tenant.id,
            subscriptionId: sub.id,
            usedDays: String(usage.usedDays),
            totalCycleDays: String(usage.totalDays),
          },
        });
      }

      await stripe.subscriptions.cancel(sub.id);

      const now = new Date().toISOString();
      await updateTenant(tenant.id, {
        planStatus: "CANCELED",
        stripeSubscriptionId: undefined,
        canceledAt: now,
        cancellationReason: normalizeReason(reason),
        cancellationUsageDays: usage.usedDays,
        cancellationCycleDays: usage.totalDays,
        cancellationRefundAmount: refund?.amount ?? 0,
        cancellationRefundCurrency: payment.currency.toUpperCase(),
        cancellationRefundId: refund?.id,
        cancellationRefundStatus: refund?.status,
      });

      await getDb().collection("tenants").doc(tenant.id).collection("privacy_audit").doc().set({
        type: "PLAN_CANCELLATION_EXECUTED",
        legalBasis: "EXECUCAO_CONTRATUAL",
        lgpdConsentAt: now,
        reasonProvided: Boolean(normalizeReason(reason)),
        usageDays: usage.usedDays,
        totalCycleDays: usage.totalDays,
        refundAmountCents: refund?.amount ?? 0,
        refundCurrency: payment.currency.toUpperCase(),
        executedAt: now,
        ip: anonymizeIp(req.ip),
        userAgent: String(req.headers["user-agent"] ?? "").slice(0, 180),
      });

      return {
        ok: true,
        canceledAt: now,
        usedDays: usage.usedDays,
        totalCycleDays: usage.totalDays,
        refundAmountCents: refund?.amount ?? 0,
        refundAmountBrl: Number(((refund?.amount ?? 0) / 100).toFixed(2)),
        refundId: refund?.id ?? null,
        refundStatus: refund?.status ?? "none",
      };
    } catch (err) {
      return sendBillingError(req, reply, err);
    }
  });

  app.get("/billing/prices", async () => {
    return {
      STARTER: { amount: PLAN_PRICES.STARTER.brl, priceId: process.env.STRIPE_PRICE_STARTER ?? null },
      PRO: { amount: PLAN_PRICES.PRO.brl, priceId: process.env.STRIPE_PRICE_PRO ?? null },
      UNLIMITED: { amount: PLAN_PRICES.UNLIMITED.brl, priceId: process.env.STRIPE_PRICE_UNLIMITED ?? null },
    };
  });
}

