#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "Crie .env a partir de .env.oracle.example"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [ -d .secrets ]; then
  chmod 755 .secrets
  [ -f .secrets/firebase-adminsdk.json ] && chmod 644 .secrets/firebase-adminsdk.json
fi

git pull --ff-only origin main 2>/dev/null || true

echo "Build da API (container antigo continua no ar)..."
docker compose -f docker-compose.prod.yml build api

echo "Troca do container da API..."
docker compose -f docker-compose.prod.yml up -d --no-deps api

echo ""
echo "Deploy da API concluido."
curl -sf "https://${API_DOMAIN:-zapflow.duckdns.org}/health" && echo "" || echo "Health check falhou — aguarde alguns segundos."
