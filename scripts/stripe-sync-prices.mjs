import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import Stripe from "stripe";

const BRAND = "FlowDesk IA";

const PLANS = [
  { env: "STRIPE_PRICE_STARTER", plan: "STARTER", brl: 69.9, name: `${BRAND} Starter` },
  { env: "STRIPE_PRICE_PRO", plan: "PRO", brl: 99, name: `${BRAND} Pro` },
  { env: "STRIPE_PRICE_UNLIMITED", plan: "UNLIMITED", brl: 199, name: `${BRAND} Unlimited` },
];

function loadEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

function upsertEnv(filePath, updates) {
  const lines = existsSync(filePath) ? readFileSync(filePath, "utf8").split("\n") : [];
  const keys = new Set(Object.keys(updates));
  const out = lines.map((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return line;
    const eq = t.indexOf("=");
    if (eq === -1) return line;
    const key = t.slice(0, eq).trim();
    if (keys.has(key)) {
      keys.delete(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });
  for (const key of keys) out.push(`${key}=${updates[key]}`);
  writeFileSync(filePath, out.join("\n").replace(/\n*$/, "\n"));
}

function planMeta(price) {
  return price.metadata?.flowdesk_plan || price.metadata?.atendeja_plan || price.metadata?.zapflow_plan;
}

async function renameProduct(stripe, productRef, plan) {
  const productId = typeof productRef === "string" ? productRef : productRef?.id;
  if (!productId) return;
  await stripe.products.update(productId, {
    name: plan.name,
    metadata: { flowdesk_plan: plan.plan },
  });
  console.log(`Produto renomeado: ${plan.name} (${productId})`);
}

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");
const fileEnv = loadEnv(envPath);
const key = (process.env.STRIPE_SECRET_KEY || fileEnv.STRIPE_SECRET_KEY || "").trim();
if (!key) {
  console.error("STRIPE_SECRET_KEY ausente em .env");
  process.exit(1);
}

const stripe = new Stripe(key);
const amountMap = new Map(PLANS.map((p) => [p.brl * 100, p]));
const updates = {};

const configuredIds = PLANS.map((p) => fileEnv[p.env]?.trim()).filter(Boolean);
for (const priceId of configuredIds) {
  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    const meta = planMeta(price);
    const match = PLANS.find((p) => p.plan === meta) || amountMap.get(price.unit_amount ?? -1);
    if (!match) continue;
    updates[match.env] = price.id;
    await renameProduct(stripe, price.product, match);
  } catch (err) {
    console.warn(`Preço ${priceId} ignorado:`, err.message);
  }
}

const prices = await stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] });

for (const price of prices.data) {
  if (price.currency !== "brl" || price.type !== "recurring") continue;
  const meta = planMeta(price);
  const match =
    (meta && PLANS.find((p) => p.plan === meta)) ||
    amountMap.get(price.unit_amount ?? -1);
  if (!match || updates[match.env]) continue;
  if ((price.unit_amount ?? 0) !== match.brl * 100) continue;
  updates[match.env] = price.id;
  await renameProduct(stripe, price.product, match);
}

for (const p of PLANS) {
  if (updates[p.env]) continue;
  const product = await stripe.products.create({
    name: p.name,
    metadata: { flowdesk_plan: p.plan },
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "brl",
    unit_amount: p.brl * 100,
    recurring: { interval: "month" },
    metadata: { flowdesk_plan: p.plan },
  });
  updates[p.env] = price.id;
  console.log(`Criado ${p.name}: ${price.id}`);
}

upsertEnv(envPath, updates);
for (const p of PLANS) {
  console.log(`${p.env}=${updates[p.env]}`);
}
