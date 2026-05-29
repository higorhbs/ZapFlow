"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { tenantApi, billingApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { PLAN_LABELS, formatCurrency } from "@/lib/utils";
import { PLAN_PRICES, planMarketingFeatures } from "@zapflow/shared";
import type { Plan } from "@zapflow/firebase/client";
import { toast } from "sonner";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check, Crown, Loader2, Zap, Lock, AlertTriangle, Clock, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const PLANS: { id: Plan; highlight?: boolean; extras?: string[] }[] = [
  { id: "STARTER" },
  { id: "PRO", highlight: true, extras: ["Cobrança PIX automática", "Relatórios avançados"] },
  { id: "UNLIMITED", extras: ["Suporte prioritário", "Tudo do Pro"] },
];

function PlanCard({
  id,
  highlight,
  extras = [],
  onSelect,
  loading,
}: {
  id: Plan;
  highlight?: boolean;
  extras?: string[];
  onSelect: (plan: Plan) => void;
  loading: boolean;
}) {
  const price = PLAN_PRICES[id];
  const features = [...planMarketingFeatures(id), ...extras];

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-white p-5 transition-shadow",
        highlight
          ? "border-brand-400 ring-2 ring-brand-400 ring-offset-2 shadow-lg shadow-brand-100"
          : "border-gray-200"
      )}
    >
      {highlight && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 mb-2">
          <Crown className="w-3 h-3" /> Mais popular
        </span>
      )}
      <h3 className="text-base font-bold text-gray-900">{price.label}</h3>
      <p className="text-2xl font-extrabold text-gray-900 mt-1 mb-4">
        {formatCurrency(price.brl)}
        <span className="text-xs font-normal text-gray-500">/mês</span>
      </p>
      <ul className="space-y-1.5 text-xs text-gray-600 flex-1 mb-5">
        {features.slice(0, 4).map((f) => (
          <li key={f} className="flex items-start gap-1.5">
            <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant={highlight ? "default" : "secondary"}
        className="w-full"
        onClick={() => onSelect(id)}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Escolher {PLAN_LABELS[id]}
          </>
        )}
      </Button>
    </div>
  );
}

export function TrialGate() {
  const { uid, ready } = useAuth();
  const [selectingPlan, setSelectingPlan] = useState<Plan | null>(null);

  const { data: tenant } = useQuery({
    queryKey: ["tenant", uid],
    queryFn: () => tenantApi.get(),
    enabled: ready && !!uid,
    refetchInterval: 60_000,
  });

  const selectPlan = useMutation({
    mutationFn: async (plan: Plan) => {
      const res = await billingApi.checkout(plan);
      if (!res?.url) throw new Error("Não foi possível iniciar checkout Stripe.");
      window.location.href = res.url;
      return plan;
    },
    onMutate: (plan) => setSelectingPlan(plan),
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao iniciar checkout");
      setSelectingPlan(null);
    },
  });

  if (!tenant) return null;

  const now = new Date();
  const sevenDaysFromCreation = new Date(new Date(tenant.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
  const trialEnd = new Date(Math.min(new Date(tenant.trialEndsAt).getTime(), sevenDaysFromCreation.getTime()));
  const daysLeft = differenceInDays(trialEnd, now);
  const trialExpired = now > trialEnd;

  const isBlocked =
    (tenant.planStatus === "TRIALING" && trialExpired) ||
    tenant.planStatus === "PAST_DUE" ||
    tenant.planStatus === "CANCELED";

  const showBanner =
    tenant.planStatus === "TRIALING" && !trialExpired && daysLeft <= 3;

  if (!isBlocked && !showBanner) return null;

  return (
    <>
      {/* Countdown banner */}
      {showBanner && !isBlocked && (
        <div className="fixed top-0 inset-x-0 z-40 bg-amber-500 text-white px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium shadow">
          <Clock className="w-4 h-4 flex-shrink-0" />
          {daysLeft === 0
            ? "Seu teste gratuito termina hoje! Escolha um plano para continuar."
            : `${daysLeft} dia${daysLeft === 1 ? "" : "s"} restante${daysLeft === 1 ? "" : "s"} no teste grátis.`}
          <a href="/plan" className="underline underline-offset-2 ml-1 hover:text-amber-100">
            Ver planos →
          </a>
        </div>
      )}

      {/* Blocking overlay */}
      {isBlocked && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="w-full max-w-3xl">

            {/* Header card */}
            <div className="rounded-2xl bg-white shadow-2xl overflow-hidden mb-4">
              <div className="h-1.5 bg-gradient-to-r from-brand-500 via-violet-500 to-brand-500 bg-[length:200%] animate-[shimmer_2s_linear_infinite]" />
              <div className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  {tenant.planStatus === "PAST_DUE" ? (
                    <>
                      <h2 className="text-xl font-bold text-gray-900">Pagamento em atraso</h2>
                      <p className="text-gray-500 text-sm mt-1">
                        Sua assinatura está com pagamento pendente. Regularize para retomar o acesso.
                      </p>
                    </>
                  ) : tenant.planStatus === "CANCELED" ? (
                    <>
                      <h2 className="text-xl font-bold text-gray-900">Assinatura cancelada</h2>
                      <p className="text-gray-500 text-sm mt-1">
                        Sua assinatura foi cancelada. Escolha um plano abaixo para voltar a usar o AtendeJa.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-gray-900">Seu teste gratuito encerrou</h2>
                      <p className="text-gray-500 text-sm mt-1">
                        O período de 7 dias expirou em{" "}
                        <strong>{format(trialEnd, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</strong>.
                        Escolha um plano para continuar usando o AtendeJa.
                      </p>
                    </>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {PLANS.map(({ id, highlight, extras }) => (
                <PlanCard
                  key={id}
                  id={id}
                  highlight={highlight}
                  extras={extras}
                  onSelect={(plan) => selectPlan.mutate(plan)}
                  loading={selectPlan.isPending && selectingPlan === id}
                />
              ))}
            </div>

            {/* Footer note */}
            <p className="text-center text-xs text-white/70">
              Pagamento seguro via Stripe. Após confirmar, o acesso é liberado automaticamente.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
