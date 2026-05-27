import axios from "axios";
import Cookies from "js-cookie";
import { getIdToken } from "./firebase-auth";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
});

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
    const apiMsg = err.response?.data?.error;
    if (apiMsg && typeof apiMsg === "string") {
      err.message = apiMsg;
    } else if (!err.response) {
      err.message = "API offline. Inicie com npm run dev (porta 3001).";
    } else if (status === 401) {
      err.message = "Sessão inválida. Entre de novo.";
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  me: () => api.get("/auth/me").then((r) => r.data),
};

// ─── Businesses ───────────────────────────────────────────────────────────────
export const businessApi = {
  list: () => api.get("/businesses").then((r) => r.data),
  get: (id: string) => api.get(`/businesses/${id}`).then((r) => r.data),
  create: (data: any) => api.post("/businesses", data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/businesses/${id}`, data).then((r) => r.data),
};

// ─── Catalog ──────────────────────────────────────────────────────────────────
export const catalogApi = {
  list: (businessId: string) => api.get(`/businesses/${businessId}/catalog`).then((r) => r.data),
  create: (businessId: string, data: any) =>
    api.post(`/businesses/${businessId}/catalog`, data).then((r) => r.data),
  update: (businessId: string, itemId: string, data: any) =>
    api.put(`/businesses/${businessId}/catalog/${itemId}`, data).then((r) => r.data),
  remove: (businessId: string, itemId: string) =>
    api.delete(`/businesses/${businessId}/catalog/${itemId}`),
};

// ─── FAQs ─────────────────────────────────────────────────────────────────────
export const faqApi = {
  list: (businessId: string) => api.get(`/businesses/${businessId}/faqs`).then((r) => r.data),
  create: (businessId: string, data: any) =>
    api.post(`/businesses/${businessId}/faqs`, data).then((r) => r.data),
  remove: (businessId: string, faqId: string) =>
    api.delete(`/businesses/${businessId}/faqs/${faqId}`),
};

// ─── Conversations ────────────────────────────────────────────────────────────
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

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
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

// ─── Appointments ─────────────────────────────────────────────────────────────
export const appointmentApi = {
  list: (businessId: string, params?: { from?: string; to?: string; status?: string }) =>
    api.get(`/businesses/${businessId}/appointments`, { params }).then((r) => r.data),
  patch: (businessId: string, appointmentId: string, data: any) =>
    api.patch(`/businesses/${businessId}/appointments/${appointmentId}`, data).then((r) => r.data),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  get: (businessId: string) =>
    api.get(`/businesses/${businessId}/analytics`).then((r) => r.data),
};
