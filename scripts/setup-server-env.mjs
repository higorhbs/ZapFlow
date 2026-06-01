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
const apiDomain = env.API_DOMAIN?.trim();

if (!apiDomain) {
  console.error("\n❌ Defina API_DOMAIN no .env da raiz (ex: flowdesk.duckdns.org)\n");
  process.exit(1);
}

const acmeEmail = env.ACME_EMAIL?.trim() || process.env.ACME_EMAIL?.trim();
if (!acmeEmail) {
  console.error("\n❌ Defina ACME_EMAIL no .env (e-mail Let's Encrypt / Caddy)\n");
  process.exit(1);
}

const saPath = env.GOOGLE_APPLICATION_CREDENTIALS?.trim() || ".secrets/firebase-adminsdk.json";
const fullSa = existsSync(resolve(root, saPath))
  ? resolve(root, saPath)
  : existsSync(saPath)
    ? resolve(saPath)
    : null;

if (!fullSa) {
  console.error(`\n❌ Service account não encontrada: ${saPath}\n`);
  process.exit(1);
}

const saJson = JSON.stringify(JSON.parse(readFileSync(fullSa, "utf8")));

const hostingOrigins = [
  "https://zapflow-higor-2026.web.app",
  "https://zapflow-higor-2026.firebaseapp.com",
  "https://flowdesk.ia.br",
];
const corsFromEnv = env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];
const corsOrigin = [...new Set([...hostingOrigins, ...corsFromEnv.filter((o) => !o.includes("localhost"))])].join(",");

const pick = (key, fallback = "") => env[key]?.trim() || fallback;

const lines = [
  "# Gerado por pnpm setup:server-env — copie para a VM como .env",
  `API_DOMAIN=${apiDomain}`,
  `ACME_EMAIL=${acmeEmail}`,
  "ENABLE_WORKERS=true",
  "BUSINESS_TIMEZONE=America/Sao_Paulo",
  `CORS_ORIGIN=${corsOrigin}`,
  "",
  `FIREBASE_PROJECT_ID=${pick("FIREBASE_PROJECT_ID", "zapflow-higor-2026")}`,
  `FIREBASE_CLIENT_EMAIL=${pick("FIREBASE_CLIENT_EMAIL", "firebase-adminsdk-fbsvc@zapflow-higor-2026.iam.gserviceaccount.com")}`,
  `FIREBASE_SERVICE_ACCOUNT_JSON=${saJson}`,
  "GOOGLE_APPLICATION_CREDENTIALS=/app/.secrets/firebase-adminsdk.json",
  "",
  `STRIPE_SECRET_KEY=${pick("STRIPE_SECRET_KEY")}`,
  `STRIPE_WEBHOOK_SECRET=${pick("STRIPE_WEBHOOK_SECRET")}`,
  `STRIPE_PRICE_STARTER=${pick("STRIPE_PRICE_STARTER")}`,
  `STRIPE_PRICE_PRO=${pick("STRIPE_PRICE_PRO")}`,
  `STRIPE_PRICE_UNLIMITED=${pick("STRIPE_PRICE_UNLIMITED")}`,
  "",
  `ASAAS_API_KEY=${pick("ASAAS_API_KEY")}`,
  `ASAAS_BASE_URL=${pick("ASAAS_BASE_URL", "https://sandbox.asaas.com/api/v3")}`,
  `ASAAS_WEBHOOK_TOKEN=${pick("ASAAS_WEBHOOK_TOKEN")}`,
  `ASAAS_DEFAULT_CPF=${pick("ASAAS_DEFAULT_CPF", "24971563792")}`,
  "",
];

const outPath = resolve(root, ".env.server");
writeFileSync(outPath, lines.join("\n"));
console.log(`\n✅ ${outPath}`);
console.log(`   API_DOMAIN=${apiDomain}`);
console.log(`   CORS_ORIGIN=${corsOrigin}`);
if (!pick("STRIPE_WEBHOOK_SECRET")) {
  console.warn("\n⚠️  STRIPE_WEBHOOK_SECRET vazio — configure na VM após criar webhook Stripe");
}
const vmUser = process.env.VM_USER?.trim() || "ubuntu";
const vmHost = process.env.VM_HOST?.trim() || "163.176.132.231";
const waDir = process.env.VM_WA_DIR?.trim() || "~/flowdesk-wa";
const apiDir = process.env.VM_API_DIR?.trim() || "~/FlowDesk";
console.log("\nNa VM (WhatsApp / flowdesk-wa):");
console.log(`  scp .env.server ${vmUser}@${vmHost}:${waDir}/.env`);
console.log(`  scp .secrets/firebase-adminsdk.json ${vmUser}@${vmHost}:${waDir}/.secrets/`);
console.log(`  ssh ${vmUser}@${vmHost} 'cd ${waDir} && docker compose -f docker-compose.https.yml up -d --build'`);
console.log("\nCobrança Stripe (monorepo FlowDesk, se usar VM para billing):");
console.log(`  scp .env.server ${vmUser}@${vmHost}:${apiDir}/.env`);
console.log(`  ssh ${vmUser}@${vmHost} 'cd ${apiDir} && bash scripts/oracle/deploy-api.sh'\n`);
