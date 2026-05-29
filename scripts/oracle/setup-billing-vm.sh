#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "❌ .env não encontrado. Copie .env.oracle.example → .env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

need() {
  if [ -z "${!1:-}" ]; then
    echo "❌ Defina $1 no .env"
    exit 1
  fi
}

need API_DOMAIN
need STRIPE_SECRET_KEY
need STRIPE_PRICE_STARTER
need STRIPE_PRICE_PRO
need STRIPE_PRICE_UNLIMITED

if ! command -v jq >/dev/null 2>&1; then
  echo "Instalando jq..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y && sudo apt-get install -y jq
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y jq
  else
    echo "❌ Instale jq manualmente"
    exit 1
  fi
fi

upsert_env() {
  local key="$1" val="$2" file=".env"
  if grep -q "^${key}=" "$file"; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$file"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

WEBHOOK_URL="https://${API_DOMAIN}/webhooks/stripe"
echo "→ Webhook Stripe: ${WEBHOOK_URL}"

EXISTING_ID=$(curl -sS -G https://api.stripe.com/v1/webhook_endpoints \
  -u "${STRIPE_SECRET_KEY}:" \
  -d limit=100 | jq -r --arg u "$WEBHOOK_URL" '.data[] | select(.url==$u) | .id' | head -1)

if [ -n "$EXISTING_ID" ]; then
  echo "✓ Webhook já existe (${EXISTING_ID})"
  if [ -z "${STRIPE_WEBHOOK_SECRET:-}" ]; then
    echo "⚠ STRIPE_WEBHOOK_SECRET vazio. No Stripe Dashboard → Webhooks → Reveal secret"
    echo "  Depois: upsert manual ou apague o endpoint e rode este script de novo."
  fi
else
  echo "→ Criando webhook..."
  RESP=$(curl -sS -X POST https://api.stripe.com/v1/webhook_endpoints \
    -u "${STRIPE_SECRET_KEY}:" \
    --data-urlencode "url=${WEBHOOK_URL}" \
    -d "enabled_events[]=checkout.session.completed" \
    -d "enabled_events[]=customer.subscription.created" \
    -d "enabled_events[]=customer.subscription.updated" \
    -d "enabled_events[]=customer.subscription.deleted")

  ERR=$(echo "$RESP" | jq -r '.error.message // empty')
  if [ -n "$ERR" ]; then
    echo "❌ Stripe: $ERR"
    exit 1
  fi

  SECRET=$(echo "$RESP" | jq -r '.secret // empty')
  if [ -z "$SECRET" ]; then
    echo "❌ Stripe não retornou signing secret"
    exit 1
  fi
  upsert_env STRIPE_WEBHOOK_SECRET "$SECRET"
  echo "✓ STRIPE_WEBHOOK_SECRET gravado no .env"
fi

PORTAL_RETURN="${CORS_ORIGIN%%,*}/plan"
echo "→ Configurando Customer Portal (return: ${PORTAL_RETURN})..."
PORTAL_RESP=$(curl -sS -X POST https://api.stripe.com/v1/billing_portal/configurations \
  -u "${STRIPE_SECRET_KEY}:" \
  -d "business_profile[headline]=AtendeJa" \
  -d "features[invoice_history][enabled]=true" \
  -d "features[payment_method_update][enabled]=true" \
  -d "features[subscription_cancel][enabled]=true" \
  --data-urlencode "default_return_url=${PORTAL_RETURN}")

PORTAL_ERR=$(echo "$PORTAL_RESP" | jq -r '.error.message // empty')
if [ -n "$PORTAL_ERR" ]; then
  echo "⚠ Portal: $PORTAL_ERR (ative manualmente no Dashboard se precisar)"
else
  echo "✓ Customer Portal configurado"
fi

echo "→ git pull + deploy API..."
bash scripts/oracle/deploy-api.sh

echo ""
echo "✅ Billing na VM pronto."
echo "   Health: https://${API_DOMAIN}/health"
echo "   Webhook: ${WEBHOOK_URL}"
