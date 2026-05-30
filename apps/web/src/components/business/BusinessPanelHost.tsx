"use client";

import { lazy, Suspense } from "react";
import { useEffectivePathname } from "@/lib/use-effective-pathname";
import { getBusinessPanelSegment } from "@/lib/business-nav";
import { BusinessPageTransition } from "./BusinessPageTransition";
import { BusinessPanelLoader } from "./BusinessPanelLoader";
import { RequireWhatsAppConnection } from "./RequireWhatsAppConnection";

const panels = {
  conversations: lazy(() => import("@/app/(dashboard)/businesses/[id]/conversations/page")),
  appointments: lazy(() => import("@/app/(dashboard)/businesses/[id]/appointments/page")),
  catalog: lazy(() => import("@/app/(dashboard)/businesses/[id]/catalog/page")),
  payments: lazy(() => import("@/app/(dashboard)/businesses/[id]/payments/page")),
  faqs: lazy(() => import("@/app/(dashboard)/businesses/[id]/faqs/page")),
  whatsapp: lazy(() => import("@/app/(dashboard)/businesses/[id]/whatsapp/page")),
  settings: lazy(() => import("@/app/(dashboard)/businesses/[id]/settings/page")),
} as const;

export function BusinessPanelHost() {
  const pathname = useEffectivePathname();
  const segment = getBusinessPanelSegment(pathname) ?? "conversations";
  const Panel = panels[segment];
  const panel = (
    <Suspense fallback={<BusinessPanelLoader />}>
      <Panel />
    </Suspense>
  );

  return (
    <BusinessPageTransition>
      {segment === "conversations" ? (
        <RequireWhatsAppConnection>{panel}</RequireWhatsAppConnection>
      ) : (
        panel
      )}
    </BusinessPageTransition>
  );
}
