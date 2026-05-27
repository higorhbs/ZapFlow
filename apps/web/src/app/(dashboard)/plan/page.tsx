"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi, businessApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { PLAN_LABELS, PLAN_STATUS_LABELS, cn, formatCurrency } from "@/lib/utils";
import { PLAN_LIMITS, PLAN_PRICES, planMarketingFeatures, formatPlanLimit } from "@zapflow/shared";
import type { Plan } from "@zapflow/firebase/client";
import { toast } from "sonner";
import { Check, Crown, Loader2, Sparkles, Zap } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const PLANS: { id: Plan; highlight?: boolean; extras?: string[] }[] = [
  { id: "STARTER" },
  { id: "PRO", highlight: true, extras: ["Cobrança PIX automática", "Relatórios avançados"] },
  { id: "UNLIMITED", extras: ["Suporte prioritário", "Tudo do Pro"] },
];

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
    mutationFn: (plan: Plan) => tenantApi.updatePlan(plan),
    onSuccess: (_, plan) => {
      queryClient.invalidateQueries({ queryKey: ["tenant", uid] });
      toast.success(`Plano ${PLAN_LABELS[plan]} selecionado!`);
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao alterar plano"),
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
  const phoneUsed = businesses.length;
  const phoneLimit = limits.phones;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Meu plano</h1>
        <p className="text-gray-500 mt-1">Gerencie sua assinatura e limites de uso</p>
      </div>

      <div className="card mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Plano atual</p>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{PLAN_LABELS[tenant.plan]}</h2>
              <span className={cn("badge text-xs", statusMeta.color)}>{statusMeta.label}</span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {formatCurrency(PLAN_PRICES[tenant.plan].brl)}/mês
            </p>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            {inTrial ? (
              <p className="flex items-center gap-2 text-brand-700 font-medium">
                <Sparkles className="w-4 h-4" />
                {trialDaysLeft === 0
                  ? "Teste grátis termina hoje"
                  : `${trialDaysLeft} dia${trialDaysLeft === 1 ? "" : "s"} restantes no teste`}
              </p>
            ) : null}
            <p>
              Teste até:{" "}
              <strong>{format(new Date(tenant.trialEndsAt), "dd MMM yyyy", { locale: ptBR })}</strong>
            </p>
            <p>
              Negócios: <strong>{phoneUsed}</strong> de <strong>{phoneLimit}</strong> permitidos
            </p>
            <p>
              Catálogo: até <strong>{formatPlanLimit(limits.catalogItems)}</strong> itens por negócio
            </p>
            <p>
              Agendamentos: até <strong>{formatPlanLimit(limits.appointmentsPerMonth)}</strong>/mês
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Escolha o plano ideal. A cobrança por cartão será integrada em breve; por enquanto a troca é
        imediata na sua conta.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(({ id, highlight, extras = [] }) => {
          const isCurrent = tenant.plan === id;
          const price = PLAN_PRICES[id];
          const features = [...planMarketingFeatures(id), ...extras];

          return (
            <div
              key={id}
              className={cn(
                "card flex flex-col",
                highlight && "border-brand-400 ring-2 ring-brand-400 ring-offset-2",
                isCurrent && !highlight && "border-brand-300"
              )}
            >
              {highlight && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 mb-2">
                  <Crown className="w-3 h-3" /> Mais popular
                </span>
              )}
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
                  isCurrent ? "btn-secondary cursor-default" : highlight ? "btn-primary" : "btn-secondary"
                )}
                disabled={isCurrent || selectPlan.isPending}
                onClick={() => selectPlan.mutate(id)}
              >
                {selectPlan.isPending && selectPlan.variables === id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCurrent ? (
                  "Plano atual"
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Selecionar
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
