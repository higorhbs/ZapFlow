"use client";

import { useEffect, useState } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { tenantApi } from "@/lib/api";
import { watchAuth } from "@/lib/firebase-auth";
import { useAuth } from "@/contexts/auth-context";
import { PLAN_LABELS, cn } from "@/lib/utils";
import { ChevronRight, Crown, Zap } from "lucide-react";

const PLAN_STYLE: Record<string, {
  avatarActive: string;
  avatarIdle: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ReactNode;
}> = {
  FREE: {
    avatarActive: "bg-gray-700 text-white",
    avatarIdle:   "bg-gray-100 text-gray-700",
    badgeBg:      "bg-gray-100",
    badgeText:    "text-gray-600",
    icon: <Zap className="w-2.5 h-2.5" />,
  },
  PRO: {
    avatarActive: "bg-brand-600 text-white",
    avatarIdle:   "bg-brand-100 text-brand-700",
    badgeBg:      "bg-brand-50",
    badgeText:    "text-brand-700",
    icon: <Zap className="w-2.5 h-2.5" />,
  },
  UNLIMITED: {
    avatarActive: "bg-violet-600 text-white",
    avatarIdle:   "bg-violet-100 text-violet-700",
    badgeBg:      "bg-violet-50",
    badgeText:    "text-violet-700",
    icon: <Crown className="w-2.5 h-2.5" />,
  },
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export function SidebarProfile() {
  const pathname = usePathname();
  const { uid, ready } = useAuth();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => watchAuth(setUser), []);

  const { data: tenant } = useQuery({
    queryKey: ["tenant", uid],
    queryFn: () => tenantApi.get(),
    enabled: ready && !!uid,
  });

  const name = tenant?.name ?? user?.displayName ?? user?.email?.split("@")[0] ?? "Minha conta";
  const email = tenant?.email ?? user?.email ?? "";
  const photoURL = user?.photoURL ?? null;
  const active = pathname === "/profile";
  const plan = (tenant?.plan ?? "FREE") as string;
  const ps = PLAN_STYLE[plan] ?? PLAN_STYLE.FREE;

  return (
    <Link
      href="/profile"
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 mb-2 rounded-lg transition-colors group",
        active ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-gray-50"
      )}
    >
      {photoURL ? (
        <img
          src={photoURL}
          alt={name}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
            active ? ps.avatarActive : ps.avatarIdle
          )}
        >
          {initials(name)}
        </div>
      )}
      <div className="flex-1 min-w-0 text-left">
        <p className={cn("text-sm font-medium truncate", active ? "text-brand-800" : "text-gray-900")}>
          {name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {tenant && (
            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold", ps.badgeBg, ps.badgeText)}>
              {ps.icon}
              {PLAN_LABELS[plan]}
            </span>
          )}
          {email && !tenant && (
            <p className="text-xs text-gray-500 truncate">{email}</p>
          )}
        </div>
      </div>
      <ChevronRight
        className={cn(
          "w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-gray-600",
          active && "text-brand-600"
        )}
      />
    </Link>
  );
}
