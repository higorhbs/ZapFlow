"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi, billingApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { PLAN_LABELS, PLAN_STATUS_LABELS, cn, formatCurrency } from "@/lib/utils";
import { PLAN_LIMITS, PLAN_PRICES, planMarketingFeatures, formatPlanLimit, effectivePlanStatus, isStarterTrialActive, isActivePaidPlan, starterTrialDaysLeft, isSubscriptionCancelScheduled, APP_DISPLAY_NAME } from "@flowdesk/shared";
import type { Plan } from "@flowdesk/firebase/client";
import { toast } from "sonner";
import { Check, Crown, Loader2, Sparkles, Zap, ArrowRight, CalendarDays, BookOpen, ExternalLink, CalendarX2, CircleDot } from "lucide-react";
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
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", uid],
    queryFn: () => tenantApi.get(),
    enabled: ready && !!uid,
  });

  const { data: billingSync } = useQuery({
    queryKey: ["billing-sync", uid],
    queryFn: async () => {
      const res = await billingApi.sync();
      void queryClient.invalidateQueries({ queryKey: ["tenant", uid] });
      return res;
    },
    enabled: ready && !!uid,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (searchParams.get("checkout") !== "success" || !uid) return;
    void billingApi.sync().then(() => {
      void queryClient.invalidateQueries({ queryKey: ["tenant", uid] });
    });
    void queryClient.invalidateQueries({ queryKey: ["tenant", uid] });
    toast.success("Pagamento recebido! Atualizando seu plano…");
    const t = window.setInterval(() => {
      void billingApi.sync().then(() => {
        void queryClient.invalidateQueries({ queryKey: ["tenant", uid] });
      });
    }, 3000);
    const stop = window.setTimeout(() => clearInterval(t), 30000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [searchParams, queryClient, uid]);

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

  if (isLoading || !tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const t = {
    ...tenant,
    ...(billingSync?.ok
      ? {
          planStatus: (billingSync.planStatus as typeof tenant.planStatus) ?? tenant.planStatus,
          cancelAtPeriodEnd: billingSync.cancelAtPeriodEnd ?? tenant.cancelAtPeriodEnd,
          currentPeriodEnd: billingSync.currentPeriodEnd ?? tenant.currentPeriodEnd,
          canceledAt: billingSync.canceledAt ?? tenant.canceledAt,
        }
      : {}),
  };

  const inTrial = isStarterTrialActive(t);
  const trialDaysLeft = starterTrialDaysLeft(t);
  const limits = PLAN_LIMITS[t.plan];
  const hasStripeBilling = Boolean(t.stripeCustomerId);
  const cancelScheduled = isSubscriptionCancelScheduled(t);
  const statusMeta = cancelScheduled
    ? { label: "Cancelamento agendado", color: "bg-amber-100 text-amber-800" }
    : PLAN_STATUS_LABELS[effectivePlanStatus(t)] ?? PLAN_STATUS_LABELS.ACTIVE;
  const accessUntil = t.currentPeriodEnd ? new Date(t.currentPeriodEnd) : null;
  const canceledOn = t.canceledAt ? new Date(t.canceledAt) : null;
  const fmtDate = (d: Date) => format(d, "dd/MM/yyyy", { locale: ptBR });
  const fmtDateTime = (d: Date) => format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Current plan hero */}
      <div className={cn(
        "relative rounded-2xl overflow-hidden bg-gradient-to-br p-6 mb-8",
        PLAN_GRADIENTS[t.plan]
      )}>
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-16 bottom-0 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Left: plan name + status */}
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-xs uppercase tracking-widest font-medium mb-1">Plano atual</p>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-extrabold text-white">{PLAN_LABELS[t.plan]}</h2>
              <Badge variant="secondary" className={cn("text-xs", statusMeta.color)}>{statusMeta.label}</Badge>
            </div>
            <p className="text-white/70 text-sm">
              {formatCurrency(PLAN_PRICES[t.plan].brl)}/mês
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
              { icon: BookOpen, label: "Catálogo", value: `até ${formatPlanLimit(limits.catalogItems)}` },
              { icon: CalendarDays, label: "Agendamentos", value: `${formatPlanLimit(limits.appointmentsPerMonth)}/mês` },
              {
                icon: CircleDot,
                label: "Stories",
                value: Number.isFinite(limits.scheduledStoriesPerMonth)
                  ? `${formatPlanLimit(limits.scheduledStoriesPerMonth)}/mês`
                  : "Ilimitado",
              },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className={cn("flex flex-col items-center px-4 py-3 rounded-xl min-w-[80px] text-center", PLAN_ICON_BG[t.plan], "backdrop-blur-sm")}
              >
                <Icon className="w-4 h-4 text-white/70 mb-1" />
                <p className="text-white font-bold text-sm leading-none">{value}</p>
                <p className="text-white/60 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {hasStripeBilling && t.planStatus !== "CANCELED" && !cancelScheduled && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => openPortal.mutate()}
            disabled={openPortal.isPending}
            className="relative mt-4 border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            {openPortal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Cancelar ou gerenciar assinatura
          </Button>
        )}
        {t.planStatus === "CANCELED" && !cancelScheduled && (
          <p className="relative mt-4 text-sm text-white/80">
            Assinatura encerrada
            {canceledOn ? ` em ${fmtDateTime(canceledOn)}` : ""}.
            {accessUntil ? ` O acesso terminou em ${fmtDate(accessUntil)}.` : " Escolha um plano abaixo para reativar."}
          </p>
        )}
      </div>

      {cancelScheduled && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-800">
              <CalendarX2 className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-base font-semibold text-gray-900">Assinatura cancelada</h3>
              {canceledOn && (
                <p className="text-sm text-gray-700">
                  Cancelamento solicitado em <strong>{fmtDateTime(canceledOn)}</strong>.
                </p>
              )}
              <p className="text-sm text-gray-700">
                <strong>Não haverá novas cobranças.</strong> Você continua com acesso ao plano{" "}
                {PLAN_LABELS[t.plan]} até{" "}
                <strong>{accessUntil ? fmtDate(accessUntil) : "o fim do ciclo atual"}</strong>.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openPortal.mutate()}
                disabled={openPortal.isPending}
                className="mt-1"
              >
                {openPortal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Reativar plano
              </Button>
            </div>
          </div>
        </div>
      )}

      {tenant.planStatus === "CANCELED" && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm text-gray-700">
            Sua assinatura foi encerrada
            {canceledOn ? ` em ${fmtDateTime(canceledOn)}` : ""}.
            {accessUntil ? ` O acesso expirou em ${fmtDate(accessUntil)}.` : ""} Escolha um plano abaixo para voltar a usar o {APP_DISPLAY_NAME}.
          </p>
        </div>
      )}

      {hasStripeBilling && tenant.planStatus !== "CANCELED" && !cancelScheduled && (
        <p className="mb-8 text-sm text-gray-500">
          Para cancelar, trocar de plano ou atualizar pagamento, use o portal Stripe acima.
        </p>
      )}

      {/* Plans comparison */}
      <div className="mb-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Planos disponíveis</h3>
        <p className="text-sm text-gray-500">
          Assinatura e cobrança processadas com Stripe.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(({ id, highlight, extras = [] }) => {
          const isPaidCurrent = isActivePaidPlan(t, id);
          const isTrialStarter = id === "STARTER" && inTrial;
          const price = PLAN_PRICES[id];
          const features = [...planMarketingFeatures(id), ...extras];

          return (
            <div
              key={id}
              className={cn(
                "card flex flex-col transition-shadow",
                (isPaidCurrent || isTrialStarter) && "border-2 border-brand-400 shadow-brand-100 shadow-md",
                highlight && !isPaidCurrent && !isTrialStarter && "border-brand-200 ring-1 ring-brand-200",
              )}
            >
              <div className="flex items-center justify-between mb-3">
                {isPaidCurrent ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Plano atual
                  </span>
                ) : isTrialStarter ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" /> Teste grátis
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
                variant={isPaidCurrent ? "secondary" : highlight ? "default" : "secondary"}
                className={cn("w-full", isPaidCurrent && "cursor-default opacity-60")}
                disabled={isPaidCurrent || selectPlan.isPending}
                onClick={() => !isPaidCurrent && selectPlan.mutate(id)}
              >
                {selectPlan.isPending && selectPlan.variables === id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPaidCurrent ? (
                  "Plano atual"
                ) : isTrialStarter ? (
                  <>
                    <Zap className="w-4 h-4" />
                    Assinar Starter
                    <ArrowRight className="w-4 h-4" />
                  </>
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
