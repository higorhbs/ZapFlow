import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import Stripe from "stripe";

const PLANS = [
  { env: "STRIPE_PRICE_STARTER", plan: "STARTER", brl: 9.99, name: "AtendeJa Starter" },
  { env: "STRIPE_PRICE_PRO", plan: "PRO", brl: 99, name: "AtendeJa Pro" },
  { env: "STRIPE_PRICE_UNLIMITED", plan: "UNLIMITED", brl: 199, name: "AtendeJa Unlimited" },
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

const prices = await stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] });
const updates = {};

for (const price of prices.data) {
  if (price.currency !== "brl" || price.type !== "recurring") continue;
  const planMeta = price.metadata?.zapflow_plan;
  const match =
    (planMeta && PLANS.find((p) => p.plan === planMeta)) ||
    amountMap.get(price.unit_amount ?? -1);
  if (!match || updates[match.env]) continue;
  if ((price.unit_amount ?? 0) !== match.brl * 100) continue;
  updates[match.env] = price.id;
}

for (const p of PLANS) {
  if (updates[p.env]) continue;
  const product = await stripe.products.create({
    name: p.name,
    metadata: { zapflow_plan: p.plan },
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "brl",
    unit_amount: p.brl * 100,
    recurring: { interval: "month" },
    metadata: { zapflow_plan: p.plan },
  });
  updates[p.env] = price.id;
  console.log(`Criado ${p.plan}: ${price.id}`);
}

upsertEnv(envPath, updates);
for (const p of PLANS) {
  console.log(`${p.env}=${updates[p.env]}`);
}
