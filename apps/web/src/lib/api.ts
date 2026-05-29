import axios from "axios";
import {
  updateAccountName,
  updateAccountEmail,
  updateAccountPassword,
} from "./firebase-auth";
import { setToken } from "./auth";
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
  updateClientFaq,
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
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (url) return url;
  if (typeof window !== "undefined" && isLocalDevHost()) return "http://localhost:3001";
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_API_URL?.trim() || "http://127.0.0.1:3001";
  throw new Error("NEXT_PUBLIC_API_URL não configurada.");
}

let apiBaseUrl: string | undefined;
function getApiBaseUrl() {
  if (!apiBaseUrl) apiBaseUrl = resolveApiBaseUrl();
  return apiBaseUrl;
}

function hasPublicApi() {
  return Boolean(process.env.NEXT_PUBLIC_API_URL?.trim()) || isLocalDevHost();
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
  timeout: 90_000,
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
  if (!config.baseURL) config.baseURL = getApiBaseUrl();
  const user = getClientAuth().currentUser;
  if (!user) return config;
  const token = await user.getIdToken(false);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    setToken(token);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config as typeof err.config & { _authRetry?: boolean };
    const status = err.response?.status;

    if (status === 401 && config && !config._authRetry) {
      const user = getClientAuth().currentUser;
      if (user) {
        config._authRetry = true;
        try {
          const token = await user.getIdToken(true);
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            setToken(token);
            return api(config);
          }
        } catch {
          /* refresh falhou */
        }
      }
    }

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
      const isLocal = isLocalDevHost();
      const apiUrl = resolveApiBaseUrl();
      if (isLocal) {
        err.message = "API offline. Inicie com pnpm dev (porta 3001).";
      } else if (err.code === "ECONNABORTED") {
        err.message = "API demorou para responder (servidor iniciando). Aguarde 30s e tente de novo.";
      } else {
        err.message = `Não foi possível conectar à API (${apiUrl}). Tente novamente em instantes.`;
      }
    } else if (status === 401) {
      err.message = "Sessão inválida. Entre de novo.";
    } else if (status === 500 && err.message === "Request failed with status code 500") {
      err.message = "Erro no servidor ao processar cobrança. Tente novamente.";
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
  update: (businessId: string, faqId: string, data: Record<string, unknown>) =>
    updateClientFaq(businessId, faqId, data as Parameters<typeof updateClientFaq>[2]),
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

async function wakeProductionApi() {
  if (!hasPublicApi()) return;
  try {
    await api.get("/health", { timeout: 120_000 });
  } catch {
    /* cold start */
  }
}

export const whatsappApi = {
  connect: async (businessId: string, force = false) => {
    await wakeProductionApi();
    return api
      .post(`/businesses/${businessId}/whatsapp/connect${force ? "?force=1" : ""}`, undefined, {
        timeout: 25_000,
      })
      .then((r) => r.data);
  },
  status: (businessId: string) =>
    api.get(`/businesses/${businessId}/whatsapp/status`).then((r) => r.data),
  disconnect: (businessId: string) =>
    api.post(`/businesses/${businessId}/whatsapp/disconnect`).then((r) => r.data),
  send: (businessId: string, to: string, text: string, conversationId?: string) =>
    api
      .post(`/businesses/${businessId}/whatsapp/send`, { to, text, conversationId })
      .then((r) => r.data),
};

export const appointmentApi = {
  list: (businessId: string, params?: { from?: string; to?: string; status?: string }) =>
    api.get(`/businesses/${businessId}/appointments`, { params }).then((r) => r.data),
  patch: (businessId: string, appointmentId: string, data: Record<string, unknown>) =>
    api.patch(`/businesses/${businessId}/appointments/${appointmentId}`, data).then((r) => r.data),
};

export const billingApi = {
  checkout: async (plan: "STARTER" | "PRO" | "UNLIMITED") => {
    const directLink = getStripePaymentLink(plan);
    if (directLink) {
      return { url: directLink };
    }
    if (!hasPublicApi()) {
      throw new Error(`Link Stripe do plano ${plan} não configurado.`);
    }
    await authApi.sync();
    return api.post("/billing/checkout", { plan }).then((r) => r.data as { url?: string });
  },
  portal: async () => {
    const portalLink = getStripePortalLink();
    if (portalLink) {
      return { url: portalLink };
    }
    if (!hasPublicApi()) {
      throw new Error("Portal Stripe não configurado.");
    }
    await authApi.sync();
    return api.post("/billing/portal").then((r) => r.data as { url?: string });
  },
  cancellationPreview: async () => {
    if (!hasPublicApi()) {
      return {
        canCancel: false,
        reason: "API de cobrança indisponível no ambiente atual.",
      };
    }
    await authApi.sync();
    return api.get("/billing/cancel/preview").then(
      (r) =>
        r.data as {
          canCancel: boolean;
          reason?: string;
          subscriptionStatus?: string;
          periodStart?: string;
          periodEnd?: string;
          usedDays?: number;
          totalCycleDays?: number;
          remainingDays?: number;
          refundEstimateCents?: number;
          refundEstimateBrl?: number;
          currency?: string;
          lgpd?: {
            requiresConsent: boolean;
            legalBasis: string;
            retentionDays: number;
          };
        }
    );
  },
  cancelPlan: async (data: { reason?: string; lgpdConsent: boolean }) => {
    if (!hasPublicApi()) {
      throw new Error("API de cobrança indisponível no ambiente atual.");
    }
    await authApi.sync();
    return api.post("/billing/cancel", data).then(
      (r) =>
        r.data as {
          ok: boolean;
          canceledAt: string;
          usedDays: number;
          totalCycleDays: number;
          refundAmountCents: number;
          refundAmountBrl: number;
          refundId: string | null;
          refundStatus: string;
        }
    );
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

export const paymentApi = {
  list: (businessId: string) =>
    api.get(`/businesses/${businessId}/payments`).then((r) => r.data),
};

export const asaasApi = {
  get: (businessId: string) =>
    api.get(`/businesses/${businessId}/integrations/asaas`).then((r) => r.data),
  save: (
    businessId: string,
    data: { apiKey?: string; sandbox?: boolean; webhookToken?: string }
  ) => api.put(`/businesses/${businessId}/integrations/asaas`, data).then((r) => r.data),
  remove: (businessId: string) =>
    api.delete(`/businesses/${businessId}/integrations/asaas`),
};

export const privacyApi = {
  exportMyData: () => api.get("/privacy/export").then((r) => r.data),
  request: (type: "CORRECTION" | "OPPOSITION" | "REVOCATION" | "ERASURE", details?: string) =>
    api.post("/privacy/requests", { type, details }).then((r) => r.data),
  anonymizeMyData: () => api.post("/privacy/anonymize").then((r) => r.data),
};
