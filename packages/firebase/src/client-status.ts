import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import type { ScheduledStatus, ScheduledStatusMediaType } from "./types.js";
import { getClientDb } from "./client.js";

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

function businessRef(businessId: string) {
  return doc(getClientDb(), "businesses", businessId);
}

function scheduledStatusesCol(businessId: string) {
  return collection(getClientDb(), "businesses", businessId, "scheduledStatuses");
}

async function assertBusinessOwned(businessId: string, tenantId: string) {
  const snap = await getDoc(businessRef(businessId));
  if (!snap.exists() || snap.data().tenantId !== tenantId) {
    throw new Error("Negócio não encontrado ou sem acesso.");
  }
}

export async function listClientScheduledStatuses(
  businessId: string,
  tenantId: string
): Promise<ScheduledStatus[]> {
  await assertBusinessOwned(businessId, tenantId);
  const snap = await getDocs(query(scheduledStatusesCol(businessId), orderBy("scheduledAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, businessId, ...d.data() }) as ScheduledStatus);
}

export async function createClientScheduledStatus(
  businessId: string,
  tenantId: string,
  data: {
    mediaUrl: string;
    mediaType: ScheduledStatusMediaType;
    caption?: string;
    scheduledAt: string;
  }
): Promise<ScheduledStatus> {
  await assertBusinessOwned(businessId, tenantId);
  const at = new Date(data.scheduledAt).getTime();
  if (!Number.isFinite(at) || at <= Date.now() + 60_000) {
    throw new Error("Agende pelo menos 1 minuto no futuro.");
  }
  const id = newId();
  const ts = nowIso();
  const row: ScheduledStatus = {
    id,
    businessId,
    mediaUrl: data.mediaUrl,
    mediaType: data.mediaType,
    caption: data.caption?.trim() || undefined,
    scheduledAt: new Date(at).toISOString(),
    status: "scheduled",
    createdAt: ts,
    updatedAt: ts,
  };
  await setDoc(doc(scheduledStatusesCol(businessId), id), row);
  return row;
}

export async function cancelClientScheduledStatus(
  businessId: string,
  tenantId: string,
  statusId: string
) {
  await assertBusinessOwned(businessId, tenantId);
  const ref = doc(scheduledStatusesCol(businessId), statusId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Agendamento não encontrado.");
  const row = snap.data() as ScheduledStatus;
  if (row.status !== "scheduled") {
    throw new Error("Só é possível cancelar publicações ainda não enviadas.");
  }
  await updateDoc(ref, { status: "cancelled", updatedAt: nowIso() });
}
