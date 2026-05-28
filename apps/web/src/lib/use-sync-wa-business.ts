"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { whatsappApi, businessApi } from "@/lib/api";
import { invalidateBusinessData } from "@/lib/invalidate-business";

export function useSyncWhatsAppBusiness(businessId: string) {
  const queryClient = useQueryClient();
  const lastSynced = useRef<boolean | null>(null);

  const query = useQuery({
    queryKey: ["wa-status", businessId],
    queryFn: () => whatsappApi.status(businessId),
    refetchInterval: (q) => {
      if (q.state.data?.connected) return 15000;
      if (q.state.data?.qr) return 1500;
      return 2000;
    },
  });

  useEffect(() => {
    const connected = query.data?.connected;
    if (connected === undefined) return;
    if (lastSynced.current === connected) return;
    lastSynced.current = connected;
    void businessApi.setConnected(businessId, connected).then(() => {
      invalidateBusinessData(queryClient, businessId);
    });
  }, [query.data?.connected, businessId, queryClient]);

  return query;
}

export function markWhatsAppConnected(
  queryClient: ReturnType<typeof useQueryClient>,
  businessId: string,
  connected: boolean,
  lastSyncedRef: MutableRefObject<boolean | null>
) {
  lastSyncedRef.current = connected;
  return businessApi.setConnected(businessId, connected).then(() => {
    invalidateBusinessData(queryClient, businessId);
    void queryClient.invalidateQueries({ queryKey: ["wa-status", businessId] });
  });
}
