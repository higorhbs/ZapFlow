import axios from "axios";
import Cookies from "js-cookie";
import {
  getIdToken,
  updateAccountName,
  updateAccountEmail,
  updateAccountPassword,
} from "./firebase-auth";
import { getClientAuth } from "@zapflow/firebase/client";
import {
  listClientBusinesses,
  getClientBusiness,
  createClientBusiness,
  updateClientBusiness,
  listClientCatalog,
  createClientCatalogItem,
  updateClientCatalogItem,
  deleteClientCatalogItem,
  listClientFaqs,
  createClientFaq,
  deleteClientFaq,
  getClientTenant,
  updateClientPlan,
  ensureClientTenant,
  completeClientOnboarding,
  acceptClientLgpd,
} from "@zapflow/firebase/client";
import type { Plan } from "@zapflow/firebase/client";

function isLocalDevHost() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function resolveApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured;
  return isLocalDevHost() ? "http://localhost:3001" : "/api";
}

function hasPublicApi() {
  return Boolean(resolveApiBaseUrl());
}

function getStripePaymentLink(plan: "STARTER" | "PRO" | "UNLIMITED") {
  const links: Record<"STARTER" | "PRO" | "UNLIMITED", string | undefined> = {
    STARTER: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER?.trim(),
    PRO: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO?.trim(),
    UNLIMITED: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_UNLIMITED?.trim(),
  };
  return links[plan] ?? "";
}

function getStripePortalLink() {
  return process.env.NEXT_PUBLIC_STRIPE_BILLING_PORTAL_URL?.trim() ?? "";
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

function requireUid(): string {
  const uid = getClientAuth().currentUser?.uid;
  if (!uid) throw new Error("Faça login para continuar.");
  return uid;
}

async function ensureTenantRecord() {
  const user = getClientAuth().currentUser;
  if (!user?.email) throw new Error("E-mail não encontrado na conta.");
  await ensureClientTenant(user.uid, {
    name: user.displayName ?? user.email.split("@")[0] ?? "Usuário",
    email: user.email,
  });
}

api.interceptors.request.use(async (config) => {
  const fresh = await getIdToken();
  const token = fresh ?? Cookies.get("zf_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path !== "/" && !path.startsWith("/register")) {
        Cookies.remove("zf_token");
        window.location.href = "/";
      }
    }
    const status = err.response?.status;
    const data = err.response?.data;
    const apiMsg =
      typeof data?.error === "string"
        ? data.error
        : typeof data?.message === "string"
          ? data.message
          : null;
    if (apiMsg) {
      err.message = apiMsg;
    } else if (!err.response) {
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      err.message = isLocal
        ? "API offline. Inicie com npm run dev (porta 3001)."
        : "API de produção indisponível. Configure NEXT_PUBLIC_API_URL com a URL pública da API.";
    } else if (status === 401) {
      err.message = "Sessão inválida. Entre de novo.";
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  sync: async (name?: string) => {
    if (!hasPublicApi() && !isLocalDevHost()) return null;
    return api.post("/auth/sync", { name }).then((r) => r.data);
  },
};

export const tenantApi = {
  get: () => getClientTenant(requireUid()),
  updatePlan: (plan: Plan) => updateClientPlan(requireUid(), plan),
  completeOnboarding: async () => {
    await ensureTenantRecord();
    return completeClientOnboarding(requireUid());
  },
  acceptLgpd: async (policyVersion: string) => {
    await ensureTenantRecord();
    return acceptClientLgpd(requireUid(), policyVersion);
  },
};

export const profileApi = {
  updateName: (name: string) => updateAccountName(name),
  updateEmail: (email: string, password: string) => updateAccountEmail(email, password),
  updatePassword: (current: string, next: string) => updateAccountPassword(current, next),
};

export const businessApi = {
  list: () => listClientBusinesses(requireUid()),
  get: (id: string) => getClientBusiness(id, requireUid()),
  create: async (data: Parameters<typeof createClientBusiness>[1]) => {
    const uid = requireUid();
    const existing = await listClientBusinesses(uid);
    if (existing.length > 0) throw new Error("Sua conta já possui um negócio cadastrado.");
    return createClientBusiness(uid, data);
  },
  update: (id: string, data: Parameters<typeof updateClientBusiness>[2]) =>
    updateClientBusiness(id, requireUid(), data),
  setConnected: (id: string, isConnected: boolean) =>
    updateClientBusiness(id, requireUid(), { isConnected }),
};

async function assertBusinessAccess(businessId: string) {
  const tenantId = requireUid();
  const biz = await getClientBusiness(businessId, tenantId);
  if (!biz) throw new Error("Negócio não encontrado ou sem acesso.");
  return biz;
}

export const catalogApi = {
  list: async (businessId: string) => {
    requireUid();
    return listClientCatalog(businessId);
  },
  create: async (businessId: string, data: Record<string, unknown>) => {
    await assertBusinessAccess(businessId);
    return createClientCatalogItem(businessId, data as Parameters<typeof createClientCatalogItem>[1]);
  },
  update: async (businessId: string, itemId: string, data: Record<string, unknown>) => {
    await assertBusinessAccess(businessId);
    return updateClientCatalogItem(businessId, itemId, data);
  },
  remove: async (businessId: string, itemId: string) => {
    await assertBusinessAccess(businessId);
    return deleteClientCatalogItem(businessId, itemId);
  },
};

export const faqApi = {
  list: (businessId: string) => listClientFaqs(businessId),
  create: (businessId: string, data: Record<string, unknown>) =>
    createClientFaq(businessId, data as Parameters<typeof createClientFaq>[1]),
  remove: (businessId: string, faqId: string) => deleteClientFaq(businessId, faqId),
};

export const conversationApi = {
  list: (businessId: string, params?: { status?: string; page?: number }) =>
    api.get(`/businesses/${businessId}/conversations`, { params }).then((r) => r.data),
  get: (businessId: string, conversationId: string) =>
    api.get(`/businesses/${businessId}/conversations/${conversationId}`).then((r) => r.data),
  attend: (businessId: string, conversationId: string) =>
    api.patch(`/businesses/${businessId}/conversations/${conversationId}/attend`).then((r) => r.data),
  release: (businessId: string, conversationId: string) =>
    api.patch(`/businesses/${businessId}/conversations/${conversationId}/release`).then((r) => r.data),
  close: (businessId: string, conversationId: string) =>
    api.patch(`/businesses/${businessId}/conversations/${conversationId}/close`).then((r) => r.data),
};

export const whatsappApi = {
  connect: (businessId: string) =>
    api.post(`/businesses/${businessId}/whatsapp/connect`).then((r) => r.data),
  status: (businessId: string) =>
    api.get(`/businesses/${businessId}/whatsapp/status`).then((r) => r.data),
  disconnect: (businessId: string) =>
    api.post(`/businesses/${businessId}/whatsapp/disconnect`).then((r) => r.data),
  send: (businessId: string, to: string, text: string) =>
    api.post(`/businesses/${businessId}/whatsapp/send`, { to, text }).then((r) => r.data),
};

export const appointmentApi = {
  list: (businessId: string, params?: { from?: string; to?: string; status?: string }) =>
    api.get(`/businesses/${businessId}/appointments`, { params }).then((r) => r.data),
  patch: (businessId: string, appointmentId: string, data: Record<string, unknown>) =>
    api.patch(`/businesses/${businessId}/appointments/${appointmentId}`, data).then((r) => r.data),
};

export const billingApi = {
  checkout: (plan: "STARTER" | "PRO" | "UNLIMITED") => {
    const directLink = getStripePaymentLink(plan);
    if (directLink) {
      return Promise.resolve({ url: directLink });
    }
    if (!hasPublicApi()) {
      throw new Error(`Link Stripe do plano ${plan} não configurado.`);
    }
    return api.post("/billing/checkout", { plan }).then((r) => r.data as { url?: string });
  },
  portal: () => {
    const portalLink = getStripePortalLink();
    if (portalLink) {
      return Promise.resolve({ url: portalLink });
    }
    if (!hasPublicApi()) {
      throw new Error("Portal Stripe não configurado.");
    }
    return api.post("/billing/portal").then((r) => r.data as { url?: string });
  },
};

const emptyAnalytics = {
  conversations: { thisMonth: 0, growth: 0 },
  appointments: { pending: 0 },
  payments: { revenueThisMonth: 0 },
};

export const analyticsApi = {
  get: (businessId: string) =>
    api
      .get(`/businesses/${businessId}/analytics`)
      .then((r) => r.data)
      .catch(() => emptyAnalytics),
};

export const privacyApi = {
  exportMyData: () => api.get("/privacy/export").then((r) => r.data),
  request: (type: "CORRECTION" | "OPPOSITION" | "REVOCATION" | "ERASURE", details?: string) =>
    api.post("/privacy/requests", { type, details }).then((r) => r.data),
  anonymizeMyData: () => api.post("/privacy/anonymize").then((r) => r.data),
};
