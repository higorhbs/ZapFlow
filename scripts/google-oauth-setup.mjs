#!/usr/bin/env node
const project = process.env.FIREBASE_PROJECT_ID ?? "zapflow-higor-2026";
const clientSuffix = "295076612394-8k6ecbb35gps827lj3um1efvofbj3gj6";

const site = `https://${project}.web.app`;
const redirects = [
  "http://localhost:3000/__/auth/handler",
  "http://127.0.0.1:3000/__/auth/handler",
  `https://${project}.firebaseapp.com/__/auth/handler`,
  `${site}/__/auth/handler`,
];
const jsOrigins = ["http://localhost:3000", "http://127.0.0.1:3000", site, `https://${project}.firebaseapp.com`];

const credentialsUrl = `https://console.cloud.google.com/apis/credentials?project=${project}`;
const clientUrl = `https://console.cloud.google.com/apis/credentials/oauthclient/${clientSuffix}?project=${project}`;

console.log("\n=== Login Google (Firebase redirect) ===\n");
console.log("O app NÃO usa mais o botão Google Identity (evita origin_mismatch).");
console.log("Abra o cliente OAuth:", `"Web client (auto created by Google Service)"`);
console.log("\nEm Authorized redirect URIs, adicione TODOS:");
redirects.forEach((r) => console.log("  •", r));
console.log("\nEm Authorized JavaScript origins (login via popup), adicione:");
jsOrigins.forEach((o) => console.log("  •", o));
console.log("\nLocal: http://localhost:3000");
console.log("Produção:", site);
console.log("(não use http://192.168.x.x:3000 — gera origin_mismatch no Google)\n");
console.log("Link direto do OAuth client:", clientUrl);
console.log("Lista de credenciais:", credentialsUrl);
console.log("\nSalve, aguarde 1 min, reinicie: npm run dev\n");

const { execSync } = await import("node:child_process");
try {
  execSync(`open "${clientUrl}"`, { stdio: "ignore" });
} catch {
  /* headless */
}
