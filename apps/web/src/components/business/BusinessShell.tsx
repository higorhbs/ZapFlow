"use client";

import { useEffect, useState } from "react";
import { BusinessHeader } from "./BusinessHeader";
import { BusinessPageTransition } from "./BusinessPageTransition";
import { BusinessRouteSync } from "./BusinessRouteSync";
import { useBusinessId } from "@/lib/use-business-id";
import { useSyncWhatsAppBusiness } from "@/lib/use-sync-wa-business";
import { BusinessPanelLoader } from "./BusinessPanelLoader";
import { BusinessPanelHost } from "./BusinessPanelHost";
import { getBusinessPanelSegment } from "@/lib/business-nav";
import { isFirebaseHostingClient } from "@/lib/hosting-href";
import { BUSINESS_PANEL_NAV_EVENT } from "@/lib/use-business-panel-nav";

export function BusinessShell({ children }: { children: React.ReactNode }) {
  const id = useBusinessId({ required: false });
  useSyncWhatsAppBusiness(id || "");
  const [panelSpa, setPanelSpa] = useState(false);

  useEffect(() => {
    if (!isFirebaseHostingClient()) return;
    const syncSpa = () => {
      setPanelSpa(getBusinessPanelSegment(window.location.pathname) !== null);
    };
    syncSpa();
    window.addEventListener(BUSINESS_PANEL_NAV_EVENT, syncSpa);
    window.addEventListener("popstate", syncSpa);
    return () => {
      window.removeEventListener(BUSINESS_PANEL_NAV_EVENT, syncSpa);
      window.removeEventListener("popstate", syncSpa);
    };
  }, []);

  if (!id) {
    return (
      <div className="flex flex-col min-h-full">
        <BusinessRouteSync />
        <BusinessPanelLoader />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <BusinessRouteSync />
      <BusinessHeader businessId={id} />
      {panelSpa ? (
        <BusinessPanelHost />
      ) : (
        <BusinessPageTransition>{children}</BusinessPageTransition>
      )}
    </div>
  );
}
