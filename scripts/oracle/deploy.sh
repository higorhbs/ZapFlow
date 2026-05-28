#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "Crie .env a partir de .env.oracle.example"
  cp -n .env.oracle.example .env
  echo "Edite .env (API_DOMAIN, FIREBASE_SERVICE_ACCOUNT_JSON, CORS_ORIGIN) e rode de novo."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [ -z "${API_DOMAIN:-}" ]; then
  echo "Defina API_DOMAIN no .env (ex: api.seudominio.com)"
  exit 1
fi

if [ -z "${FIREBASE_SERVICE_ACCOUNT_JSON:-}" ] && [ ! -f .secrets/firebase-adminsdk.json ]; then
  echo "Defina FIREBASE_SERVICE_ACCOUNT_JSON no .env ou coloque .secrets/firebase-adminsdk.json"
  exit 1
fi

git pull --ff-only origin main 2>/dev/null || true

docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "Deploy concluido."
echo "API: https://${API_DOMAIN}"
echo "Health: https://${API_DOMAIN}/health"
echo ""
echo "No Firebase Hosting (.env.production):"
echo "NEXT_PUBLIC_API_URL=https://${API_DOMAIN}"
