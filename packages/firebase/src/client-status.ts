import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import type { ScheduledStatus, ScheduledStatusMediaType } from "./types.js";
import { buildScheduledAtsFromDayKeys } from "./schedule-status-dates.js";
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

export type CreateScheduledStatusInput = {
  mediaUrl: string;
  mediaType: ScheduledStatusMediaType;
  caption?: string;
  scheduledDays: string[];
  hour: number;
  minute: number;
};

export async function createClientScheduledStatuses(
  businessId: string,
  tenantId: string,
  data: {
    mediaUrl: string;
    mediaType: ScheduledStatusMediaType;
    caption?: string;
    scheduledAts: string[];
    sourceStatusId?: string;
    seriesId?: string;
  }
): Promise<ScheduledStatus[]> {
  await assertBusinessOwned(businessId, tenantId);
  if (!data.scheduledAts.length) throw new Error("Informe pelo menos um horário.");

  const seriesId = data.seriesId ?? (data.scheduledAts.length > 1 ? newId() : undefined);
  const ts = nowIso();
  const batch = writeBatch(getClientDb());
  const rows: ScheduledStatus[] = [];

  for (const scheduledAt of data.scheduledAts) {
    const at = new Date(scheduledAt).getTime();
    if (!Number.isFinite(at) || at <= Date.now() + 60_000) {
      throw new Error("Todos os horários devem ser pelo menos 1 minuto no futuro.");
    }
    const id = newId();
    const row: ScheduledStatus = {
      id,
      businessId,
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      caption: data.caption?.trim() || undefined,
      scheduledAt: new Date(at).toISOString(),
      status: "scheduled",
      seriesId,
      sourceStatusId: data.sourceStatusId,
      createdAt: ts,
      updatedAt: ts,
    };
    batch.set(doc(scheduledStatusesCol(businessId), id), row);
    rows.push(row);
  }

  await batch.commit();
  return rows.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export async function createClientScheduledStatus(
  businessId: string,
  tenantId: string,
  input: CreateScheduledStatusInput
): Promise<ScheduledStatus[]> {
  const scheduledAts = buildScheduledAtsFromDayKeys(
    input.scheduledDays,
    input.hour,
    input.minute
  );

  return createClientScheduledStatuses(businessId, tenantId, {
    mediaUrl: input.mediaUrl,
    mediaType: input.mediaType,
    caption: input.caption,
    scheduledAts,
  });
}

const REPOSTABLE: ScheduledStatus["status"][] = ["published", "failed", "cancelled"];

export async function repostClientScheduledStatus(
  businessId: string,
  tenantId: string,
  sourceStatusId: string,
  input: { scheduledDays: string[]; hour: number; minute: number }
): Promise<ScheduledStatus[]> {
  await assertBusinessOwned(businessId, tenantId);
  const ref = doc(scheduledStatusesCol(businessId), sourceStatusId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Status não encontrado.");
  const source = { id: snap.id, businessId, ...snap.data() } as ScheduledStatus;
  if (!REPOSTABLE.includes(source.status)) {
    throw new Error("Só é possível reagendar status já publicados, cancelados ou com falha.");
  }
  if (!source.mediaUrl) throw new Error("Arte original indisponível para reagendar.");

  const scheduledAts = buildScheduledAtsFromDayKeys(
    input.scheduledDays,
    input.hour,
    input.minute
  );

  return createClientScheduledStatuses(businessId, tenantId, {
    mediaUrl: source.mediaUrl,
    mediaType: source.mediaType,
    caption: source.caption,
    scheduledAts,
    sourceStatusId: source.id,
  });
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

export async function cancelClientScheduledStatusSeries(
  businessId: string,
  tenantId: string,
  seriesId: string
) {
  await assertBusinessOwned(businessId, tenantId);
  const snap = await getDocs(query(scheduledStatusesCol(businessId), orderBy("scheduledAt", "asc")));
  const pending = snap.docs.filter((d) => {
    const row = d.data() as ScheduledStatus;
    return row.seriesId === seriesId && row.status === "scheduled";
  });
  if (!pending.length) throw new Error("Nenhum agendamento pendente nesta série.");
  const batch = writeBatch(getClientDb());
  const ts = nowIso();
  for (const d of pending) {
    batch.update(d.ref, { status: "cancelled", updatedAt: ts });
  }
  await batch.commit();
}
