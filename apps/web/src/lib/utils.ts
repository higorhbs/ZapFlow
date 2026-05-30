import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return phone;
}

export const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  UNLIMITED: "Unlimited",
};

export const PLAN_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  TRIALING: { label: "Período de teste", color: "bg-brand-100 text-brand-700" },
  ACTIVE: { label: "Ativo", color: "bg-green-100 text-green-700" },
  PAST_DUE: { label: "Pagamento pendente", color: "bg-orange-100 text-orange-700" },
  CANCELED: { label: "Cancelado", color: "bg-gray-100 text-gray-600" },
};

export { BUSINESS_TYPE_LABELS, getBusinessTypeLabel } from "@zapflow/shared";

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Aberta", color: "bg-blue-100 text-blue-700" },
  ATTENDING: { label: "Em atendimento", color: "bg-yellow-100 text-yellow-700" },
  CLOSED: { label: "Encerrada", color: "bg-gray-100 text-gray-600" },
  PENDING: { label: "Pendente", color: "bg-orange-100 text-orange-700" },
  CONFIRMED: { label: "Confirmado", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  COMPLETED: { label: "Concluído", color: "bg-purple-100 text-purple-700" },
  NO_SHOW: { label: "Não compareceu", color: "bg-red-100 text-red-700" },
  PAID: { label: "Pago", color: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Vencido", color: "bg-red-100 text-red-700" },
};
