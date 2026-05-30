"use client";

import { useQuery } from "@tanstack/react-query";
import { businessApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { getBusinessTypeLabel } from "@/lib/utils";
import { Wifi, WifiOff, Store } from "lucide-react";

export function BusinessHeader({ businessId }: { businessId: string }) {
  const { uid, ready } = useAuth();

  const { data: business } = useQuery({
    queryKey: ["business", businessId],
    queryFn: () => businessApi.get(businessId),
    enabled: !!businessId && ready && !!uid,
  });

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
        <Store className="w-5 h-5 text-brand-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-gray-900 truncate">
            {business?.name ?? "Carregando…"}
          </h2>
          {business && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              {getBusinessTypeLabel(business.type, business.typeLabel)}
            </span>
          )}
        </div>
        {business && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {business.isConnected ? (
              <>
                <Wifi className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Conectado</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">Desconectado</span>
              </>
            )}
            {business.phone && (
              <>
                <span className="text-gray-300 text-xs">·</span>
                <span className="text-xs text-gray-400">{business.phone}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
