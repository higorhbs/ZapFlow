"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BUSINESS_PANEL_NAV_EVENT } from "@/lib/use-business-panel-nav";

function readPathname(fallback: string): string {
  return typeof window !== "undefined" ? window.location.pathname || fallback : fallback;
}

export function useEffectivePathname(): string {
  const nextPath = usePathname() ?? "";
  const [path, setPath] = useState(() => readPathname(nextPath));

  useEffect(() => {
    const sync = () => setPath(readPathname(nextPath));
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener(BUSINESS_PANEL_NAV_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(BUSINESS_PANEL_NAV_EVENT, sync);
    };
  }, [nextPath]);

  if (typeof window !== "undefined") {
    return window.location.pathname || path;
  }

  return path;
}
