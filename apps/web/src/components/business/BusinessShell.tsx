"use client";

import { BusinessHeader } from "./BusinessHeader";
import { BusinessPageTransition } from "./BusinessPageTransition";
import { BusinessRouteSync } from "./BusinessRouteSync";
import { BusinessPanelHost } from "./BusinessPanelHost";
import { useBusinessId } from "@/lib/use-business-id";
import { BusinessPanelLoader } from "./BusinessPanelLoader";

export function BusinessShell({
  children,
  usePanelHost = false,
}: {
  children: React.ReactNode;
  usePanelHost?: boolean;
}) {
  const id = useBusinessId({ required: false });

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
      <BusinessPageTransition>{usePanelHost ? <BusinessPanelHost /> : children}</BusinessPageTransition>
    </div>
  );
}
