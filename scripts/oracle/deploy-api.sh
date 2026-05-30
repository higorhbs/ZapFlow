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

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

if [ -n "${API_IMAGE:-}" ]; then
  echo "Pull da imagem pre-buildada (${API_IMAGE})..."
  docker compose -f docker-compose.prod.yml pull api
else
  if ! swapon --show 2>/dev/null | grep -q .; then
    echo "AVISO: VM sem swap — build pode travar. Rode: sudo bash scripts/oracle/setup-swap.sh"
  fi
  echo "Build local da API (3-15 min em VM free; prefira API_IMAGE no .env)..."
  docker compose -f docker-compose.prod.yml build --progress=plain api
fi

echo "Troca do container da API..."
docker compose -f docker-compose.prod.yml up -d --no-deps api

echo ""
echo "Deploy da API concluido."
if [ -z "${API_DOMAIN:-}" ]; then
  echo "API_DOMAIN não definido em .env"
  exit 1
fi
sleep 3
curl -sf "https://${API_DOMAIN}/health" && echo "" || echo "Health check falhou — aguarde alguns segundos."
