import { getBusinessVocabulary } from "./business-vocabulary.js";

export type BotMenuAction = "APPOINTMENT" | "CATALOG" | "FAQ" | "PAYMENT" | "HUMAN" | "EXIT";

export interface BotMenuEntry {
  num: number;
  action: BotMenuAction;
  label: string;
}

export function buildBotMenuEntries(businessType?: string | null): BotMenuEntry[] {
  const v = getBusinessVocabulary(businessType);
  const entries: Omit<BotMenuEntry, "num">[] = [
    { action: "APPOINTMENT", label: v.botBookingMenuLabel },
    { action: "CATALOG", label: v.botCatalogMenuLabel },
    { action: "PAYMENT", label: "Pagar com PIX" },
    { action: "FAQ", label: "Dúvidas" },
    { action: "HUMAN", label: "Falar com atendente" },
  ];
  return entries.map((e, i) => ({ num: i + 1, ...e }));
}

export function formatBotMenuText(businessName: string, businessType?: string | null): string {
  const entries = buildBotMenuEntries(businessType);
  let text = `*Menu — ${businessName}*\n\n`;
  for (const e of entries) {
    text += `*${e.num}* — ${e.label}\n`;
  }
  text += `\n*0* — Sair\n\n`;
  text += `_Digite o número da opção desejada_`;
  return text;
}
