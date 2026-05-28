"use client";

import { useQuery } from "@tanstack/react-query";
import { getBusinessVocabulary } from "@zapflow/shared";
import { businessApi } from "./api";
import { useBusinessId } from "./use-business-id";
import { useAuth } from "@/contexts/auth-context";

export function useBusinessVocabulary() {
  const businessId = useBusinessId();
  const { uid, ready } = useAuth();
  const { data: business } = useQuery({
    queryKey: ["business", businessId],
    queryFn: () => businessApi.get(businessId),
    enabled: ready && !!uid && !!businessId,
  });
  const { data: businesses } = useQuery({
    queryKey: ["businesses", uid],
    queryFn: businessApi.list,
    enabled: ready && !!uid && !business?.type,
  });
  const type =
    business?.type ??
    businesses?.find((b) => b.id === businessId)?.type ??
    businesses?.[0]?.type;
  const vocab = getBusinessVocabulary(type);
  return Object.assign(vocab, { businessType: type });
}

export type BusinessVocabularyWithType = ReturnType<typeof useBusinessVocabulary>;

export { getBusinessVocabulary };
