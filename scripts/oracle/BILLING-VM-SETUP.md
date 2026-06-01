# Cobrança Stripe na VM Oracle — passo a passo

## Na sua máquina (antes da VM)

1. No `.env` da raiz, defina o domínio real da API:
   ```bash
   API_DOMAIN=api.seudominio.com
   ```
2. Gere o front de produção:
   ```bash
   pnpm setup:billing-env
   pnpm deploy:hosting
   ```

---

## Na VM Oracle

**Dois repositórios na mesma VM (comum):**

| Pasta na VM | Repo | Função |
|-------------|------|--------|
| `~/flowdesk-wa` | flowdesk-wa | WhatsApp (Baileys), `zapflow.duckdns.org` |
| `~/FlowDesk` | FlowDesk | Cobrança Stripe (`/billing/*`), `scripts/oracle/deploy-api.sh` |

Se só existir `~/flowdesk-wa`, o checkout de planos **não funciona** — clone o FlowDesk ou use Firebase `/api`.

Siga na ordem (billing = pasta **FlowDesk**).

## 1. Domínio da API

No `.env` **na VM** (raiz do FlowDesk):

```bash
API_DOMAIN=api.seudominio.com
ACME_EMAIL=seu@email.com
```

DNS: registro **A** apontando `api.seudominio.com` → IP público da VM.

## 2. Variáveis Stripe e Firebase

No mesmo `.env` da VM:

```bash
CORS_ORIGIN=https://zapflow-higor-2026.web.app,https://zapflow-higor-2026.firebaseapp.com,https://flowdesk.ia.br
WEB_ORIGIN=https://flowdesk.ia.br

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...    # passo 4
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_UNLIMITED=price_...

FIREBASE_PROJECT_ID=zapflow-higor-2026
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@zapflow-higor-2026.iam.gserviceaccount.com
GOOGLE_APPLICATION_CREDENTIALS=/app/.secrets/firebase-adminsdk.json
```

Credencial: copie `.secrets/firebase-adminsdk.json` para a VM (mesmo arquivo do dev).

## 3. Subir / atualizar a API

```bash
cd ~/FlowDesk   # ou caminho do clone
git pull origin main
bash scripts/oracle/deploy-api.sh
```

Teste:

```bash
curl -sf https://api.seudominio.com/health
```

Resposta esperada: `{"ok":true,...}`.

## 4. Webhook no Stripe Dashboard

1. [dashboard.stripe.com](https://dashboard.stripe.com) → **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL:** `https://api.seudominio.com/webhooks/stripe`
3. Eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Criar → copiar **Signing secret** (`whsec_...`)
5. Colar em `STRIPE_WEBHOOK_SECRET` no `.env` da VM
6. Rodar de novo: `bash scripts/oracle/deploy-api.sh`

## 5. Portal do cliente (Gerenciar cobrança)

Stripe → **Settings** → **Billing** → **Customer portal** → ativar e salvar.

## 6. Teste

1. App → `/plan` → escolher Pro → pagar (teste: `4242 4242 4242 4242`)
2. Stripe → Webhooks → último evento → **200**
3. Firestore → `tenants/{uid}` → `planStatus: ACTIVE`, `plan: PRO`
4. `/plan` → F5 → plano ativo

## Problemas comuns

| Sintoma | Causa |
|--------|--------|
| Webhook 400 | `STRIPE_WEBHOOK_SECRET` vazio ou errado na VM |
| Checkout não abre | `NEXT_PUBLIC_API_URL` no front não aponta para a VM |
| Pagou, plano não mudou | Webhook URL errada ou Payment Links ativos no front |
| CORS no checkout / “não conectou à API” | `CORS_ORIGIN` na VM sem a URL do painel (ex.: `https://flowdesk.ia.br`) |
