"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare, LayoutDashboard, Store, Calendar,
  HelpCircle, Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { removeToken } from "@/lib/auth";
import { logoutFirebase } from "@/lib/firebase-auth";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Extrai o businessId da URL automaticamente: /businesses/[id]/...
  const businessIdMatch = pathname.match(/\/businesses\/([^/]+)/);
  const businessId = businessIdMatch?.[1];

  const baseLinks = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/businesses", icon: Store, label: "Negócios" },
  ];

  const businessLinks = businessId
    ? [
        { href: `/businesses/${businessId}/conversations`, icon: MessageSquare, label: "Conversas" },
        { href: `/businesses/${businessId}/appointments`, icon: Calendar, label: "Agendamentos" },
        { href: `/businesses/${businessId}/catalog`, icon: Store, label: "Catálogo" },
        { href: `/businesses/${businessId}/faqs`, icon: HelpCircle, label: "FAQ" },
        { href: `/businesses/${businessId}/whatsapp`, icon: MessageSquare, label: "WhatsApp" },
        { href: `/businesses/${businessId}/settings`, icon: Settings, label: "Configurações" },
      ]
    : [];

  async function handleLogout() {
    await logoutFirebase();
    removeToken();
    router.push("/");
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-gray-900">ZapFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {baseLinks.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>

        {businessLinks.length > 0 && (
          <>
            <div className="mt-4 mb-2 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Este negócio</p>
            </div>
            <div className="space-y-0.5">
              {businessLinks.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname.startsWith(href)
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
