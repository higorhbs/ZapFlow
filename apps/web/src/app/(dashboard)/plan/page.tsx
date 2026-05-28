"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi, businessApi, billingApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { PLAN_LABELS, PLAN_STATUS_LABELS, cn, formatCurrency } from "@/lib/utils";
import { PLAN_LIMITS, PLAN_PRICES, planMarketingFeatures, formatPlanLimit } from "@zapflow/shared";
import type { Plan } from "@zapflow/firebase/client";
import { toast } from "sonner";
import { Check, Crown, Loader2, Sparkles, Zap, ArrowRight, CalendarDays, BookOpen, CreditCard } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  const statusMeta = PLAN_STATUS_LABELS[tenant.planStatus] ?? PLAN_STATUS_LABELS.ACTIVE;
  const trialDaysLeft = differenceInDays(new Date(tenant.trialEndsAt), new Date());
  const inTrial = tenant.planStatus === "TRIALING" && trialDaysLeft >= 0;
  const limits = PLAN_LIMITS[tenant.plan];

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
              <span className={cn("badge text-xs", statusMeta.color)}>{statusMeta.label}</span>
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

        {!inTrial && (
          <p className="relative text-white/50 text-xs mt-4">
            Teste até {format(new Date(tenant.trialEndsAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        )}
        <button
          type="button"
          onClick={() => openPortal.mutate()}
          disabled={openPortal.isPending || !tenant.stripeCustomerId}
          className="relative mt-4 btn-secondary text-xs bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-40"
        >
          {openPortal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          Gerenciar cobrança
        </button>
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

              <button
                type="button"
                className={cn(
                  "w-full",
                  isCurrent
                    ? "btn-secondary cursor-default opacity-60"
                    : highlight
                    ? "btn-primary"
                    : "btn-secondary"
                )}
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
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
