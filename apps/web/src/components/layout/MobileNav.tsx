"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Calendar, BookOpen, Bot, Settings, Banknote } from "lucide-react";
import { businessApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

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

  const links = [
    { href: `/businesses/${business.id}/conversations`, icon: MessageSquare, label: "Conversas" },
    { href: `/businesses/${business.id}/appointments`, icon: Calendar, label: "Agenda" },
    { href: `/businesses/${business.id}/catalog`, icon: BookOpen, label: "Catálogo" },
    { href: `/businesses/${business.id}/payments`, icon: Banknote, label: "Pagto" },
    { href: `/businesses/${business.id}/faqs`, icon: Bot, label: "FAQ" },
    { href: `/businesses/${business.id}/settings`, icon: Settings, label: "Ajustes" },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
      <nav className="grid grid-cols-6">
        {links.map(({ href, icon: Icon, label }) => {
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
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
