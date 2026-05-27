"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { tenantApi } from "@/lib/api";
import { watchAuth } from "@/lib/firebase-auth";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

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
  const active = pathname === "/profile";

  return (
    <Link
      href="/profile"
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 mb-2 rounded-lg transition-colors group",
        active ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-gray-50"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
          active ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700"
        )}
      >
        {initials(name)}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className={cn("text-sm font-medium truncate", active ? "text-brand-800" : "text-gray-900")}>
          {name}
        </p>
        {email ? (
          <p className="text-xs text-gray-500 truncate">{email}</p>
        ) : (
          <p className="text-xs text-gray-400">Ver perfil</p>
        )}
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
