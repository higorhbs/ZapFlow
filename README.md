# FlowDesk IA — Atendimento automático no WhatsApp

SaaS de resposta automática para WhatsApp voltado a pequenos negócios: barbearia, salão, restaurante, dentista, loja e comércio local.

Automatize atendimento, agendamentos, catálogo, FAQ e cobrança PIX — com painel web e bot no WhatsApp.

---

## Funcionalidades

### Bot WhatsApp (agente externo)

| Feature | Descrição |
| --- | --- |
| **Menu automático** | Menu numerado personalizado por tipo de negócio (agenda, catálogo, dúvidas, PIX, atendente) |
| **Catálogo / orçamento** | Cliente pede catálogo ou preço → bot envia serviços/produtos com valores |
| **Agendamento** | Fluxo guiado: serviço → data → horário → confirmação automática |
| **Consulta de agendamento** | Cliente pergunta “meu agendamento” → bot localiza e informa |
| **FAQ inteligente** | Palavras-chave configuradas no painel → respostas automáticas |
| **PIX automático** | QR Code + copia-e-cola na conversa via Asaas (planos Pro e Unlimited) |
| **Atendimento humano** | Cliente pede atendente → bot pausa; operador responde pelo painel |
| **Fora do horário** | Mensagem de ausência configurável quando o negócio está fechado |

### Painel web

| Área | Descrição |
| --- | --- |
| **Dashboard** | Conversas, agendamentos pendentes, receita PIX e métricas do mês |
| **Negócio** | Cadastro, tipo (barbearia, salão, etc.), horários, saudação e mensagem de ausência |
| **Catálogo** | Serviços/produtos com preço, descrição e limite por plano |
| **Agendamentos** | Calendário, confirmação/rejeição (tipos com aprovação manual) |
| **Conversas** | Histórico, assumir/liberar atendimento, enviar mensagem manual |
| **WhatsApp** | Conectar via QR Code, status da sessão, desconectar |
| **FAQ + PIX** | Perguntas frequentes e integração Asaas (Pro+) |
| **Plano** | Assinatura Stripe, trial, portal de cobrança |
| **Perfil** | Conta, LGPD (exportar, anonimizar, excluir dados) |

### Tipos de negócio

Vocabulário e fluxos adaptados para: **Barbearia**, **Salão**, **Restaurante**, **Consultório**, **Loja** e **Outro** (rótulo customizado).

### Conta e conformidade

- Login com **Google** ou **e-mail/senha** (Firebase Auth)
- **Trial de 14 dias** no plano Starter
- **LGPD**: exportação de dados, solicitações de titular, exclusão de conta
- Retenção automática de dados (configurável na API)

---

## Arquitetura

O monorepo é dividido em três camadas em produção:

```
┌─────────────────┐     Firestore (direto)     ┌──────────────────┐
│  Dashboard Web  │ ◄──────────────────────► │  Firebase Auth   │
│  (Next.js SPA)  │                            │  + Firestore     │
└────────┬────────┘                            └──────────────────┘
         │ REST (billing, privacy, Asaas)
         ▼
┌─────────────────┐
│  API Fastify    │  Firebase Functions (/api/*) ou VM Oracle (Docker)
└─────────────────┘

         │ REST (connect, send, bot)
         ▼
┌─────────────────┐
│  Agente WA      │  Repositório flowdesk-wa — Pi / VPS + Redis + Baileys
└─────────────────┘
```

- **Dashboard**: lê e grava negócios, catálogo, FAQ, conversas e agendamentos **direto no Firestore** (regras de segurança por `tenantId`).
- **API**: cobrança Stripe, webhooks, integração Asaas, privacidade/LGPD e sync de tenant.
- **Agente WhatsApp**: processo contínuo separado; gerencia sessão Baileys, bot e filas.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Monorepo | Turborepo + pnpm |
| Frontend | Next.js 16 (App Router), Tailwind CSS 4, TanStack Query |
| API | Fastify + TypeScript |
| Banco / Auth | Firebase Firestore + Firebase Authentication |
| Pagamentos assinatura | Stripe |
| Pagamentos PIX | Asaas |
| WhatsApp | Baileys (agente externo `flowdesk-wa`) |
| Deploy web | Firebase Hosting (export estático) |
| Deploy API | Firebase Functions ou Docker na Oracle Cloud |

---

## Estrutura

```
flowdesk/
├── apps/
│   ├── web/                 # Dashboard Next.js (porta 3000)
│   └── api/                 # API Fastify (porta 3001)
├── packages/
│   ├── firebase/            # Admin SDK + client Firestore (client-ops)
│   ├── shared/              # Intents, planos, vocabulário, menu do bot
│   └── whatsapp-client/     # Wrapper Baileys (usado pelo flowdesk-wa)
├── scripts/                 # Deploy, Stripe, hosting, Oracle VM
├── firebase.json            # Hosting + Functions + Firestore
└── docker-compose*.yml      # API na VM (opcional)
```

---

## Início rápido

### Pré-requisitos

- Node.js 20+
- pnpm 10+
- Projeto Firebase (Auth + Firestore + Hosting)
- Credencial Admin em `.secrets/firebase-adminsdk.json`

> Redis e o agente WhatsApp só são necessários para testar conexão/bot localmente (`flowdesk-wa`).

### Setup

```bash
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
# Preencha FIREBASE_* na raiz e NEXT_PUBLIC_* no web
```

Credencial Admin na raiz:

```bash
GOOGLE_APPLICATION_CREDENTIALS=.secrets/firebase-adminsdk.json
```

**Login Google:** rode `pnpm google:oauth-setup` e adicione no Google Cloud → OAuth Client → **Authorized redirect URIs** e **Authorized JavaScript origins** todas as URLs que o script listar. Com domínio customizado (ex.: `https://flowdesk.ia.br`), defina `WEB_ORIGIN` no `.env` antes de rodar o script e inclua `flowdesk.ia.br` em Firebase → Authentication → Settings → **Authorized domains**. Erro `origin_mismatch` = falta a origem JS `https://seu-dominio` no OAuth Client.

### Desenvolvimento

```bash
pnpm dev          # web :3000 + api :3001
pnpm dev:web      # só frontend
pnpm dev:api      # só API
```

| Serviço | URL |
| --- | --- |
| Dashboard | http://localhost:3000 |
| API | http://localhost:3001 |
| Health | http://localhost:3001/health |

Para WhatsApp completo (QR, bot, envio), suba o **flowdesk-wa** apontando `NEXT_PUBLIC_WA_API_URL` para ele.

---

## Planos

| Plano | Preço | Mensagens/mês | Catálogo | Agendamentos/mês | Extras |
| --- | --- | --- | --- | --- | --- |
| **Starter** | R$ 69,90 | 500 | 3 itens | 30 | 2 stories/mês · Trial 14 dias |
| **Pro** | R$ 99 | 5.000 | 100 itens | 500 | 10 stories/mês · PIX Asaas |
| **Unlimited** | R$ 199 | Ilimitado | Ilimitado | Ilimitado | Stories ilimitados |

Sincronizar preços Stripe: `pnpm stripe:sync-prices`

---

## Deploy

| Componente | Onde | Comando / doc |
| --- | --- | --- |
| **Web** | Firebase Hosting | `pnpm deploy:hosting` |
| **Firestore** | Regras e índices | `pnpm deploy:firestore` |
| **API** | Firebase Functions (`/api/*`) | `firebase deploy --only functions` |
| **API (VM)** | Oracle Cloud + Caddy + Docker | `scripts/oracle/deploy-api.sh` — ver `scripts/oracle/BILLING-VM-SETUP.md` |
| **WhatsApp** | flowdesk-wa (Pi/VPS) | Repo separado, processo contínuo |

### Front de produção

```bash
pnpm setup:billing-env    # gera apps/web/.env.production a partir do .env
pnpm deploy:hosting
```

Variáveis essenciais em `apps/web/.env.production`:

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | API de billing/privacy (ex.: `https://projeto.web.app/api`) |
| `NEXT_PUBLIC_WA_API_URL` | Agente WhatsApp (ex.: `https://wa.seudominio.com`) |
| `NEXT_PUBLIC_FIREBASE_*` | Config do projeto Firebase |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Login Google |

Deixe os Payment Links Stripe vazios em produção — checkout passa pela API para ativar o plano.

### API (raiz `.env`)

| Variável | Uso |
| --- | --- |
| `FIREBASE_*` / `GOOGLE_APPLICATION_CREDENTIALS` | Admin SDK |
| `STRIPE_*` | Assinaturas e webhooks |
| `ASAAS_*` | PIX (global ou por negócio via painel) |
| `CORS_ORIGIN` | URL(s) do Hosting |
| `PRIVACY_RETENTION_INTERVAL_HOURS` | Job de retenção LGPD (0 = desligado) |

### Agente WhatsApp (flowdesk-wa)

| Variável | Uso |
| --- | --- |
| `FIREBASE_*` | Leitura/escrita Firestore |
| `REDIS_URL` | Filas e sessão |
| `WA_SESSION_PATH` | Persistência Baileys |
| `CORS_ORIGIN` | URL do dashboard |

---

## Configuração do WhatsApp

1. Dashboard → **Negócios** → **WhatsApp**
2. **Gerar QR Code** e escanear no celular
3. Bot ativo após conectar (requer agente `flowdesk-wa` no ar)

---

## Scripts úteis

| Script | Descrição |
| --- | --- |
| `pnpm google:oauth-setup` | URLs de redirect OAuth |
| `pnpm prepare:hosting` | Copia packages para `apps/web/vendor` |
| `pnpm build:hosting` | Build estático para Firebase Hosting |
| `pnpm preview:hosting` | Preview local do export |
| `pnpm setup:billing-env` | Gera `.env.production` do web |
| `pnpm setup:github-deploy` | Secrets GitHub Actions (deploy VM) |
| `pnpm setup:server-env` | Template `.env` para servidor |
| `pnpm oracle:prep-env` | Prepara env local para Oracle |
| `pnpm oracle:setup-billing` | Stripe webhook na VM |

---

## CI

- **`.github/workflows/deploy-api-image.yml`** — build e push da imagem Docker `ghcr.io/OWNER/flowdesk-api` a cada push em `main` (paths da API/packages).

Na VM, defina `API_IMAGE=ghcr.io/OWNER/flowdesk-api:latest` no `.env` para deploy em ~30s sem rebuild local.

---

## Licença

Projeto privado.
