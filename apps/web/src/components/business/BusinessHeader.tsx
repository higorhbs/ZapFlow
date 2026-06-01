"use client";

import { useQuery } from "@tanstack/react-query";
import { businessApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { getBusinessTypeLabel } from "@/lib/utils";
import { WifiOff, Store } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";

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
          <div className="flex items-center gap-2 mt-0.5">
            {business.isConnected ? (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-200">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-green-500" />
                </span>
                <span className="text-xs text-green-700 font-medium">Conectado</span>
              </div>
            ) : (
              <Link
                href={`/businesses/${businessId}/whatsapp`}
                className="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all"
              >
                <WifiOff className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-amber-700 font-medium">Desconectado</span>
                <span className="text-[10px] text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">· Conectar</span>
              </Link>
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
