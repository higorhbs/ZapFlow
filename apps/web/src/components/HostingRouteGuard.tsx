"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { sanitizeHostingPath } from "@/lib/app-navigation";
import { hostingHref, isFirebaseHostingClient } from "@/lib/hosting-href";

export function HostingRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !isFirebaseHostingClient()) return;

    if (pathname.includes("$") || window.location.pathname.includes("$")) {
      window.location.replace(hostingHref("/dashboard"));
      return;
    }

    const txtFix = sanitizeHostingPath(pathname);
    if (txtFix) {
      window.location.replace(txtFix);
      return;
    }

    const path = window.location.pathname;
    const canonical = hostingHref(path);
    if (canonical !== path) {
      window.location.replace(`${canonical}${window.location.search}${window.location.hash}`);
    }
  }, [pathname]);

  return <>{children}</>;
}
