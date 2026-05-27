# ZapFlow — Atendimento Automático para WhatsApp

SaaS de resposta automática para WhatsApp voltado a pequenos negócios (barbearia, salão, hamburgueria, dentista, loja de bairro).

## Funcionalidades

| Feature | Como funciona |
|---|---|
| **Catálogo automático** | Cliente digita "catálogo" ou "preço" → bot envia lista de serviços com valores |
| **Agendamento** | Cliente digita "agendar" → fluxo guiado (serviço → data → horário) → confirmação |
| **Orçamento** | Cliente digita "orçamento" → bot envia tabela de preços |
| **PIX automático** | Gera QR Code + copia-e-cola direto na conversa via Asaas |
| **FAQ inteligente** | Detecta palavras-chave e responde perguntas frequentes configuradas |
| **Atendimento humano** | Cliente pede "atendente" → bot pausa, operador assume pelo dashboard |

## Stack

- **Monorepo**: Turborepo
- **API**: Fastify + TypeScript
- **Frontend**: Next.js (App Router) + Tailwind CSS
- **Banco**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Filas**: BullMQ + Redis
- **WhatsApp**: Baileys (WhatsApp Web Protocol)
- **PIX**: Asaas API

## Estrutura

```
zapflow/
├── apps/
│   ├── web/          # Dashboard Next.js (porta 3000)
│   └── api/          # API Fastify (porta 3001)
└── packages/
    ├── firebase/     # Firestore + Auth (Admin + client)
    ├── shared/       # Utilitários, detecção de intent, planos
    └── whatsapp-client/ # Wrapper Baileys
```

## Início rápido

### Pré-requisitos

- Node.js 20+
- Redis (local: `docker compose up -d redis` ou `REDIS_URL` remoto)

### Setup

```bash
npm install
cp .env.example .env
# Edite .env com Firebase, Redis e Asaas

npm run dev
```

Credencial Admin: `GOOGLE_APPLICATION_CREDENTIALS=.secrets/firebase-adminsdk.json` na raiz.

**Login Google:** `npm run google:oauth-setup` — no Google Cloud → Credentials → OAuth Client → **Authorized redirect URIs**, inclua obrigatoriamente `https://zapflow-higor-2026.firebaseapp.com/__/auth/handler` (e as demais URLs que o script listar). `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` deve ser `zapflow-higor-2026.firebaseapp.com`.

### Acesse

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001

## Deploy

| App | URL |
|-----|-----|
| **API** | https://zap-flow-api-peach.vercel.app |
| **Web (Firebase Hosting)** | https://zapflow-higor-2026.web.app |

```bash
npm run deploy:hosting    # front
npm run deploy:firestore  # regras Firestore
```

**Firebase:** Authentication (e-mail + Google), Firestore, Hosting.  
**API (Vercel):** `FIREBASE_*`, `CORS_ORIGIN`, `ENABLE_WORKERS=false`  
**Web:** `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_API_URL`

**WhatsApp:** exige API com processo contínuo (`npm run dev` ou Railway/Render com `ENABLE_WORKERS=true`). Não funciona na Vercel serverless.

## Configuração do WhatsApp

1. Dashboard → Negócios → WhatsApp
2. **Gerar QR Code** e escanear no celular
3. Bot ativo após conectar

## Planos

| Plano | WhatsApp | Mensagens | Catálogo | Agendamentos |
|-------|----------|-----------|----------|--------------|
| Starter | 1 | 500/mês | 20 itens | 50/mês |
| Pro | 3 | 5.000/mês | 100 itens | 500/mês |
| Unlimited | 10 | Ilimitado | Ilimitado | Ilimitado |
