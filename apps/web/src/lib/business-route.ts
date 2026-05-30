import type { BusinessType } from "@zapflow/shared";

type BusinessSnapshot = { id: string; type: BusinessType };
type BusinessRow = { id: string; type?: BusinessType };

export const HOSTING_PLACEHOLDER_BUSINESS_ID = "app";
const ID_KEY = "zapflow:activeBusinessId";
const TYPE_KEY = "zapflow:activeBusinessType";

export function pathBusinessSegment(pathname: string): string | undefined {
  const id = pathname.match(/\/businesses\/([^/]+)/)?.[1];
  if (!id || id === "new") return undefined;
  return id;
}

export function inBusinessArea(pathname: string): boolean {
  return /\/businesses\/[^/]+/.test(pathname);
}

export function readStoredBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = sessionStorage.getItem(ID_KEY);
    return id && id !== HOSTING_PLACEHOLDER_BUSINESS_ID ? id : null;
  } catch {
    return null;
  }
}

export function readStoredBusinessType(): BusinessType | null {
  if (typeof window === "undefined") return null;
  try {
    const t = sessionStorage.getItem(TYPE_KEY);
    return t ? (t as BusinessType) : null;
  } catch {
    return null;
  }
}

export function clearBusinessSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ID_KEY);
    sessionStorage.removeItem(TYPE_KEY);
    document.documentElement.removeAttribute("data-business-type");
  } catch {
    /* ignore */
  }
}

const AUTH_UID_KEY = "zapflow:lastAuthUid";

export function readLastAuthUid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(AUTH_UID_KEY);
  } catch {
    return null;
  }
}

export function writeLastAuthUid(uid: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (uid) sessionStorage.setItem(AUTH_UID_KEY, uid);
    else sessionStorage.removeItem(AUTH_UID_KEY);
  } catch {
    /* ignore */
  }
}

export function clearAuthSessionMarkers() {
  clearBusinessSession();
  writeLastAuthUid(null);
}

function ownsBusiness(id: string, businesses: BusinessRow[] | undefined): boolean {
  return Boolean(id && businesses?.some((b) => b.id === id));
}

export function persistBusinessSnapshot(business: BusinessSnapshot) {
  if (typeof window === "undefined" || !business.id || business.id === HOSTING_PLACEHOLDER_BUSINESS_ID) return;
  try {
    sessionStorage.setItem(ID_KEY, business.id);
    if (business.type) sessionStorage.setItem(TYPE_KEY, business.type);
  } catch {
    /* ignore */
  }
}

export function persistBusinessId(id: string) {
  if (typeof window === "undefined" || !id || id === HOSTING_PLACEHOLDER_BUSINESS_ID) return;
  try {
    sessionStorage.setItem(ID_KEY, id);
  } catch {
    /* ignore */
  }
}

export function resolveBusinessId(
  pathname: string,
  businesses: BusinessRow[] | undefined
): string {
  const segment = pathBusinessSegment(pathname);
  const stored = readStoredBusinessId();

  if (businesses === undefined) {
    if (segment && segment !== HOSTING_PLACEHOLDER_BUSINESS_ID) return segment;
    return "";
  }

  if (stored && !ownsBusiness(stored, businesses)) {
    clearBusinessSession();
  }

  if (segment && segment !== HOSTING_PLACEHOLDER_BUSINESS_ID && ownsBusiness(segment, businesses)) {
    return segment;
  }

  if (stored && ownsBusiness(stored, businesses)) return stored;

  return businesses[0]?.id ?? "";
}

export function resolveBusinessType(
  businessId: string,
  business: BusinessRow | null | undefined,
  businesses: BusinessRow[] | undefined
): BusinessType | undefined {
  if (business?.type) return business.type;
  const match = businesses?.find((b) => b.id === businessId);
  if (match?.type) return match.type;
  return businesses?.[0]?.type;
}

export function catalogPathForBusiness(businessId: string): string {
  return `/businesses/${businessId}/catalog`;
}

export function fixPlaceholderBusinessPath(pathname: string, realId: string): string | null {
  if (!pathname.includes(`/businesses/${HOSTING_PLACEHOLDER_BUSINESS_ID}`)) return null;
  return pathname.replace(`/businesses/${HOSTING_PLACEHOLDER_BUSINESS_ID}`, `/businesses/${realId}`);
}
