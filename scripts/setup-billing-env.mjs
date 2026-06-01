#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

const env = loadEnv(resolve(root, ".env"));
const waUrlDirect =
  env.NEXT_PUBLIC_WA_API_URL?.trim() || env.WA_API_PUBLIC_URL?.trim() || "";
const apiDomain = (
  waUrlDirect ||
  env.BILLING_API_DOMAIN ||
  env.API_DOMAIN
)?.trim();

if (!apiDomain) {
  console.error("\n❌ Defina BILLING_API_DOMAIN ou API_DOMAIN no .env da raiz");
  console.error("   Depois rode: pnpm setup:billing-env\n");
  process.exit(1);
}

const apiUrl = apiDomain.startsWith("http") ? apiDomain.replace(/\/$/, "") : `https://${apiDomain}`;

function resolveWaApiUrl() {
  const direct =
    env.NEXT_PUBLIC_WA_API_URL?.trim() ||
    env.WA_API_PUBLIC_URL?.trim() ||
    "";
  if (direct) return direct.replace(/\/$/, "");
  const waDomain = env.WA_API_DOMAIN?.trim();
  if (!waDomain) return "";
  return waDomain.startsWith("http") ? waDomain.replace(/\/$/, "") : `https://${waDomain}`;
}

const waApiUrl = resolveWaApiUrl();
if (!waApiUrl) {
  console.warn(
    "\n⚠️  NEXT_PUBLIC_WA_API_URL / WA_API_PUBLIC_URL / WA_API_DOMAIN ausente no .env da raiz.",
  );
  console.warn("   WhatsApp (QR Code) não funcionará até configurar e rodar deploy:hosting de novo.\n");
}

const keys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
];

const lines = [
  `# Gerado por scripts/setup-billing-env.mjs — não commitar`,
  `NEXT_PUBLIC_API_URL=${apiUrl}`,
  `NEXT_PUBLIC_WA_API_URL=${waApiUrl}`,
  "",
  ...keys.map((k) => `${k}=${env[k] ?? ""}`),
  "",
  "# Checkout via API (obrigatório para ativar plano automático)",
  "NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER=",
  "NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO=",
  "NEXT_PUBLIC_STRIPE_PAYMENT_LINK_UNLIMITED=",
  "NEXT_PUBLIC_STRIPE_BILLING_PORTAL_URL=",
  "",
];

const outPath = resolve(root, "apps/web/.env.production");
writeFileSync(outPath, lines.join("\n"));
console.log(`\n✅ ${outPath}`);
console.log(`   NEXT_PUBLIC_API_URL=${apiUrl}`);
if (waApiUrl) console.log(`   NEXT_PUBLIC_WA_API_URL=${waApiUrl}`);
console.log("\nPróximo: pnpm deploy:hosting\n");
