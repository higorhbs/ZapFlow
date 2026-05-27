import { doc, getDoc, setDoc } from "firebase/firestore";
import type { Tenant } from "./types.js";
import { getClientDb } from "./client.js";

function nowIso() {
  return new Date().toISOString();
}

export async function ensureClientTenant(
  id: string,
  data: { name: string; email: string }
): Promise<Tenant> {
  const ref = doc(getClientDb(), "tenants", id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as Tenant;
  }
  const ts = nowIso();
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);
  const tenant: Tenant = {
    id,
    name: data.name,
    email: data.email,
    plan: "STARTER",
    planStatus: "TRIALING",
    trialEndsAt: trialEnds.toISOString(),
    createdAt: ts,
    updatedAt: ts,
  };
  await setDoc(ref, tenant);
  return tenant;
}
