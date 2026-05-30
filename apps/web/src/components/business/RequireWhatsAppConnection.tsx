"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useBusinessId } from "@/lib/use-business-id";
import { useSyncWhatsAppBusiness } from "@/lib/use-sync-wa-business";
import { useAppRouter } from "@/lib/app-navigation";
import { panelHref } from "@/lib/business-nav";

export function RequireWhatsAppConnection({ children }: { children: React.ReactNode }) {
  const businessId = useBusinessId();
  const router = useAppRouter();
  const { data: status, isLoading } = useSyncWhatsAppBusiness(businessId);
  const connected = status?.connected === true;
  const whatsappPath = panelHref(businessId, "whatsapp");

  useEffect(() => {
    if (!businessId || isLoading || connected) return;
    router.replace(whatsappPath);
  }, [businessId, isLoading, connected, whatsappPath, router]);

  if (isLoading || !connected) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[320px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return <>{children}</>;
}
