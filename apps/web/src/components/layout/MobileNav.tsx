"use client";

import { AppLink as Link } from "@/components/AppLink";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Calendar, BookOpen, Bot, Settings, Banknote } from "lucide-react";
import { businessApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { useBusinessVocabulary } from "@/lib/use-business-vocabulary";
import { VocabLabel } from "@/components/layout/VocabLabel";

export function MobileNav() {
  const pathname = usePathname();
  const { uid, ready } = useAuth();

  const { data: businesses } = useQuery({
    queryKey: ["businesses", uid],
    queryFn: businessApi.list,
    enabled: ready && !!uid,
  });

  const business = businesses?.[0];
  if (!business) return null;

  const v = useBusinessVocabulary({ requiredId: false });
  const navId = v.businessId || business.id;

  const links = [
    { href: `/businesses/${navId}/conversations`, icon: MessageSquare, label: "Conversas", vocab: false },
    { href: `/businesses/${navId}/appointments`, icon: Calendar, label: v.bookingsNavShort, vocab: true },
    { href: `/businesses/${navId}/catalog`, icon: BookOpen, label: v.catalogNavShort, vocab: true },
    { href: `/businesses/${navId}/payments`, icon: Banknote, label: "Pagto", vocab: false },
    { href: `/businesses/${navId}/faqs`, icon: Bot, label: "FAQ", vocab: false },
    { href: `/businesses/${navId}/settings`, icon: Settings, label: "Ajustes", vocab: false },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
      <nav className="grid grid-cols-6">
        {links.map(({ href, icon: Icon, label, vocab }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium",
                active ? "text-brand-700" : "text-gray-500"
              )}
            >
              <Icon className={cn("w-4 h-4", active && "text-brand-600")} />
              <span suppressHydrationWarning>
                {vocab ? (
                  <VocabLabel ready={v.vocabReady} width="3.25rem" className="mx-auto">
                    {label}
                  </VocabLabel>
                ) : (
                  label
                )}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
