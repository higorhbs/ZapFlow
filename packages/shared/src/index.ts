// ─── Intent detection keywords ────────────────────────────────────────────────

export const INTENT_KEYWORDS = {
  CATALOG: ["cardápio", "catálogo", "catalogo", "menu", "serviços", "produtos", "o que vocês fazem", "o que voces fazem"],
  APPOINTMENT: ["agendamentos", "agendamento", "agendar", "marcar", "horário disponível", "horario disponivel", "quando tem", "quero marcar", "reservar", "agenda"],
  QUOTE: ["orçamento", "orcamento", "quanto custa", "valor", "preço", "preco", "tabela de preços"],
  PAYMENT: ["pix", "pagar", "pagamento", "sinal", "entrada", "link de pagamento"],
  FAQ: ["faq", "dúvida", "duvida", "perguntas", "horário", "horario", "onde fica", "endereço", "endereco", "funcionamento", "abre", "fecha", "telefone", "contato"],
  HUMAN: ["falar com atendente", "falar com humano", "atendente", "pessoa", "responsável"],
  CANCEL: ["cancelar", "desmarcar", "cancelamento"],
  CONFIRM: ["confirmar", "confirmo", "sim", "ok", "pode ser", "certo"],
} as const;

export type Intent = keyof typeof INTENT_KEYWORDS;

export function detectIntent(text: string): Intent | null {
  const normalized = text.toLowerCase().trim();

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if ((keywords as readonly string[]).some((kw) => normalized.includes(kw))) {
      return intent as Intent;
    }
  }
  return null;
}

/** Opção numérica do menu WhatsApp (ex: "1", "2.", "3)") */
export function parseOptionNumber(text: string, min: number, max: number): number | null {
  const trimmed = text.trim();
  const direct = trimmed.match(/^(\d{1,2})[\.\)\s]*$/);
  if (direct) {
    const n = parseInt(direct[1], 10);
    return n >= min && n <= max ? n : null;
  }
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly || digitsOnly.length > 2) return null;
  if (trimmed.replace(/[\d\s\.\)\-]/g, "").length > 0) return null;
  const n = parseInt(digitsOnly, 10);
  return !Number.isNaN(n) && n >= min && n <= max ? n : null;
}

export function isExitCommand(text: string): boolean {
  const t = text.toLowerCase().trim();
  return ["sair", "exit", "parar", "encerrar", "fim", "#sair"].includes(t);
}

export function isMenuRequest(text: string): boolean {
  const t = text.toLowerCase().trim();
  return ["menu", "opções", "opcoes", "opção", "opcao", "ajuda", "voltar", "início", "inicio"].some(
    (w) => t === w || t.startsWith(`${w} `)
  );
}

// ─── Formatação de mensagens ───────────────────────────────────────────────────

export function formatCurrency(value: number | string): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) {
    // +55 11 99999-9999
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return phone;
}

export function parseWhatsAppPhone(jid: string): string {
  return jid.split("@")[0];
}

// ─── Horário de funcionamento ─────────────────────────────────────────────────

export type WorkingHours = {
  [day: string]: [string, string] | null; // ["09:00", "18:00"] ou null = fechado
};

export const DAY_LABELS: Record<string, string> = {
  sun: "Domingo",
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
};

const DAY_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function isOpenNow(workingHours: WorkingHours): boolean {
  const now = new Date();
  const day = DAY_ORDER[now.getDay()];
  const slot = workingHours[day];
  if (!slot) return false;

  const [openH, openM] = slot[0].split(":").map(Number);
  const [closeH, closeM] = slot[1].split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

// ─── Template helpers ─────────────────────────────────────────────────────────

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

// ─── Planos ───────────────────────────────────────────────────────────────────

export const PLAN_LIMITS = {
  STARTER: { phones: 1, messagesPerMonth: 500, catalogItems: 3, appointmentsPerMonth: 30 },
  PRO: { phones: 3, messagesPerMonth: 5000, catalogItems: 100, appointmentsPerMonth: 500 },
  UNLIMITED: {
    phones: 10,
    messagesPerMonth: Infinity,
    catalogItems: Infinity,
    appointmentsPerMonth: Infinity,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

export function formatPlanLimit(value: number): string {
  if (!Number.isFinite(value)) return "Ilimitado";
  return value.toLocaleString("pt-BR");
}

export function planMarketingFeatures(plan: PlanTier): string[] {
  const l = PLAN_LIMITS[plan];
  return [
    `${l.phones} número${l.phones > 1 ? "s" : ""} WhatsApp`,
    l.messagesPerMonth === Infinity
      ? "Mensagens ilimitadas"
      : `${formatPlanLimit(l.messagesPerMonth)} mensagens/mês`,
    `${formatPlanLimit(l.catalogItems)} itens no catálogo`,
    `${formatPlanLimit(l.appointmentsPerMonth)} agendamentos/mês`,
  ];
}

export const PLAN_PRICES = {
  STARTER: { brl: 97, label: "Starter" },
  PRO: { brl: 197, label: "Pro" },
  UNLIMITED: { brl: 397, label: "Unlimited" },
} as const;

export * from "./bot-menu.js";
