import axios from "axios";
import {
  updateAccountName,
  updateAccountEmail,
  updateAccountPassword,
} from "./firebase-auth";
import { setToken } from "./auth";
import { getClientAuth } from "@flowdesk/firebase/client";
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
  listClientConversations,
  getClientConversation,
  updateClientConversationStatus,
  deleteClientConversation,
  listClientAppointments,
  updateClientAppointment,
  listClientPayments,
  getClientAnalytics,
  listClientScheduledStatuses,
  createClientScheduledStatus,
  cancelClientScheduledStatus,
} from "@flowdesk/firebase/client";
import type {
  Plan,
  ConversationStatus,
  AppointmentStatus,
  ScheduledStatus,
  ScheduledStatusMediaType,
} from "@flowdesk/firebase/client";

function isLocalDevHost() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function resolveWaApiBaseUrl() {
  const url = process.env.NEXT_PUBLIC_WA_API_URL?.trim();
  const onLocal = isLocalDevHost();
  if (url && !(url.includes("localhost") && !onLocal)) return url.replace(/\/$/, "");
  if (onLocal) return url || process.env.NEXT_PUBLIC_API_URL?.trim()?.replace(/\/$/, "") || "http://localhost:3001";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()?.replace(/\/$/, "");
  if (apiUrl && !apiUrl.includes("localhost")) return apiUrl;
  throw new Error("NEXT_PUBLIC_WA_API_URL não configurada para produção.");
}

let waApiBaseUrl: string | undefined;
function getWaApiBaseUrl() {
  if (!waApiBaseUrl) waApiBaseUrl = resolveWaApiBaseUrl();
  return waApiBaseUrl;
}

function hasWaApi() {
  const wa = process.env.NEXT_PUBLIC_WA_API_URL?.trim();
  const api = process.env.NEXT_PUBLIC_API_URL?.trim();
  return Boolean(wa || api) || isLocalDevHost();
}

function resolveApiBaseUrl() {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  const onLocal = isLocalDevHost();
  if (url && !(url.includes("localhost") && !onLocal)) return url.replace(/\/$/, "");
  if (onLocal) return url || "http://localhost:3001";
  if (typeof window === "undefined") return url || "http://127.0.0.1:3001";
  throw new Error("NEXT_PUBLIC_API_URL não configurada para produção.");
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

const waApi = axios.create({
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

waApi.interceptors.request.use(async (config) => {
  if (!config.baseURL) config.baseURL = getWaApiBaseUrl();
  const user = getClientAuth().currentUser;
  if (!user) return config;
  const token = await user.getIdToken(false);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

waApi.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data;
    const apiMsg =
      typeof data?.error === "string"
        ? data.error
        : typeof data?.message === "string"
          ? data.message
          : null;
    const waUrl = getWaApiBaseUrl();
    if (apiMsg) {
      err.message = apiMsg;
    } else if (!err.response) {
      const pageHttps =
        typeof window !== "undefined" && window.location.protocol === "https:";
      const waHttp = waUrl.startsWith("http://");
      if (pageHttps && waHttp) {
        err.message =
          `O painel está em HTTPS, mas a API WhatsApp está em HTTP (${waUrl}). O navegador bloqueia isso. Use HTTPS na API (ex.: Caddy) e NEXT_PUBLIC_WA_API_URL=https://...`;
      } else if (err.code === "ECONNABORTED") {
        err.message =
          "API WhatsApp demorou (geração do QR pode levar até 50s). Aguarde ou tente de novo.";
      } else if (isLocalDevHost()) {
        err.message = "API WhatsApp offline. Suba flowdesk-wa na porta 3001.";
      } else {
        err.message = `Não foi possível conectar à API WhatsApp (${waUrl}). Verifique firewall, CORS e se o container wa-api está no ar.`;
      }
    } else if (err.response?.status === 503) {
      err.message = apiMsg ?? "API WhatsApp sem credencial Firebase Admin no servidor.";
    }
    return Promise.reject(err);
  }
);

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
    const apiUrl = resolveApiBaseUrl();
    if (apiMsg) {
      err.message = apiMsg;
    } else if (status && status >= 502 && status <= 504) {
      err.message = `API temporariamente indisponível (${apiUrl}). Aguarde ~30s e tente de novo.`;
    } else if (!err.response) {
      const isLocal = isLocalDevHost();
      if (isLocal) {
        err.message = "API offline. Inicie com pnpm dev (porta 3001).";
      } else if (err.code === "ECONNABORTED") {
        err.message = "API demorou para responder (servidor iniciando). Aguarde 30s e tente de novo.";
      } else {
        err.message = `Não foi possível conectar à API (${apiUrl}). Verifique se a VM está no ar e se o front usa HTTPS na URL da API.`;
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
    const user = getClientAuth().currentUser;
    if (!user?.email) return null;
    return ensureClientTenant(user.uid, {
      name: name ?? user.displayName ?? user.email.split("@")[0] ?? "Usuário",
      email: user.email,
    });
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
    listClientConversations(businessId, requireUid(), {
      status: params?.status as ConversationStatus | undefined,
      page: params?.page,
    }),
  get: (businessId: string, conversationId: string) =>
    getClientConversation(businessId, requireUid(), conversationId),
  attend: (businessId: string, conversationId: string) =>
    updateClientConversationStatus(businessId, requireUid(), conversationId, "ATTENDING"),
  release: (businessId: string, conversationId: string) =>
    updateClientConversationStatus(businessId, requireUid(), conversationId, "OPEN"),
  close: (businessId: string, conversationId: string) =>
    updateClientConversationStatus(businessId, requireUid(), conversationId, "CLOSED"),
  remove: (businessId: string, conversationId: string) =>
    deleteClientConversation(businessId, requireUid(), conversationId),
};

function wakeWaApi() {
  if (!hasWaApi()) return;
  const base = getWaApiBaseUrl();
  if (/localhost|127\.0\.0\.1/.test(base)) return;
  void waApi.get("/health", { timeout: 4_000 }).catch(() => undefined);
}

export const scheduledStatusApi = {
  list: (businessId: string) => listClientScheduledStatuses(businessId, requireUid()),
  upload: async (businessId: string, file: File) => {
    wakeWaApi();
    const form = new FormData();
    form.append("file", file);
    const r = await waApi.post<{ mediaUrl: string; mediaType: ScheduledStatusMediaType }>(
      `/businesses/${businessId}/whatsapp/status/upload`,
      form,
      { timeout: 120_000 }
    );
    return r.data;
  },
  create: (
    businessId: string,
    data: {
      mediaUrl: string;
      mediaType: ScheduledStatusMediaType;
      caption?: string;
      scheduledAt: string;
    }
  ) => createClientScheduledStatus(businessId, requireUid(), data),
  cancel: (businessId: string, statusId: string) =>
    cancelClientScheduledStatus(businessId, requireUid(), statusId),
};

export type { ScheduledStatus };

export const whatsappApi = {
  connect: async (businessId: string, force = false) => {
    wakeWaApi();
    return waApi
      .post(`/businesses/${businessId}/whatsapp/connect${force ? "?force=1" : ""}`, undefined, {
        timeout: 50_000,
      })
      .then((r) => r.data);
  },
  status: (businessId: string) =>
    waApi.get(`/businesses/${businessId}/whatsapp/status`, { timeout: 20_000 }).then((r) => r.data),
  disconnect: (businessId: string) =>
    waApi.post(`/businesses/${businessId}/whatsapp/disconnect`).then((r) => r.data),
  send: (businessId: string, to: string, text: string, conversationId?: string) =>
    waApi
      .post(`/businesses/${businessId}/whatsapp/send`, { to, text, conversationId })
      .then((r) => r.data),
};

export const appointmentApi = {
  list: (businessId: string, params?: { from?: string; to?: string; status?: string }) =>
    listClientAppointments(businessId, requireUid(), {
      from: params?.from,
      to: params?.to,
      status: params?.status as AppointmentStatus | undefined,
    }),
  patch: (businessId: string, appointmentId: string, data: Record<string, unknown>) =>
    updateClientAppointment(businessId, requireUid(), appointmentId, data as Parameters<typeof updateClientAppointment>[3]),
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
  sync: async () => {
    if (!hasPublicApi()) {
      return { ok: false as const, planStatus: null, subscriptionStatus: null };
    }
    await authApi.sync();
    return api.post("/billing/sync").then(
      (r) =>
        r.data as {
          ok: boolean;
          plan?: string;
          planStatus?: string;
          stripeCustomerId?: string | null;
          stripeSubscriptionId?: string | null;
          subscriptionStatus?: string | null;
          cancelAtPeriodEnd?: boolean;
          currentPeriodEnd?: string | null;
          canceledAt?: string | null;
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
    getClientAnalytics(businessId, requireUid()).catch(() => emptyAnalytics),
};

export const paymentApi = {
  list: (businessId: string) => listClientPayments(businessId, requireUid()),
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
  deleteAccount: () => api.post("/privacy/delete-account").then((r) => r.data),
};
