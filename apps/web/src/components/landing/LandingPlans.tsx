"use client";

import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { WobbleCard } from "@/components/ui/wobble-card";
import { Button } from "@/components/ui/button";
import { useAuthDrawer } from "@/contexts/auth-drawer-context";
import { cn, formatCurrency } from "@/lib/utils";
import { PLAN_PRICES, planMarketingFeatures } from "@flowdesk/shared";
import type { PlanTier } from "@flowdesk/shared";

type PlanCardConfig = {
  id: PlanTier;
  highlight?: boolean;
  extras?: string[];
  containerClassName: string;
  badge?: string;
};

const PLANS: PlanCardConfig[] = [
  {
    id: "STARTER",
    containerClassName: "bg-gradient-to-br from-slate-700 to-slate-900",
  },
  {
    id: "PRO",
    highlight: true,
    extras: ["Cobrança PIX automática", "Relatórios avançados"],
    containerClassName: "bg-gradient-to-br from-brand-600 to-brand-900",
    badge: "Mais popular",
  },
  {
    id: "UNLIMITED",
    extras: ["Suporte prioritário", "Tudo do Pro"],
    containerClassName: "bg-gradient-to-br from-violet-600 to-purple-900",
  },
];

function PlanWobbleCard({
  id,
  highlight,
  extras = [],
  containerClassName,
  badge,
  onSelect,
}: PlanCardConfig & { onSelect: () => void }) {
  const price = PLAN_PRICES[id];
  const features = [...planMarketingFeatures(id), ...extras];

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col",
        highlight && "lg:-mt-2 lg:mb-2",
      )}
    >
      <WobbleCard
        containerClassName={cn(
          "h-full min-h-[22rem] sm:min-h-[24rem]",
          containerClassName,
          highlight &&
            "ring-2 ring-brand-300/80 ring-offset-2 ring-offset-transparent",
        )}
        className="flex h-full flex-col px-5 py-8 sm:px-7 sm:py-10"
      >
        <div className="relative z-10 flex h-full flex-col text-white">
          {badge ? (
            <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Crown className="size-3" aria-hidden />
              {badge}
            </span>
          ) : (
            <span className="mb-4 h-6" aria-hidden />
          )}

          <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
            {price.label}
          </h3>
          <p className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {formatCurrency(price.brl)}
            </span>
            <span className="text-sm font-medium text-white/70">/mês</span>
          </p>
          <p className="mt-1 text-sm text-white/65">
            {id === "STARTER" ? "14 dias grátis · sem cartão" : "Cobrança imediata"}
          </p>

          <ul className="mt-6 flex-1 space-y-2.5 text-sm text-white/90">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-white"
                  aria-hidden
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            type="button"
            onClick={onSelect}
            className={cn(
              "relative z-10 mt-8 h-11 w-full rounded-full font-semibold",
              highlight
                ? "bg-white text-brand-800 hover:bg-white/90"
                : "bg-white/15 text-white backdrop-blur-sm hover:bg-white/25",
            )}
          >
            {id === "STARTER" ? "Começar grátis" : "Assinar agora"}
          </Button>
        </div>
      </WobbleCard>
    </div>
  );
}

export function LandingPlans() {
  const { openAuth } = useAuthDrawer();

  return (
    <section
      id="precos"
      aria-labelledby="plans-heading"
      className="relative scroll-mt-24 overflow-hidden border-t border-slate-200/80 bg-gradient-to-b from-slate-100/90 via-[#f3f0fa] to-white py-16 sm:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(124,58,237,0.1),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-brand-800 shadow-sm backdrop-blur-sm">
            <Zap className="size-3" aria-hidden />
            Starter: 14 dias grátis
          </span>
          <h2
            id="plans-heading"
            className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Planos simples para crescer no WhatsApp
          </h2>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Sem taxa escondida. Escale quando precisar — do trial ao plano completo.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:gap-8 lg:grid-cols-3 lg:items-stretch">
          {PLANS.map((plan) => (
            <PlanWobbleCard
              key={plan.id}
              {...plan}
              onSelect={() => openAuth("register")}
            />
          ))}
        </div>

        <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
          <Sparkles className="size-4 text-brand-600" aria-hidden />
          Cancele quando quiser
        </p>
      </div>
    </section>
  );
}
