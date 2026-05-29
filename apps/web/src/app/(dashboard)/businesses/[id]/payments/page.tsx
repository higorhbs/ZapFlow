"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { paymentApi, tenantApi } from "@/lib/api";
import { formatCurrency, PLAN_LABELS, cn } from "@/lib/utils";
import { Banknote, Loader2, QrCode, CheckCircle2, Clock, AlertCircle, Crown, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/auth-context";
import { AsaasMerchantForm } from "@/components/payments/AsaasMerchantForm";

type PaymentRow = {
  id: string;
  customerName?: string;
  customerPhone: string;
  description: string;
  amount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
};

const STATUS: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  PAID: { label: "Pago", className: "text-emerald-700 bg-emerald-50", icon: CheckCircle2 },
  PENDING: { label: "Aguardando", className: "text-amber-700 bg-amber-50", icon: Clock },
  OVERDUE: { label: "Vencido", className: "text-red-700 bg-red-50", icon: AlertCircle },
  CANCELLED: { label: "Cancelado", className: "text-gray-600 bg-gray-100", icon: AlertCircle },
};

function planAllowsPix(plan?: string) {
  return plan === "PRO" || plan === "UNLIMITED";
}

export default function PaymentsPage() {
  const { id: businessId } = useParams<{ id: string }>();
  const { uid, ready } = useAuth();

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["tenant", uid],
    queryFn: () => tenantApi.get(),
    enabled: ready && !!uid,
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", businessId],
    queryFn: () => paymentApi.list(businessId) as Promise<PaymentRow[]>,
    enabled: !!businessId && planAllowsPix(tenant?.plan),
  });

  const pixEnabled = planAllowsPix(tenant?.plan);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pagamentos PIX</h1>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          Conecte a conta Asaas do negócio. Os PIX gerados no WhatsApp caem na carteira do lojista, não na ZapFlow.
        </p>
      </div>

      {tenantLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : !pixEnabled ? (
        <div className="card text-center py-10 px-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-7 h-7 text-brand-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Recurso do plano Pro</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Cobrança PIX automática no WhatsApp está disponível no plano{" "}
            <strong>{PLAN_LABELS.PRO}</strong> ou <strong>{PLAN_LABELS.UNLIMITED}</strong>.
            Seu plano atual: <strong>{tenant ? PLAN_LABELS[tenant.plan] : "—"}</strong>.
          </p>
          <Link href="/plan" className="btn-primary inline-flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Fazer upgrade
          </Link>
        </div>
      ) : (
        <>
          <AsaasMerchantForm businessId={businessId} />

          <h2 className="text-sm font-semibold text-gray-900 mt-8 mb-3 flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            Cobranças recentes
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8 rounded-xl border border-dashed border-gray-200">
              Nenhuma cobrança ainda. Após conectar o Asaas, o cliente digita <strong>pix</strong> ou escolhe{" "}
              <strong>Pagar com PIX</strong> no menu do WhatsApp.
            </p>
          ) : (
            <ul className="space-y-3">
              {payments.map((p) => {
                const meta = STATUS[p.status] ?? STATUS.PENDING;
                const Icon = meta.icon;
                return (
                  <li key={p.id} className="card flex items-start gap-4">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                        meta.className
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900">{formatCurrency(p.amount)}</p>
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", meta.className)}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{p.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {p.customerName ?? p.customerPhone} ·{" "}
                        {format(new Date(p.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        {p.paidAt
                          ? ` · pago ${format(new Date(p.paidAt), "dd/MM HH:mm", { locale: ptBR })}`
                          : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
