/**
 * Motor de resposta automática do ZapFlow.
 * Recebe a mensagem, detecta intenção, busca dados do negócio e retorna resposta.
 */

import type { BusinessWithRelations, Conversation } from "@zapflow/firebase";
import {
  getBusinessForBot,
  getTenant,
  listAppointments,
  upsertConversation,
  createMessage,
  createMessages,
  updateConversationStatus,
  createAppointment,
  createPayment,
} from "@zapflow/firebase";
import {
  detectIntent,
  isOpenNow,
  WorkingHours,
  formatCurrency,
  DAY_LABELS,
  renderTemplate,
  parseOptionNumber,
  isMenuRequest,
  isExitCommand,
  buildBotMenuEntries,
  formatBotMenuText,
  type BotMenuAction,
  PLAN_LIMITS,
} from "@zapflow/shared";
import { createPixCharge } from "./pix";
import { addMinutes, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface BotContext {
  businessId: string;
  customerPhone: string;
  customerName?: string;
  messageBody: string;
}

export interface BotResponse {
  text: string;
  imageUrl?: string;
}

// Estado simples de conversa por sessão (em memória — para MVP)
// Em produção: usar Redis com TTL
const conversationState = new Map<string, { step: string; data: Record<string, string> }>();
const botPausedSessions = new Set<string>();

export async function processMessage(ctx: BotContext): Promise<BotResponse[]> {
  const { businessId, customerPhone, customerName, messageBody } = ctx;
  const sessionKey = `${businessId}:${customerPhone}`;

  // Busca negócio com relacionamentos necessários
  const business = await getBusinessForBot(businessId);

  if (!business) return [{ text: "Negócio não encontrado." }];

  const conversation = await upsertConversation(businessId, customerPhone, customerName);

  await createMessage(businessId, conversation.id, {
    role: "CUSTOMER",
    content: messageBody,
  });

  if (conversation.status === "ATTENDING" && !isExitCommand(messageBody)) return [];

  const open = isOpenNow(business.workingHours as WorkingHours);

  if (isExitCommand(messageBody)) {
    return handleBotExit(business, conversation, sessionKey);
  }

  if (botPausedSessions.has(sessionKey)) {
    botPausedSessions.delete(sessionKey);
    if (!open) {
      const response = business.awayMsg;
      await saveAndReturn(business.id, conversation.id, [{ text: response }]);
      return [{ text: response }];
    }
    return sendPresentation(business, conversation, customerName);
  }

  if (!open) {
    const response = business.awayMsg;
    await saveAndReturn(business.id, conversation.id, [{ text: response }]);
    return [{ text: response }];
  }

  const intent = detectIntent(messageBody);
  const state = conversationState.get(sessionKey);

  // ─── Fluxo de agendamento (multi-step) ────────────────────────────────────
  if (state?.step === "APPOINTMENT_DATE") {
    return handleAppointmentDate(ctx, business, conversation, state, sessionKey);
  }
  if (state?.step === "APPOINTMENT_TIME") {
    return handleAppointmentTime(ctx, business, conversation, state, sessionKey);
  }
  if (state?.step === "PAYMENT_AMOUNT") {
    return handlePaymentAmount(ctx, business, conversation, state, sessionKey);
  }
  if (state?.step === "FAQ_SELECT") {
    return handleFAQSelect(ctx, business, conversation, sessionKey);
  }

  if (isMenuRequest(messageBody)) {
    const menu = buildMainMenu(business);
    await saveAndReturn(business.id, conversation.id, [{ text: menu }]);
    return [{ text: menu }];
  }

  const menuAction = resolveMenuAction(messageBody, business);
  if (menuAction) {
    return routeMenuAction(menuAction, ctx, business, conversation, sessionKey);
  }

  if (!state && isGreeting(messageBody)) {
    return sendPresentation(business, conversation, customerName);
  }

  // ─── Respostas por intenção ────────────────────────────────────────────────
  switch (intent) {
    case "CATALOG":
      return handleCatalog(business, conversation);

    case "APPOINTMENT":
      return startAppointmentFlow(business, conversation, sessionKey);

    case "QUOTE":
      return handleQuote(business, conversation);

    case "PAYMENT":
      conversationState.set(sessionKey, { step: "PAYMENT_AMOUNT", data: { customerName: customerName ?? "Cliente" } });
      return handlePaymentStart(conversation);

    case "FAQ":
      return handleFAQ(messageBody, business, conversation, sessionKey);

    case "HUMAN":
      await updateConversationStatus(businessId, conversation.id, "ATTENDING");
      return saveHumanHandoff(businessId, conversation.id);

    default:
      const faqMatch = findFAQ(messageBody, business.faqs);
      if (faqMatch) {
        await saveAndReturn(business.id, conversation.id, [{ text: faqMatch.answer }]);
        return [{ text: faqMatch.answer }];
      }

      const fallback = buildFallbackMessage();
      await saveAndReturn(business.id, conversation.id, [{ text: fallback }]);
      return [{ text: fallback }];
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleCatalog(business: any, conversation: Conversation): Promise<BotResponse[]> {
  if (!business.catalog.length) {
    const text =
      "Ainda não há itens no *Catálogo*.\n\nCadastre serviços no painel ZapFlow (menu Catálogo) para exibir aqui.";
    await saveAndReturn(business.id, conversation.id, [{ text }]);
    return [{ text }];
  }

  let text = `📋 *Catálogo — ${business.name}*\n\n`;
  for (const item of business.catalog) {
    text += `• *${item.name}*`;
    if (item.description) text += ` — ${item.description}`;
    text += ` — *${formatCurrency(item.price)}*\n`;
  }
  text += "\nPara agendar, digite *1* (Agendamentos) no menu ou *agendar* 📅";

  await saveAndReturn(business.id, conversation.id, [{ text }]);
  return [{ text }];
}

async function startAppointmentFlow(
  business: any,
  conversation: Conversation,
  sessionKey: string
): Promise<BotResponse[]> {
  conversationState.set(sessionKey, {
    step: "APPOINTMENT_DATE",
    data: { serviceName: "Agendamento" },
  });
  const text =
    `📅 *Agendamentos — ${business.name}*\n\n` +
    `Qual data você prefere? (ex: *15/06* ou *amanhã*)`;
  await saveAndReturn(business.id, conversation.id, [{ text }]);
  return [{ text }];
}

async function handleAppointmentDate(
  ctx: BotContext,
  business: any,
  conversation: Conversation,
  state: any,
  sessionKey: string
): Promise<BotResponse[]> {
  const dateStr = ctx.messageBody.trim();
  // Parse simples: dd/MM
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  let date: Date | null = null;

  if (match) {
    const [, d, m] = match;
    const year = new Date().getFullYear();
    date = new Date(year, parseInt(m) - 1, parseInt(d));
  } else if (dateStr.toLowerCase().includes("amanhã")) {
    date = new Date();
    date.setDate(date.getDate() + 1);
  }

  if (!date || isNaN(date.getTime())) {
    const text = "Não entendi a data. Por favor, informe no formato *dd/mm* (ex: *15/06*)";
    await saveAndReturn(business.id, conversation.id, [{ text }]);
    return [{ text }];
  }

  state.data.date = date.toISOString();
  conversationState.set(sessionKey, { step: "APPOINTMENT_TIME", data: state.data });

  const text = `Data *${format(date, "dd/MM/yyyy", { locale: ptBR })}* selecionada!\n\nQual horário prefere? (ex: *10:00* ou *14:30*)`;
  await saveAndReturn(business.id, conversation.id, [{ text }]);
  return [{ text }];
}

async function handleAppointmentTime(
  ctx: BotContext,
  business: any,
  conversation: Conversation,
  state: any,
  sessionKey: string
): Promise<BotResponse[]> {
  const timeStr = ctx.messageBody.trim();
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);

  if (!match) {
    const text = "Por favor, informe o horário no formato *HH:MM* (ex: *10:00*)";
    await saveAndReturn(business.id, conversation.id, [{ text }]);
    return [{ text }];
  }

  const [, h, min] = match;
  const baseDate = new Date(state.data.date);
  baseDate.setHours(parseInt(h), parseInt(min), 0, 0);

  const tenant = await getTenant(business.tenantId);
  const plan = tenant?.plan ?? "STARTER";
  const monthlyLimit = PLAN_LIMITS[plan].appointmentsPerMonth;
  if (Number.isFinite(monthlyLimit)) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    const monthAppointments = await listAppointments(business.id, { from, to });
    if (monthAppointments.length >= monthlyLimit) {
      const text =
        `Limite de agendamentos do plano *${plan}* atingido neste mês (${monthlyLimit}).\n` +
        `Faça upgrade para continuar recebendo agendamentos automáticos.`;
      await saveAndReturn(business.id, conversation.id, [{ text }]);
      return [{ text }];
    }
  }

  const appointment = await createAppointment({
    businessId: business.id,
    conversationId: conversation.id,
    customerPhone: ctx.customerPhone,
    customerName: ctx.customerName,
    serviceName: state.data.serviceName || "Agendamento",
    scheduledAt: baseDate.toISOString(),
    durationMins: 60,
    status: "CONFIRMED",
  });

  conversationState.delete(sessionKey);

  const text =
    `✅ *Agendamento confirmado!*\n\n` +
    `📅 Data: *${format(baseDate, "dd/MM/yyyy", { locale: ptBR })}*\n` +
    `🕐 Horário: *${format(baseDate, "HH:mm")}*\n` +
    `🔖 Código: *${appointment.id.slice(0, 8)}*\n\n` +
    `Te esperamos! 😊 Qualquer dúvida é só chamar.`;

  await saveAndReturn(business.id, conversation.id, [{ text }]);
  return [{ text }];
}

async function handlePaymentStart(conversation: Conversation): Promise<BotResponse[]> {
  const text = "💰 *Cobrança via PIX*\n\nQual o valor do sinal? (ex: *50* ou *150,00*)";
  await saveAndReturn(conversation.businessId, conversation.id, [{ text }]);
  return [{ text }];
}

async function handlePaymentAmount(
  ctx: BotContext,
  business: any,
  conversation: Conversation,
  state: any,
  sessionKey: string
): Promise<BotResponse[]> {
  const raw = ctx.messageBody.replace(/[R$\s]/g, "").replace(",", ".");
  const amount = parseFloat(raw);

  if (isNaN(amount) || amount <= 0) {
    const text = "Por favor, informe o valor corretamente (ex: *50* ou *150,00*)";
    await saveAndReturn(business.id, conversation.id, [{ text }]);
    return [{ text }];
  }

  conversationState.delete(sessionKey);

  let responses: BotResponse[];

  try {
    const pix = await createPixCharge({
      customerName: state.data.customerName ?? ctx.customerName ?? "Cliente",
      customerPhone: ctx.customerPhone,
      description: `Sinal - ${business.name}`,
      amount,
      externalRef: conversation.id,
    });

    await createPayment({
      businessId: business.id,
      conversationId: conversation.id,
      customerPhone: ctx.customerPhone,
      customerName: ctx.customerName,
      description: `Sinal - ${business.name}`,
      amount,
      pixQrCode: pix.pixQrCode,
      pixCopyPaste: pix.pixCopyPaste,
      asaasId: pix.asaasId,
      status: "PENDING",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const text =
      `💳 *PIX gerado com sucesso!*\n\n` +
      `Valor: *${formatCurrency(amount)}*\n\n` +
      `*Copia e cola:*\n\`${pix.pixCopyPaste}\`\n\n` +
      `O QR Code foi enviado na mensagem anterior. Validade: 3 dias.`;

    responses = [{ text, imageUrl: `data:image/png;base64,${pix.pixQrCode}` }];
  } catch (err) {
    // Fallback: sem Asaas configurado, só informa
    const text =
      `💳 *Cobrança de ${formatCurrency(amount)}*\n\n` +
      `Para processar o PIX, configure sua chave Asaas nas configurações do sistema.\n\n` +
      `[Modo demonstração ativo]`;
    responses = [{ text }];
  }

  await saveAndReturn(business.id, conversation.id, responses);
  return responses;
}

async function handleQuote(business: any, conversation: Conversation): Promise<BotResponse[]> {
  if (!business.catalog.length) {
    const text = "Você pode nos enviar mais detalhes sobre o que precisa para prepararmos um orçamento personalizado!";
    await saveAndReturn(business.id, conversation.id, [{ text }]);
    return [{ text }];
  }

  let text = `💰 *Tabela de Preços - ${business.name}*\n\n`;
  for (const item of business.catalog) {
    text += `• *${item.name}*: ${formatCurrency(item.price)}\n`;
    if (item.description) text += `  _${item.description}_\n`;
  }
  text += "\n Para agendar, digite *agendar* 📅";

  await saveAndReturn(business.id, conversation.id, [{ text }]);
  return [{ text }];
}

async function handleFAQ(
  messageBody: string,
  business: any,
  conversation: Conversation,
  sessionKey: string
): Promise<BotResponse[]> {
  if (!business.faqs?.length) {
    const text =
      "Ainda não há perguntas no *FAQ*.\n\nCadastre no painel ZapFlow (menu FAQ) para o bot responder automaticamente.";
    await saveAndReturn(business.id, conversation.id, [{ text }]);
    return [{ text }];
  }

  const faq = findFAQ(messageBody, business.faqs);
  if (faq) {
    await saveAndReturn(business.id, conversation.id, [{ text: faq.answer }]);
    return [{ text: faq.answer }];
  }

  let text = `❓ *FAQ — ${business.name}*\n\n`;
  business.faqs.forEach((f: any, i: number) => {
    text += `${i + 1}. ${f.question}\n`;
  });
  text += "\nDigite o *número* da pergunta (ex: *1*) ou escreva sua dúvida:";

  conversationState.set(sessionKey, { step: "FAQ_SELECT", data: {} });
  await saveAndReturn(business.id, conversation.id, [{ text }]);
  return [{ text }];
}

async function handleFAQSelect(
  ctx: BotContext,
  business: any,
  conversation: Conversation,
  sessionKey: string
): Promise<BotResponse[]> {
  const faqs = business.faqs ?? [];
  const choice = parseOptionNumber(ctx.messageBody, 1, faqs.length);

  if (choice === null) {
    const byKeyword = findFAQ(ctx.messageBody, faqs);
    if (byKeyword) {
      conversationState.delete(sessionKey);
      await saveAndReturn(business.id, conversation.id, [{ text: byKeyword.answer }]);
      return [{ text: byKeyword.answer }];
    }
    const text = `Digite o *número* de *1* a *${faqs.length}* ou *menu* para voltar.`;
    await saveAndReturn(business.id, conversation.id, [{ text }]);
    return [{ text }];
  }

  const faq = faqs[choice - 1];
  conversationState.delete(sessionKey);
  await saveAndReturn(business.id, conversation.id, [{ text: faq.answer }]);
  return [{ text: faq.answer }];
}

function resolveMenuAction(text: string, business?: { botMenu?: unknown[] }): BotMenuAction | null {
  if (isExitCommand(text) || parseOptionNumber(text, 0, 0) === 0) return "EXIT";
  const entries = (business?.botMenu && business.botMenu.length > 0)
    ? (business.botMenu as Array<{ action: BotMenuAction; enabled: boolean }>)
        .filter((e) => e.enabled !== false)
    : buildBotMenuEntries();
  const num = parseOptionNumber(text, 1, entries.length);
  if (num === null) return null;
  return entries[num - 1].action;
}

async function routeMenuAction(
  action: BotMenuAction,
  ctx: BotContext,
  business: any,
  conversation: Conversation,
  sessionKey: string
): Promise<BotResponse[]> {
  switch (action) {
    case "EXIT":
      return handleBotExit(business, conversation, sessionKey);
    case "CATALOG":
      return handleCatalog(business, conversation);
    case "APPOINTMENT":
      return startAppointmentFlow(business, conversation, sessionKey);
    case "FAQ":
      return handleFAQ(ctx.messageBody, business, conversation, sessionKey);
    case "HUMAN":
      await updateConversationStatus(business.id, conversation.id, "ATTENDING");
      return saveHumanHandoff(business.id, conversation.id);
    default:
      return [{ text: buildMainMenu(business) }];
  }
}

async function saveHumanHandoff(businessId: string, conversationId: string): Promise<BotResponse[]> {
  const msg = "Certo! Vou chamar um atendente. Aguarde um momento... 👤";
  await saveAndReturn(businessId, conversationId, [{ text: msg }]);
  return [{ text: msg }];
}

async function handleBotExit(
  business: any,
  conversation: Conversation,
  sessionKey: string
): Promise<BotResponse[]> {
  conversationState.delete(sessionKey);
  botPausedSessions.add(sessionKey);
  if (conversation.status === "ATTENDING") {
    await updateConversationStatus(business.id, conversation.id, "OPEN");
  }
  const text =
    "👋 *Atendimento automático encerrado.*\n\n" +
    "Quando quiser voltar, envie qualquer mensagem que eu te apresento o menu novamente.";
  await saveAndReturn(business.id, conversation.id, [{ text }]);
  return [{ text }];
}

async function sendPresentation(
  business: any,
  conversation: Conversation,
  customerName?: string
): Promise<BotResponse[]> {
  const text = renderTemplate(business.greetingMsg, {
    nome: customerName ?? "cliente",
    negocio: business.name,
  });
  const menu = buildMainMenu(business);
  await saveAndReturn(business.id, conversation.id, [{ text }, { text: menu }]);
  return [{ text }, { text: menu }];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_EMOJI: Record<string, string> = {
  APPOINTMENT: "📅",
  CATALOG: "🛍️",
  FAQ: "❓",
  HUMAN: "👤",
};

function buildMainMenu(business: { name: string; botMenu?: unknown[] }): string {
  if (business.botMenu && business.botMenu.length > 0) {
    const entries = (business.botMenu as Array<{ num: number; action: string; label: string; enabled: boolean }>)
      .filter((e) => e.enabled !== false)
      .map((e, i) => ({ ...e, num: i + 1 }));
    let text = `*Menu — ${business.name}*\n\n`;
    for (const e of entries) {
      const emoji = ACTION_EMOJI[e.action] ?? "";
      text += `*${e.num}* — ${emoji} ${e.label}\n`;
    }
    text += `\n*0* — 👋 Sair\n\n`;
    text += `_Palavras: agendar, catálogo, dúvida, atendente_`;
    return text;
  }
  return formatBotMenuText(business.name);
}

function buildFallbackMessage(): string {
  return "Não entendi. 😅\n\nDigite *1* a *4*, *menu* ou *sair*.";
}

function isGreeting(text: string): boolean {
  const greetings = ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "hello", "hi", "menu"];
  return greetings.some((g) => text.toLowerCase().trim().startsWith(g));
}

function findFAQ(text: string, faqs: any[]): any | null {
  const normalized = text.toLowerCase();
  for (const faq of faqs) {
    if (faq.keywords.some((kw: string) => normalized.includes(kw.toLowerCase()))) {
      return faq;
    }
  }
  return null;
}

async function saveAndReturn(
  businessId: string,
  conversationId: string,
  responses: BotResponse[]
): Promise<void> {
  await createMessages(
    businessId,
    conversationId,
    responses.map((r) => ({ role: "BOT", content: r.text }))
  );
}
