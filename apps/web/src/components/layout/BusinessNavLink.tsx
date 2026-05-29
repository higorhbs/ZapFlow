"use client";

import type { MouseEvent } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { cn } from "@/lib/utils";
import { isActivePanelRoute, isBusinessPanelHref } from "@/lib/business-nav";
import { useEffectivePathname } from "@/lib/use-effective-pathname";
import { isFirebaseHostingClient } from "@/lib/hosting-href";
import { navigateBusinessPanel } from "@/lib/use-business-panel-nav";
import type { LucideIcon } from "lucide-react";

type BusinessNavLinkProps = {
  href: string;
  icon: LucideIcon;
  label: React.ReactNode;
  badge?: React.ReactNode;
  layout?: "sidebar" | "mobile";
};

export function BusinessNavLink({
  href,
  icon: Icon,
  label,
  badge,
  layout = "sidebar",
}: BusinessNavLinkProps) {
  const pathname = useEffectivePathname();
  const active = isActivePanelRoute(pathname, href);

  const onPanelClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!isFirebaseHostingClient() || !isBusinessPanelHref(href)) return;
    e.preventDefault();
    e.stopPropagation();
    navigateBusinessPanel(href);
  };

  if (layout === "mobile") {
    return (
      <Link
        href={href}
        onClick={onPanelClick}
        className={cn(
          "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-200",
          active ? "text-brand-700" : "text-gray-500 hover:text-gray-700"
        )}
      >
        <span
          className={cn(
            "absolute top-0 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-brand-600 transition-all duration-300",
            active ? "opacity-100 scale-100" : "opacity-0 scale-50"
          )}
        />
        <Icon
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            active && "text-brand-600 scale-110"
          )}
        />
        <span suppressHydrationWarning>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onPanelClick}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        active
          ? "bg-brand-50 text-brand-700 shadow-sm"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-600 transition-all duration-300",
          active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
        )}
      />
      <Icon className={cn("w-4 h-4 shrink-0 transition-colors", active && "text-brand-600")} />
      <span className="flex-1 min-w-0" suppressHydrationWarning>
        {label}
      </span>
      {badge}
    </Link>
  );
}
