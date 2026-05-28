#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

API_DOMAIN="${1:-}"
if [ -z "$API_DOMAIN" ]; then
  echo "Uso: bash scripts/oracle/prep-local-env.sh api.seudominio.com"
  exit 1
fi

cp -n .env.oracle.example .env.oracle 2>/dev/null || true

SA_PATH="${GOOGLE_APPLICATION_CREDENTIALS:-.secrets/firebase-adminsdk.json}"
if [ ! -f "$ROOT/$SA_PATH" ] && [ ! -f "$SA_PATH" ]; then
  echo "Arquivo service account nao encontrado: $SA_PATH"
  exit 1
fi
FULL_SA="$ROOT/$SA_PATH"
[ -f "$FULL_SA" ] || FULL_SA="$SA_PATH"

JSON_ONELINE="$(node -e "console.log(JSON.stringify(require(process.argv[1])))" "$FULL_SA")"

{
  echo "API_DOMAIN=${API_DOMAIN}"
  echo "ACME_EMAIL=${ACME_EMAIL:-admin@${API_DOMAIN#api.}}"
  echo "ENABLE_WORKERS=true"
  echo "CORS_ORIGIN=https://zapflow-higor-2026.web.app,https://zapflow-higor-2026.firebaseapp.com"
  echo ""
  echo "FIREBASE_PROJECT_ID=zapflow-higor-2026"
  echo "FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@zapflow-higor-2026.iam.gserviceaccount.com"
  echo "FIREBASE_SERVICE_ACCOUNT_JSON=${JSON_ONELINE}"
  echo "GOOGLE_APPLICATION_CREDENTIALS=/app/.secrets/firebase-adminsdk.json"
  echo ""
  if [ -f .env ]; then
    grep -E '^(STRIPE_|ASAAS_)' .env | grep -v '^#' || true
  else
    echo "STRIPE_SECRET_KEY="
    echo "STRIPE_WEBHOOK_SECRET="
    echo "STRIPE_PRICE_STARTER="
    echo "STRIPE_PRICE_PRO="
    echo "STRIPE_PRICE_UNLIMITED="
  fi
} > .env.oracle

echo "Gerado: .env.oracle"
echo "Copie para a VM: scp .env.oracle opc@IP_VM:/opt/zapflow/.env"
echo "Front: NEXT_PUBLIC_API_URL=https://${API_DOMAIN}"
