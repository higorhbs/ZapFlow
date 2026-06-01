import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import type {
  Appointment,
  AppointmentStatus,
  Conversation,
  ConversationStatus,
  Message,
  Payment,
} from "./types.js";
import { getClientDb } from "./client.js";

function nowIso() {
  return new Date().toISOString();
}

function businessRef(businessId: string) {
  return doc(getClientDb(), "businesses", businessId);
}

function conversationsCol(businessId: string) {
  return collection(getClientDb(), "businesses", businessId, "conversations");
}

function messagesCol(businessId: string, conversationId: string) {
  return collection(getClientDb(), "businesses", businessId, "conversations", conversationId, "messages");
}

function appointmentsCol(businessId: string) {
  return collection(getClientDb(), "businesses", businessId, "appointments");
}

function paymentsCol(businessId: string) {
  return collection(getClientDb(), "businesses", businessId, "payments");
}

async function assertBusinessOwned(businessId: string, tenantId: string) {
  const snap = await getDoc(businessRef(businessId));
  if (!snap.exists() || snap.data().tenantId !== tenantId) {
    throw new Error("Negócio não encontrado ou sem acesso.");
  }
}

export async function listClientConversations(
  businessId: string,
  tenantId: string,
  opts?: { status?: ConversationStatus; page?: number; limit?: number }
) {
  await assertBusinessOwned(businessId, tenantId);
  let q = query(conversationsCol(businessId), orderBy("lastMessageAt", "desc"));
  if (opts?.status) q = query(q, where("status", "==", opts.status));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => ({ id: d.id, businessId, ...d.data() }) as Conversation);
  const page = opts?.page ?? 1;
  const pageLimit = opts?.limit ?? 20;
  const start = (page - 1) * pageLimit;
  const slice = all.slice(start, start + pageLimit);
  const withLast = await Promise.all(
    slice.map(async (c) => {
      const msgs = await getDocs(
        query(messagesCol(businessId, c.id), orderBy("createdAt", "desc"), limit(1))
      );
      const messages = msgs.docs.map((d) => ({
        id: d.id,
        conversationId: c.id,
        ...d.data(),
      })) as Message[];
      return { ...c, messages };
    })
  );
  return { conversations: withLast, total: all.length, page, limit: pageLimit };
}

export async function getClientConversation(
  businessId: string,
  tenantId: string,
  conversationId: string
) {
  await assertBusinessOwned(businessId, tenantId);
  const snap = await getDoc(doc(conversationsCol(businessId), conversationId));
  if (!snap.exists()) return null;
  const conversation = { id: snap.id, businessId, ...snap.data() } as Conversation;
  const [msgsSnap, aptsSnap, paysSnap] = await Promise.all([
    getDocs(query(messagesCol(businessId, conversationId), orderBy("createdAt", "asc"))),
    getDocs(query(appointmentsCol(businessId), where("conversationId", "==", conversationId))),
    getDocs(query(paymentsCol(businessId), where("conversationId", "==", conversationId))),
  ]);
  return {
    ...conversation,
    messages: msgsSnap.docs.map((d) => ({ id: d.id, conversationId, ...d.data() }) as Message),
    appointments: aptsSnap.docs.map((d) => ({ id: d.id, businessId, ...d.data() }) as Appointment),
    payments: paysSnap.docs.map((d) => ({ id: d.id, businessId, ...d.data() }) as Payment),
  };
}

export async function deleteClientConversation(
  businessId: string,
  tenantId: string,
  conversationId: string
) {
  await assertBusinessOwned(businessId, tenantId);
  const convRef = doc(conversationsCol(businessId), conversationId);
  const snap = await getDoc(convRef);
  if (!snap.exists()) throw new Error("Conversa não encontrada.");

  const msgsSnap = await getDocs(messagesCol(businessId, conversationId));
  const db = getClientDb();
  const chunk = 400;
  for (let i = 0; i < msgsSnap.docs.length; i += chunk) {
    const batch = writeBatch(db);
    for (const d of msgsSnap.docs.slice(i, i + chunk)) {
      batch.delete(d.ref);
    }
    await batch.commit();
  }
  await deleteDoc(convRef);
}

export async function updateClientConversationStatus(
  businessId: string,
  tenantId: string,
  conversationId: string,
  status: ConversationStatus
) {
  await assertBusinessOwned(businessId, tenantId);
  const ref = doc(conversationsCol(businessId), conversationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Conversa não encontrada.");
  await updateDoc(ref, { status, lastMessageAt: nowIso() });
  return { id: conversationId, businessId, ...snap.data(), status } as Conversation;
}

export async function listClientAppointments(
  businessId: string,
  tenantId: string,
  opts?: { from?: string; to?: string; status?: AppointmentStatus }
) {
  await assertBusinessOwned(businessId, tenantId);
  const snap = await getDocs(query(appointmentsCol(businessId), orderBy("scheduledAt", "asc")));
  let list = snap.docs.map((d) => ({ id: d.id, businessId, ...d.data() }) as Appointment);
  if (opts?.status) list = list.filter((a) => a.status === opts.status);
  if (opts?.from) list = list.filter((a) => a.scheduledAt >= opts.from!);
  if (opts?.to) list = list.filter((a) => a.scheduledAt <= opts.to!);
  return list;
}

export async function updateClientAppointment(
  businessId: string,
  tenantId: string,
  appointmentId: string,
  data: Partial<Pick<Appointment, "status" | "scheduledAt" | "notes">>
) {
  await assertBusinessOwned(businessId, tenantId);
  const ref = doc(appointmentsCol(businessId), appointmentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Agendamento não encontrado.");
  const patch = { ...data, updatedAt: nowIso() };
  await updateDoc(ref, patch);
  return { id: appointmentId, businessId, ...snap.data(), ...patch } as Appointment;
}

export async function listClientPayments(businessId: string, tenantId: string, max = 50) {
  await assertBusinessOwned(businessId, tenantId);
  const snap = await getDocs(query(paymentsCol(businessId), orderBy("createdAt", "desc"), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, businessId, ...d.data() }) as Payment);
}

export async function getClientAnalytics(businessId: string, tenantId: string) {
  await assertBusinessOwned(businessId, tenantId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const [convSnap, aptSnap, paySnap] = await Promise.all([
    getDocs(conversationsCol(businessId)),
    getDocs(appointmentsCol(businessId)),
    getDocs(paymentsCol(businessId)),
  ]);

  const conversations = convSnap.docs.map((d) => d.data());
  const appointments = aptSnap.docs.map((d) => d.data());
  const payments = paySnap.docs.map((d) => d.data());

  let totalMessages = 0;
  let monthMessages = 0;
  for (const c of convSnap.docs) {
    const msgs = await getDocs(messagesCol(businessId, c.id));
    totalMessages += msgs.size;
    monthMessages += msgs.docs.filter((m) => (m.data().createdAt as string) >= monthStart).length;
  }

  const monthConversations = conversations.filter(
    (c) => c.createdAt >= monthStart && c.createdAt <= monthEnd
  ).length;
  const lastMonthConversations = conversations.filter(
    (c) => c.createdAt >= lastMonthStart && c.createdAt <= lastMonthEnd
  ).length;

  const revenueThisMonth = payments
    .filter((p) => p.status === "PAID" && p.paidAt && p.paidAt >= monthStart && p.paidAt <= monthEnd)
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);

  const conversationGrowth =
    lastMonthConversations > 0
      ? Math.round(((monthConversations - lastMonthConversations) / lastMonthConversations) * 100)
      : 100;

  return {
    conversations: {
      total: conversations.length,
      open: conversations.filter((c) => c.status === "OPEN").length,
      thisMonth: monthConversations,
      growth: conversationGrowth,
    },
    messages: { total: totalMessages, thisMonth: monthMessages },
    appointments: {
      pending: appointments.filter((a) => a.status === "PENDING" || a.status === "CONFIRMED").length,
      thisMonth: appointments.filter(
        (a) => a.scheduledAt >= monthStart && a.scheduledAt <= monthEnd
      ).length,
    },
    payments: {
      pending: payments.filter((p) => p.status === "PENDING").length,
      revenueThisMonth,
    },
  };
}
