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
- **Banco**: PostgreSQL + Prisma
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
    ├── database/     # Prisma schema + client
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

# Inicie todos os serviços
npm run dev
```

### 3. Acesse

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001
- **Login demo**: `demo@zapflow.com.br` / `demo1234`

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
