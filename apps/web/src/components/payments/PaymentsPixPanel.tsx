"use client";

import { useQuery } from "@tanstack/react-query";
import { paymentApi } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { Loader2, QrCode, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

export function PaymentsPixPanel({ businessId }: { businessId: string }) {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", businessId],
    queryFn: () => paymentApi.list(businessId) as Promise<PaymentRow[]>,
    enabled: !!businessId,
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 leading-relaxed">
        Conecte a conta Asaas do negócio. Os PIX gerados no WhatsApp caem na carteira do lojista, não no AtendeJa.
      </p>
      <AsaasMerchantForm businessId={businessId} />
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          Cobranças recentes
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-8 rounded-xl border border-dashed border-gray-200">
            Nenhuma cobrança ainda. Após conectar o Asaas, o cliente digite <strong>pix</strong> ou escolhe{" "}
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
      </div>
    </div>
  );
}
