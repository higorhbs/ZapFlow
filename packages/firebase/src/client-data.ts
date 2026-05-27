import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import type { Business, BusinessType, CatalogItem, FAQ } from "./types.js";
import { getClientDb } from "./client.js";

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

function businessesCol() {
  return collection(getClientDb(), "businesses");
}

function businessRef(id: string) {
  return doc(getClientDb(), "businesses", id);
}

function catalogCol(businessId: string) {
  return collection(getClientDb(), "businesses", businessId, "catalog");
}

function faqsCol(businessId: string) {
  return collection(getClientDb(), "businesses", businessId, "faqs");
}

export async function listClientBusinesses(tenantId: string): Promise<Business[]> {
  const q = query(businessesCol(), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Business);
}

export async function getClientBusiness(id: string, tenantId: string): Promise<Business | null> {
  const snap = await getDoc(businessRef(id));
  if (!snap.exists()) return null;
  const b = { id: snap.id, ...snap.data() } as Business;
  return b.tenantId === tenantId ? b : null;
}

export async function createClientBusiness(
  tenantId: string,
  data: {
    name: string;
    type: BusinessType;
    phone: string;
    address?: string;
    description?: string;
    greetingMsg?: string;
    awayMsg?: string;
    workingHours?: Record<string, unknown>;
  }
): Promise<Business> {
  const id = newId();
  const ts = nowIso();
  const business: Business = {
    id,
    tenantId,
    name: data.name,
    type: data.type,
    phone: data.phone,
    address: data.address,
    description: data.description,
    workingHours: data.workingHours ?? {},
    greetingMsg: data.greetingMsg ?? "Olá! Como posso ajudar?",
    awayMsg: data.awayMsg ?? "No momento estamos fechados. Em breve retornaremos!",
    isConnected: false,
    createdAt: ts,
    updatedAt: ts,
  };
  await setDoc(businessRef(id), business);
  return business;
}

export async function updateClientBusiness(
  id: string,
  tenantId: string,
  data: Partial<Business>
): Promise<Business | null> {
  const exists = await getClientBusiness(id, tenantId);
  if (!exists) return null;
  const patch = { ...data, updatedAt: nowIso() };
  delete (patch as { id?: string }).id;
  delete (patch as { tenantId?: string }).tenantId;
  await updateDoc(businessRef(id), patch);
  return { ...exists, ...patch } as Business;
}

export async function listClientCatalog(businessId: string): Promise<CatalogItem[]> {
  const q = query(catalogCol(businessId), orderBy("sortOrder", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, businessId, ...d.data() }) as CatalogItem);
}

export async function createClientCatalogItem(
  businessId: string,
  data: Omit<CatalogItem, "id" | "businessId" | "createdAt">
): Promise<CatalogItem> {
  const id = newId();
  const item: CatalogItem = { id, businessId, createdAt: nowIso(), ...data };
  await setDoc(doc(catalogCol(businessId), id), item);
  return item;
}

export async function updateClientCatalogItem(
  businessId: string,
  itemId: string,
  data: Partial<CatalogItem>
): Promise<CatalogItem | null> {
  const ref = doc(catalogCol(businessId), itemId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  await updateDoc(ref, data);
  return { id: itemId, businessId, ...snap.data(), ...data } as CatalogItem;
}

export async function deleteClientCatalogItem(businessId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(catalogCol(businessId), itemId));
}

export async function listClientFaqs(businessId: string): Promise<FAQ[]> {
  const q = query(faqsCol(businessId), orderBy("sortOrder", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, businessId, ...d.data() }) as FAQ);
}

export async function createClientFaq(
  businessId: string,
  data: Omit<FAQ, "id" | "businessId" | "createdAt">
): Promise<FAQ> {
  const id = newId();
  const faq: FAQ = { id, businessId, createdAt: nowIso(), ...data };
  await setDoc(doc(faqsCol(businessId), id), faq);
  return faq;
}

export async function deleteClientFaq(businessId: string, faqId: string): Promise<void> {
  await deleteDoc(doc(faqsCol(businessId), faqId));
}
