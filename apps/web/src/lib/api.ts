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
} from "@zapflow/firebase/client";
import type { Plan } from "@zapflow/firebase/client";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
});

function requireUid(): string {
  const uid = getClientAuth().currentUser?.uid;
  if (!uid) throw new Error("Faça login para continuar.");
  return uid;
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
      err.message = "API offline. Inicie com npm run dev (porta 3001).";
    } else if (status === 401) {
      err.message = "Sessão inválida. Entre de novo.";
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  sync: (name?: string) => api.post("/auth/sync", { name }).then((r) => r.data),
};

export const tenantApi = {
  get: () => getClientTenant(requireUid()),
  updatePlan: (plan: Plan) => updateClientPlan(requireUid(), plan),
};

export const profileApi = {
  updateName: (name: string) => updateAccountName(name),
  updateEmail: (email: string, password: string) => updateAccountEmail(email, password),
  updatePassword: (current: string, next: string) => updateAccountPassword(current, next),
};

export const businessApi = {
  list: () => listClientBusinesses(requireUid()),
  get: (id: string) => getClientBusiness(id, requireUid()),
  create: (data: Parameters<typeof createClientBusiness>[1]) =>
    createClientBusiness(requireUid(), data),
  update: (id: string, data: Parameters<typeof updateClientBusiness>[2]) =>
    updateClientBusiness(id, requireUid(), data),
};

export const catalogApi = {
  list: (businessId: string) => listClientCatalog(businessId),
  create: (businessId: string, data: Record<string, unknown>) =>
    createClientCatalogItem(businessId, data as Parameters<typeof createClientCatalogItem>[1]),
  update: (businessId: string, itemId: string, data: Record<string, unknown>) =>
    updateClientCatalogItem(businessId, itemId, data),
  remove: (businessId: string, itemId: string) => deleteClientCatalogItem(businessId, itemId),
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
