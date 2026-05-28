#!/usr/bin/env node
const project = process.env.FIREBASE_PROJECT_ID ?? "zapflow-higor-2026";
const clientSuffix = "295076612394-8k6ecbb35gps827lj3um1efvofbj3gj6";

const site = `https://${project}.web.app`;
const firebaseApp = `https://${project}.firebaseapp.com`;
const siteAuth = `https://${project}.web.app`;
const handlerFirebase = `${firebaseApp}/__/auth/handler`;
const handlerWeb = `${site}/__/auth/handler`;
const handlerLocal = "http://localhost:3000/__/auth/handler";
const handlerLocal127 = "http://127.0.0.1:3000/__/auth/handler";

const redirects = [handlerWeb, handlerFirebase, handlerLocal, handlerLocal127];
const jsOrigins = ["http://localhost:3000", "http://127.0.0.1:3000", site, firebaseApp];

const credentialsUrl = `https://console.cloud.google.com/apis/credentials?project=${project}`;
const clientUrl = `https://console.cloud.google.com/apis/credentials/oauthclient/${clientSuffix}?project=${project}`;
const authDomainsUrl = `https://console.firebase.google.com/project/${project}/authentication/settings`;

console.log("\n=== Login Google — Redirect URI (erro mais comum) ===\n");
console.log("Google Cloud → APIs & Services → Credentials");
console.log('→ OAuth client "Web client (auto created by Google Service)"');
console.log("→ Authorized redirect URIs\n");
console.log("OBRIGATÓRIO (copie exatamente, sem barra no final):");
console.log(`\n  ${handlerWeb}\n`);
console.log("Também adicione:");
redirects.slice(1).forEach((r) => console.log(`  ${r}`));
console.log("\n--- Authorized JavaScript origins ---");
jsOrigins.forEach((o) => console.log(`  ${o}`));
console.log("\n--- Firebase Authorized domains ---");
console.log("  localhost");
console.log(`  ${project}.web.app`);
console.log(`  ${project}.firebaseapp.com`);
console.log(`\n  ${authDomainsUrl}`);
console.log("\n--- App ---");
console.log(`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${project}.web.app`);
console.log("Dev: http://localhost:3000 (nunca 192.168.x.x)");
console.log("Produção:", site);
console.log("\nLink OAuth client:", clientUrl);
console.log("Salve, aguarde ~2 min, reinicie pnpm dev\n");

const { execSync } = await import("node:child_process");
try {
  execSync(`open "${clientUrl}"`, { stdio: "ignore" });
} catch {
  /* headless */
}
