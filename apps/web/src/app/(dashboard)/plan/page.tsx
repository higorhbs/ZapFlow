"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi, businessApi, billingApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { PLAN_LABELS, PLAN_STATUS_LABELS, cn, formatCurrency } from "@/lib/utils";
import { PLAN_LIMITS, PLAN_PRICES, planMarketingFeatures, formatPlanLimit, effectivePlanStatus, isStarterTrialActive, starterTrialDaysLeft } from "@zapflow/shared";
import type { Plan } from "@zapflow/firebase/client";
import { toast } from "sonner";
import { Check, Crown, Loader2, Sparkles, Zap, ArrowRight, CalendarDays, BookOpen, CreditCard, ShieldCheck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PLANS: { id: Plan; highlight?: boolean; extras?: string[] }[] = [
  { id: "STARTER" },
  { id: "PRO", highlight: true, extras: ["Cobrança PIX automática", "Relatórios avançados"] },
  { id: "UNLIMITED", extras: ["Suporte prioritário", "Tudo do Pro"] },
];

const PLAN_GRADIENTS: Record<Plan, string> = {
  STARTER:   "from-slate-500 to-slate-700",
  PRO:       "from-brand-600 to-brand-800",
  UNLIMITED: "from-violet-600 to-purple-800",
};

const PLAN_ICON_BG: Record<Plan, string> = {
  STARTER:   "bg-slate-400/30",
  PRO:       "bg-white/20",
  UNLIMITED: "bg-white/20",
};

export default function PlanPage() {
  const { uid, ready } = useAuth();
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [lgpdConsent, setLgpdConsent] = useState(false);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", uid],
    queryFn: () => tenantApi.get(),
    enabled: ready && !!uid,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ["businesses", uid],
    queryFn: businessApi.list,
    enabled: ready && !!uid,
  });

  const { data: cancellationPreview, isLoading: previewLoading } = useQuery({
    queryKey: ["billing-cancel-preview", uid],
    queryFn: () => billingApi.cancellationPreview(),
    enabled: ready && !!uid && !!tenant?.stripeCustomerId && tenant?.planStatus !== "CANCELED",
  });

  const selectPlan = useMutation({
    mutationFn: async (plan: Plan) => {
      const res = await billingApi.checkout(plan);
      if (!res?.url) throw new Error("Não foi possível iniciar checkout Stripe.");
      window.location.href = res.url;
      return plan;
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao iniciar checkout"),
  });

  const openPortal = useMutation({
    mutationFn: async () => {
      const res = await billingApi.portal();
      if (!res?.url) throw new Error("Não foi possível abrir portal de cobrança.");
      window.location.href = res.url;
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao abrir portal Stripe"),
  });

  const cancelPlan = useMutation({
    mutationFn: () =>
      billingApi.cancelPlan({
        reason: cancelReason.trim() || undefined,
        lgpdConsent,
      }),
    onSuccess: async (res) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tenant", uid] }),
        queryClient.invalidateQueries({ queryKey: ["billing-cancel-preview", uid] }),
      ]);
      setCancelReason("");
      setLgpdConsent(false);
      toast.success(
        `Plano cancelado. Uso no ciclo: ${res.usedDays}/${res.totalCycleDays} dias. Reembolso: ${formatCurrency(res.refundAmountBrl)}.`
      );
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao cancelar plano"),
  });

  if (isLoading || !tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const statusMeta = PLAN_STATUS_LABELS[effectivePlanStatus(tenant)] ?? PLAN_STATUS_LABELS.ACTIVE;
  const inTrial = isStarterTrialActive(tenant);
  const trialDaysLeft = starterTrialDaysLeft(tenant);
  const limits = PLAN_LIMITS[tenant.plan];
  const canSubmitCancel = Boolean(cancellationPreview?.canCancel && lgpdConsent && !cancelPlan.isPending);

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Current plan hero */}
      <div className={cn(
        "relative rounded-2xl overflow-hidden bg-gradient-to-br p-6 mb-8",
        PLAN_GRADIENTS[tenant.plan]
      )}>
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-16 bottom-0 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Left: plan name + status */}
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-xs uppercase tracking-widest font-medium mb-1">Plano atual</p>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-extrabold text-white">{PLAN_LABELS[tenant.plan]}</h2>
              <Badge variant="secondary" className={cn("text-xs", statusMeta.color)}>{statusMeta.label}</Badge>
            </div>
            <p className="text-white/70 text-sm">
              {formatCurrency(PLAN_PRICES[tenant.plan].brl)}/mês
            </p>

            {inTrial && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span className="text-white text-xs font-medium">
                  {trialDaysLeft === 0
                    ? "Teste gratuito termina hoje"
                    : `${trialDaysLeft} dia${trialDaysLeft === 1 ? "" : "s"} restantes no teste grátis`}
                </span>
              </div>
            )}
          </div>

          {/* Right: usage stats */}
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            {[
              { icon: BookOpen,     label: "Catálogo",      value: `até ${formatPlanLimit(limits.catalogItems)}` },
              { icon: CalendarDays, label: "Agendamentos",  value: `${formatPlanLimit(limits.appointmentsPerMonth)}/mês` },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className={cn("flex flex-col items-center px-4 py-3 rounded-xl min-w-[80px] text-center", PLAN_ICON_BG[tenant.plan], "backdrop-blur-sm")}
              >
                <Icon className="w-4 h-4 text-white/70 mb-1" />
                <p className="text-white font-bold text-sm leading-none">{value}</p>
                <p className="text-white/60 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => openPortal.mutate()}
          disabled={openPortal.isPending || !tenant.stripeCustomerId}
          className="relative mt-4 border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          {openPortal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          Gerenciar cobrança
        </Button>
      </div>

      <div className="mb-8 rounded-2xl border border-red-200 bg-red-50/50 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-red-100 p-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Cancelamento de plano e reembolso</h3>
            <p className="text-sm text-gray-600 mt-1">
              O reembolso é calculado proporcionalmente aos dias não utilizados no ciclo atual.
            </p>

            {tenant.planStatus === "CANCELED" ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                <p>
                  Assinatura já cancelada em{" "}
                  {tenant.canceledAt
                    ? format(new Date(tenant.canceledAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : "data indisponível"}
                  .
                </p>
                <p className="mt-1">
                  Último ciclo apurado: {tenant.cancellationUsageDays ?? 0}/{tenant.cancellationCycleDays ?? 0} dias usados.
                </p>
                <p className="mt-1">
                  Reembolso processado: {formatCurrency(((tenant.cancellationRefundAmount ?? 0) / 100).toFixed(2))}.
                </p>
              </div>
            ) : previewLoading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando prévia de cancelamento...
              </div>
            ) : !cancellationPreview?.canCancel ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                {cancellationPreview?.reason ?? "Nenhuma assinatura ativa encontrada para cancelamento."}
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <p className="text-xs text-gray-500">Dias usados</p>
                    <p className="text-lg font-bold text-gray-900">
                      {cancellationPreview.usedDays}/{cancellationPreview.totalCycleDays}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <p className="text-xs text-gray-500">Dias restantes</p>
                    <p className="text-lg font-bold text-gray-900">{cancellationPreview.remainingDays}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <p className="text-xs text-gray-500">Reembolso estimado</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency((cancellationPreview.refundEstimateBrl ?? 0).toFixed(2))}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  Ciclo: {cancellationPreview.periodStart ? format(new Date(cancellationPreview.periodStart), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                  {" "}até{" "}
                  {cancellationPreview.periodEnd ? format(new Date(cancellationPreview.periodEnd), "dd/MM/yyyy", { locale: ptBR }) : "-"}.
                </p>

                <label className="block mt-4 text-sm font-medium text-gray-800">Motivo do cancelamento (opcional)</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
                  rows={3}
                  maxLength={500}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Conte o motivo para ajudarmos a melhorar o produto"
                />

                <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-gray-300"
                    checked={lgpdConsent}
                    onChange={(e) => setLgpdConsent(e.target.checked)}
                  />
                  <span>
                    Confirmo o cancelamento e autorizo o tratamento mínimo dos dados para execução contratual e
                    auditoria LGPD por {cancellationPreview.lgpd?.retentionDays ?? 365} dias.
                  </span>
                </label>

                <div className="mt-3 inline-flex items-center gap-1 text-xs text-gray-500">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Base legal: {cancellationPreview.lgpd?.legalBasis ?? "EXECUCAO_CONTRATUAL"}.
                </div>

                <div className="mt-4">
                  <Button
                    type="button"
                    variant="destructiveSolid"
                    disabled={!canSubmitCancel}
                    onClick={() => {
                      const confirmed = window.confirm(
                        "Deseja cancelar agora? O reembolso proporcional será solicitado imediatamente."
                      );
                      if (confirmed) cancelPlan.mutate();
                    }}
                  >
                    {cancelPlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Cancelar plano e solicitar reembolso
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Plans comparison */}
      <div className="mb-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Planos disponíveis</h3>
        <p className="text-sm text-gray-500">
          Assinatura e cobrança processadas com Stripe.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(({ id, highlight, extras = [] }) => {
          const isCurrent = tenant.plan === id;
          const price = PLAN_PRICES[id];
          const features = [...planMarketingFeatures(id), ...extras];

          return (
            <div
              key={id}
              className={cn(
                "card flex flex-col transition-shadow",
                isCurrent && "border-2 border-brand-400 shadow-brand-100 shadow-md",
                highlight && !isCurrent && "border-brand-200 ring-1 ring-brand-200",
              )}
            >
              <div className="flex items-center justify-between mb-3">
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Plano atual
                  </span>
                ) : highlight ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
                    <Crown className="w-3 h-3" /> Mais popular
                  </span>
                ) : (
                  <span />
                )}
              </div>

              <h3 className="text-lg font-bold text-gray-900">{price.label}</h3>
              <p className="text-3xl font-extrabold text-gray-900 mt-1 mb-4">
                {formatCurrency(price.brl)}
                <span className="text-sm font-normal text-gray-500">/mês</span>
              </p>

              <ul className="space-y-2 text-sm text-gray-600 flex-1 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant={isCurrent ? "secondary" : highlight ? "default" : "secondary"}
                className={cn("w-full", isCurrent && "cursor-default opacity-60")}
                disabled={isCurrent || selectPlan.isPending}
                onClick={() => !isCurrent && selectPlan.mutate(id)}
              >
                {selectPlan.isPending && selectPlan.variables === id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCurrent ? (
                  "Plano atual"
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Selecionar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
