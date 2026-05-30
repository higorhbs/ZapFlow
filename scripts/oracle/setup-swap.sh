#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Rode com sudo: sudo bash scripts/oracle/setup-swap.sh"
  exit 1
fi

SWAP_FILE="${SWAP_FILE:-/swapfile}"
SWAP_GB="${SWAP_GB:-4}"

if swapon --show | grep -q "${SWAP_FILE}"; then
  echo "Swap já ativo em ${SWAP_FILE}"
  swapon --show
  exit 0
fi

echo "Criando swap de ${SWAP_GB}G em ${SWAP_FILE} (evita VM travar no docker build)..."
fallocate -l "${SWAP_GB}G" "${SWAP_FILE}" 2>/dev/null || dd if=/dev/zero of="${SWAP_FILE}" bs=1M count=$((SWAP_GB * 1024)) status=progress
chmod 600 "${SWAP_FILE}"
mkswap "${SWAP_FILE}"
swapon "${SWAP_FILE}"

if ! grep -q "${SWAP_FILE}" /etc/fstab; then
  echo "${SWAP_FILE} none swap sw 0 0" >> /etc/fstab
fi

echo "Swap ativo:"
swapon --show
free -h
