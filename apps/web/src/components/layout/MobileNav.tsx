"use client";

import { AppLink as Link } from "@/components/AppLink";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Calendar, BookOpen, Settings, Banknote } from "lucide-react";
import { IaIcon } from "@/lib/ia-brand";
import { businessApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { usePlanAllowsPix } from "@/lib/use-plan-allows-pix";
import { useBusinessVocabulary } from "@/lib/use-business-vocabulary";
import { VocabLabel } from "@/components/layout/VocabLabel";
import { BusinessNavLink } from "@/components/layout/BusinessNavLink";
import { panelHref } from "@/lib/business-nav";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const { uid, ready } = useAuth();
  const v = useBusinessVocabulary({ requiredId: false });

  const { pixEnabled } = usePlanAllowsPix();

  const { data: businesses } = useQuery({
    queryKey: ["businesses", uid],
    queryFn: businessApi.list,
    enabled: ready && !!uid,
  });

  const business = businesses?.[0];
  const navId = v.businessId || business?.id;
  if (!navId) return null;

  const links = [
    { href: panelHref(navId, "conversations"), icon: MessageSquare, label: "Conversas", vocab: false },
    { href: panelHref(navId, "appointments"), icon: Calendar, label: v.bookingsNavShort, vocab: true },
    { href: panelHref(navId, "catalog"), icon: BookOpen, label: v.catalogNavShort, vocab: true },
    ...(pixEnabled
      ? [{ href: `${panelHref(navId, "faqs")}?sec=pix`, icon: Banknote, label: "Pagto", vocab: false as const }]
      : []),
    { href: panelHref(navId, "faqs"), icon: IaIcon, label: "IA", vocab: false },
    { href: panelHref(navId, "settings"), icon: Settings, label: "Ajustes", vocab: false },
  ];

  const gridCols = links.length >= 6 ? "grid-cols-6" : links.length === 5 ? "grid-cols-5" : "grid-cols-4";

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
      <nav className={cn("grid", gridCols)}>
        {links.map(({ href, icon: Icon, label, vocab }) => (
          <BusinessNavLink
            key={href}
            href={href}
            icon={Icon}
            layout="mobile"
            label={
              vocab ? (
                <VocabLabel ready={v.vocabReady} width="3.25rem" className="mx-auto">
                  {label}
                </VocabLabel>
              ) : (
                label
              )
            }
          />
        ))}
      </nav>
    </div>
  );
}
