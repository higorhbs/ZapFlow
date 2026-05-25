/**
 * Motor de resposta automática do ZapFlow.
 * Recebe a mensagem, detecta intenção, busca dados do negócio e retorna resposta.
 */

import { prisma, Business, Conversation, ConversationStatus, MessageRole } from "@zapflow/database";
import { detectIntent, isOpenNow, WorkingHours, formatCurrency, DAY_LABELS, renderTemplate } from "@zapflow/shared";
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

export async function processMessage(ctx: BotContext): Promise<BotResponse[]> {
  const { businessId, customerPhone, customerName, messageBody } = ctx;
  const sessionKey = `${businessId}:${customerPhone}`;

  // Busca negócio com relacionamentos necessários
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      catalog: { where: { available: true }, orderBy: { sortOrder: "asc" } },
      faqs: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      autoReplies: { where: { active: true }, orderBy: { priority: "desc" } },
    },
  });

  if (!business) return [{ text: "Negócio não encontrado." }];

  // Garante conversa no banco
  const conversation = await upsertConversation(businessId, customerPhone, customerName);

  // Se atendente humano assumiu, não responde automaticamente
  if (conversation.status === ConversationStatus.ATTENDING) return [];

  // Salva mensagem do cliente
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: MessageRole.CUSTOMER,
      content: messageBody,
    },
  });

  // Verifica se está fora do horário
  const open = isOpenNow(business.workingHours as WorkingHours);
  if (!open) {
    const response = business.awayMsg;
    await saveAndReturn(conversation.id, [{ text: response }]);
    return [{ text: response }];
  }

  // Detecta intenção
  const intent = detectIntent(messageBody);
  const state = conversationState.get(sessionKey);

  // ─── Fluxo de agendamento (multi-step) ────────────────────────────────────
  if (state?.step === "APPOINTMENT_SERVICE") {
    return handleAppointmentService(ctx, business, conversation, state, sessionKey);
  }
  if (state?.step === "APPOINTMENT_DATE") {
    return handleAppointmentDate(ctx, business, conversation, state, sessionKey);
  }
  if (state?.step === "APPOINTMENT_TIME") {
    return handleAppointmentTime(ctx, business, conversation, state, sessionKey);
  }
  if (state?.step === "PAYMENT_AMOUNT") {
    return handlePaymentAmount(ctx, business, conversation, state, sessionKey);
  }

  // ─── Saudação (primeira mensagem) ─────────────────────────────────────────
  if (!state && isGreeting(messageBody)) {
    const text = renderTemplate(business.greetingMsg, {
      nome: customerName ?? "cliente",
      negocio: business.name,
    });
    const menu = buildMainMenu(business);
    await saveAndReturn(conversation.id, [{ text }, { text: menu }]);
    return [{ text }, { text: menu }];
  }

  // ─── Respostas por intenção ────────────────────────────────────────────────
  switch (intent) {
    case "CATALOG":
      return handleCatalog(business, conversation);

    case "APPOINTMENT":
      conversationState.set(sessionKey, { step: "APPOINTMENT_SERVICE", data: {} });
      return handleAppointmentStart(business, conversation);

    case "QUOTE":
      return handleQuote(business, conversation);

    case "PAYMENT":
      conversationState.set(sessionKey, { step: "PAYMENT_AMOUNT", data: { customerName: customerName ?? "Cliente" } });
      return handlePaymentStart(conversation);

    case "FAQ":
      return handleFAQ(messageBody, business, conversation);

    case "HUMAN":
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: ConversationStatus.ATTENDING },
      });
      const msg = "Certo! Vou chamar um atendente. Aguarde um momento... 👤";
      await saveAndReturn(conversation.id, [{ text: msg }]);
      return [{ text: msg }];

    default:
      // Verifica auto-replies customizadas por keyword
      for (const ar of business.autoReplies) {
        if (ar.keywords.some((kw) => messageBody.toLowerCase().includes(kw.toLowerCase()))) {
          const text = renderTemplate(ar.response, {
            nome: customerName ?? "cliente",
            negocio: business.name,
          });
          await saveAndReturn(conversation.id, [{ text }]);
          return [{ text }];
        }
      }

      // FAQ por similaridade de keywords
      const faqMatch = findFAQ(messageBody, business.faqs);
      if (faqMatch) {
        await saveAndReturn(conversation.id, [{ text: faqMatch.answer }]);
        return [{ text: faqMatch.answer }];
      }

      const fallback = "Não entendi muito bem. 😅 Digite *menu* para ver as opções disponíveis!";
      await saveAndReturn(conversation.id, [{ text: fallback }]);
      return [{ text: fallback }];
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleCatalog(business: any, conversation: Conversation): Promise<BotResponse[]> {
  if (!business.catalog.length) {
    const text = "Ainda não temos um catálogo cadastrado. Entre em contato para mais informações!";
    await saveAndReturn(conversation.id, [{ text }]);
    return [{ text }];
  }

  let text = `📋 *Cardápio/Serviços - ${business.name}*\n\n`;
  for (const item of business.catalog) {
    text += `• *${item.name}*`;
    if (item.description) text += ` — ${item.description}`;
    text += ` — *${formatCurrency(item.price)}*\n`;
  }
  text += "\nPara agendar, digite *agendar* 📅";

  await saveAndReturn(conversation.id, [{ text }]);
  return [{ text }];
}

async function handleAppointmentStart(business: any, conversation: Conversation): Promise<BotResponse[]> {
  let text = `📅 *Agendamento - ${business.name}*\n\nQual serviço você deseja agendar?\n\n`;
  business.catalog.forEach((item: any, i: number) => {
    text += `${i + 1}. ${item.name} — ${formatCurrency(item.price)}\n`;
  });
  text += "\nDigite o *número* do serviço:";
  await saveAndReturn(conversation.id, [{ text }]);
  return [{ text }];
}

async function handleAppointmentService(
  ctx: BotContext,
  business: any,
  conversation: Conversation,
  state: any,
  sessionKey: string
): Promise<BotResponse[]> {
  const index = parseInt(ctx.messageBody.trim()) - 1;
  if (isNaN(index) || index < 0 || index >= business.catalog.length) {
    const text = "Por favor, digite o *número* do serviço desejado.";
    await saveAndReturn(conversation.id, [{ text }]);
    return [{ text }];
  }

  const service = business.catalog[index];
  conversationState.set(sessionKey, {
    step: "APPOINTMENT_DATE",
    data: { serviceId: service.id, serviceName: service.name, servicePrice: String(service.price) },
  });

  const text = `Ótimo! *${service.name}* selecionado.\n\nQual data você prefere? (ex: *15/06* ou *amanhã*)`;
  await saveAndReturn(conversation.id, [{ text }]);
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
    await saveAndReturn(conversation.id, [{ text }]);
    return [{ text }];
  }

  state.data.date = date.toISOString();
  conversationState.set(sessionKey, { step: "APPOINTMENT_TIME", data: state.data });

  const text = `Data *${format(date, "dd/MM/yyyy", { locale: ptBR })}* selecionada!\n\nQual horário prefere? (ex: *10:00* ou *14:30*)`;
  await saveAndReturn(conversation.id, [{ text }]);
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
    await saveAndReturn(conversation.id, [{ text }]);
    return [{ text }];
  }

  const [, h, min] = match;
  const baseDate = new Date(state.data.date);
  baseDate.setHours(parseInt(h), parseInt(min), 0, 0);

  await prisma.appointment.create({
    data: {
      businessId: business.id,
      conversationId: conversation.id,
      customerPhone: ctx.customerPhone,
      customerName: ctx.customerName,
      serviceName: state.data.serviceName,
      serviceId: state.data.serviceId,
      scheduledAt: baseDate,
      status: "CONFIRMED",
    },
  });

  conversationState.delete(sessionKey);

  const text =
    `✅ *Agendamento confirmado!*\n\n` +
    `📋 Serviço: *${state.data.serviceName}*\n` +
    `📅 Data: *${format(baseDate, "dd/MM/yyyy", { locale: ptBR })}*\n` +
    `🕐 Horário: *${format(baseDate, "HH:mm")}*\n\n` +
    `Te esperamos! 😊 Qualquer dúvida é só chamar.`;

  await saveAndReturn(conversation.id, [{ text }]);
  return [{ text }];
}

async function handlePaymentStart(conversation: Conversation): Promise<BotResponse[]> {
  const text = "💰 *Cobrança via PIX*\n\nQual o valor do sinal? (ex: *50* ou *150,00*)";
  await saveAndReturn(conversation.id, [{ text }]);
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
    await saveAndReturn(conversation.id, [{ text }]);
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

    await prisma.payment.create({
      data: {
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
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
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

  await saveAndReturn(conversation.id, responses);
  return responses;
}

async function handleQuote(business: any, conversation: Conversation): Promise<BotResponse[]> {
  if (!business.catalog.length) {
    const text = "Você pode nos enviar mais detalhes sobre o que precisa para prepararmos um orçamento personalizado!";
    await saveAndReturn(conversation.id, [{ text }]);
    return [{ text }];
  }

  let text = `💰 *Tabela de Preços - ${business.name}*\n\n`;
  for (const item of business.catalog) {
    text += `• *${item.name}*: ${formatCurrency(item.price)}\n`;
    if (item.description) text += `  _${item.description}_\n`;
  }
  text += "\n Para agendar, digite *agendar* 📅";

  await saveAndReturn(conversation.id, [{ text }]);
  return [{ text }];
}

async function handleFAQ(messageBody: string, business: any, conversation: Conversation): Promise<BotResponse[]> {
  const faq = findFAQ(messageBody, business.faqs);
  if (faq) {
    await saveAndReturn(conversation.id, [{ text: faq.answer }]);
    return [{ text: faq.answer }];
  }

  let text = `❓ *Perguntas Frequentes - ${business.name}*\n\n`;
  business.faqs.forEach((f: any, i: number) => {
    text += `${i + 1}. ${f.question}\n`;
  });
  text += "\nDigite o *número* da pergunta ou faça sua pergunta diretamente:";

  await saveAndReturn(conversation.id, [{ text }]);
  return [{ text }];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMainMenu(business: any): string {
  return (
    `*Menu de opções:*\n\n` +
    `1️⃣  *catálogo* — Ver serviços e preços\n` +
    `2️⃣  *agendar* — Marcar horário\n` +
    `3️⃣  *orçamento* — Solicitar orçamento\n` +
    `4️⃣  *pix* — Pagamento via PIX\n` +
    `5️⃣  *dúvidas* — Perguntas frequentes\n` +
    `6️⃣  *atendente* — Falar com humano\n\n` +
    `_Digite a palavra-chave desejada_ 👆`
  );
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

async function upsertConversation(
  businessId: string,
  customerPhone: string,
  customerName?: string
): Promise<Conversation> {
  const existing = await prisma.conversation.findUnique({
    where: { businessId_customerPhone: { businessId, customerPhone } },
  });

  if (existing) {
    return prisma.conversation.update({
      where: { id: existing.id },
      data: { lastMessageAt: new Date(), customerName: customerName ?? existing.customerName },
    });
  }

  return prisma.conversation.create({
    data: { businessId, customerPhone, customerName, status: "OPEN" },
  });
}

async function saveAndReturn(conversationId: string, responses: BotResponse[]): Promise<void> {
  await prisma.message.createMany({
    data: responses.map((r) => ({
      conversationId,
      role: MessageRole.BOT,
      content: r.text,
    })),
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });
}
