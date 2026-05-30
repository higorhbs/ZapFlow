"use client";

import { useCallback, useEffect } from "react";
import { Loader2, Smartphone, WifiOff } from "lucide-react";
import { useBusinessId } from "@/lib/use-business-id";
import { useSyncWhatsAppBusiness } from "@/lib/use-sync-wa-business";
import { useAppRouter } from "@/lib/app-navigation";
import { canUseBusinessPanelSpa, panelHref } from "@/lib/business-nav";
import { navigateBusinessPanel } from "@/lib/use-business-panel-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function RequireWhatsAppConnection({ children }: { children: React.ReactNode }) {
  const businessId = useBusinessId();
  const router = useAppRouter();
  const { data: status, isLoading, isFetched } = useSyncWhatsAppBusiness(businessId);
  const connected = status?.connected === true;
  const whatsappPath = panelHref(businessId, "whatsapp");

  const goWhatsApp = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      canUseBusinessPanelSpa(window.location.pathname) &&
      canUseBusinessPanelSpa(whatsappPath)
    ) {
      navigateBusinessPanel(whatsappPath);
      return;
    }
    router.replace(whatsappPath);
  }, [whatsappPath, router]);

  useEffect(() => {
    if (!businessId || !isFetched || connected) return;
    goWhatsApp();
  }, [businessId, isFetched, connected, goWhatsApp]);

  if (!businessId || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[320px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[320px] p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp desconectado</h2>
          <p className="text-sm text-gray-500 mb-6">
            Conecte seu WhatsApp para ver conversas com clientes e enviar mensagens pelo painel.
          </p>
          <Button type="button" className="w-full" onClick={goWhatsApp}>
            <Smartphone className="w-4 h-4" />
            Conectar WhatsApp
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
