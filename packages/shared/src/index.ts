// ─── Intent detection keywords ────────────────────────────────────────────────

export const INTENT_KEYWORDS = {
  CATALOG: ["cardápio", "catálogo", "menu", "serviços", "produtos", "o que vocês fazem", "o que voces fazem"],
  APPOINTMENT: ["agendar", "marcar", "horário disponível", "horario disponivel", "quando tem", "quero marcar", "reservar", "agenda"],
  QUOTE: ["orçamento", "orcamento", "quanto custa", "valor", "preço", "preco", "tabela de preços"],
  PAYMENT: ["pix", "pagar", "pagamento", "sinal", "entrada", "link de pagamento"],
  FAQ: ["horário", "horario", "onde fica", "endereço", "endereco", "funcionamento", "abre", "fecha", "telefone", "contato"],
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
  STARTER: { phones: 1, messagesPerMonth: 500 },
  PRO: { phones: 3, messagesPerMonth: 5000 },
  UNLIMITED: { phones: 10, messagesPerMonth: Infinity },
} as const;

export const PLAN_PRICES = {
  STARTER: { brl: 97, label: "Starter" },
  PRO: { brl: 197, label: "Pro" },
  UNLIMITED: { brl: 397, label: "Unlimited" },
} as const;
