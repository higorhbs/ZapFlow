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
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Banco**: Firebase Firestore (+ PostgreSQL/Prisma legado opcional)
- **Auth**: Firebase Authentication
- **Filas**: BullMQ + Redis
- **WhatsApp**: Baileys (WhatsApp Web Protocol)
- **PIX**: Asaas API
- **SaaS**: Planos Starter/Pro/Unlimited

## Estrutura

```
zapflow/
├── apps/
│   ├── web/          # Dashboard Next.js (porta 3000)
│   └── api/          # API Fastify (porta 3001)
└── packages/
    ├── database/     # Prisma (legado / seed local)
    ├── firebase/     # Firestore + Auth (Admin + client)
    ├── shared/       # Utilitários, detecção de intent
    └── whatsapp-client/ # Wrapper Baileys
```

## Início rápido

### 1. Pré-requisitos
- Node.js 20+
- Docker (para Postgres e Redis)

### 2. Setup

```bash
# Clone e instale dependências
npm install

# Copie as variáveis de ambiente
cp .env.example .env
# Edite .env com suas chaves

# Suba Postgres e Redis
docker-compose up -d

# Gere o Prisma client e sincronize o banco
npm run db:generate
npm run db:push

# Popule com dados de exemplo
cd packages/database && npx tsx prisma/seed.ts

# Inicie todos os serviços (API lê o .env da raiz do monorepo)
npm run dev
```

A API precisa do `.env` na raiz com `GOOGLE_APPLICATION_CREDENTIALS=.secrets/firebase-adminsdk.json` (ou `FIREBASE_*` na Vercel).

### 3. Acesse

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001
- **Login demo**: `demo@zapflow.com.br` / `demo1234`

## Deploy

| App | URL |
|-----|-----|
| **API** | https://zap-flow-api-peach.vercel.app |
| **Web (Firebase Hosting)** | https://zapflow-higor-2026.web.app |

**Publicar o front no Firebase Hosting**

```bash
npm run deploy:hosting
```

Usa build estático (`apps/web/out`). Na primeira vez, rode `npm run google:oauth-setup` e inclua `https://zapflow-higor-2026.web.app` nas origens OAuth.

Na API (Vercel), defina `CORS_ORIGIN=https://zapflow-higor-2026.web.app`.

**Firebase (obrigatório)**

1. Crie projeto em [Firebase Console](https://console.firebase.google.com)
2. Ative **Authentication** → E-mail/senha e **Google**
3. Em **Authentication → Settings → Authorized domains**, confira `localhost` (login local em `http://localhost:3000`)
4. Login Google local: `npm run google:oauth-setup` → no OAuth **Web client (auto created by Google Service)** adicione redirect `http://localhost:3000/__/auth/handler` e origem JS `http://localhost:3000` (acesse só `http://localhost:3000`, não o IP da rede)
5. Crie **Firestore** (modo produção)
6. Deploy das regras: `firebase deploy --only firestore:rules` (com Firebase CLI)
7. Conta de serviço → JSON → variáveis `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` na API
8. Config do app web → `NEXT_PUBLIC_FIREBASE_*` no projeto Web

**Projeto API** (`apps/api`):

- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `CORS_ORIGIN` — URL do dashboard
- `ENABLE_WORKERS=false` na Vercel

**Projeto Web** (`apps/web` — produção em `apps/web/.env.production` ou Hosting):

- `NEXT_PUBLIC_FIREBASE_*` (6 variáveis)
- `NEXT_PUBLIC_API_URL=https://zap-flow-api-peach.vercel.app`

Teste: `GET https://zap-flow-api-peach.vercel.app/health` → `{ "ok": true }`

**WhatsApp/filas:** Railway/Render com `ENABLE_WORKERS=true` (não roda na Vercel serverless).

## Configuração do WhatsApp

1. Acesse o dashboard → Negócios → Selecione o negócio → WhatsApp
2. Clique em **Gerar QR Code**
3. No celular: WhatsApp → Dispositivos conectados → Conectar dispositivo
4. Escaneie o QR Code
5. Pronto! O bot já está ativo

## Configuração do PIX (Asaas)

1. Crie uma conta em [asaas.com](https://asaas.com)
2. Pegue sua API key em Configurações → Integrações
3. Coloque no `.env`: `ASAAS_API_KEY=seu_token`
4. Para produção: `ASAAS_BASE_URL=https://www.asaas.com/api/v3`

## Planos SaaS

| Plano | Preço | Números | Mensagens/mês |
|---|---|---|---|
| Starter | R$ 97/mês | 1 | 500 |
| Pro | R$ 197/mês | 3 | 5.000 |
| Unlimited | R$ 397/mês | 10 | Ilimitado |

## Detecção de Intent (sem IA)

O bot usa correspondência de palavras-chave configuráveis:

- `"catálogo", "menu", "serviços"` → envia catálogo
- `"agendar", "marcar", "horário"` → inicia fluxo de agendamento
- `"orçamento", "quanto custa", "preço"` → envia tabela de preços
- `"pix", "pagar", "sinal"` → gera cobrança PIX
- `"atendente", "humano"` → pausa bot e notifica
- FAQ: palavras-chave configuradas no painel

## Roadmap

- [ ] Integração com IA (OpenAI/Claude) para respostas mais naturais
- [ ] Lembretes automáticos de agendamento (D-1)
- [ ] Relatórios e analytics avançados
- [ ] Integração com Google Calendar
- [ ] App mobile para atendentes
- [ ] Multi-idioma
