"use client";

import { useEffect } from "react";
import { useBusinessId } from "@/lib/use-business-id";
import { useEffectivePathname } from "@/lib/use-effective-pathname";
import { fixPlaceholderBusinessPath } from "@/lib/business-route";

export function BusinessRouteSync() {
  const pathname = useEffectivePathname();
  const businessId = useBusinessId({ required: false });

  useEffect(() => {
    if (!businessId) return;
    const fixed = fixPlaceholderBusinessPath(window.location.pathname, businessId);
    if (!fixed || fixed === window.location.pathname) return;
    window.history.replaceState(null, "", `${fixed}${window.location.search}${window.location.hash}`);
  }, [businessId, pathname]);

  return null;
}
