"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getBusinessVocabulary,
  type BusinessVocabulary,
  type BusinessType,
} from "@zapflow/shared";
import { businessApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  persistBusinessSnapshot,
  clearBusinessSession,
} from "@/lib/business-route";

type VocabularyContextValue = {
  ready: boolean;
  businessType: BusinessType | undefined;
  vocabulary: BusinessVocabulary;
  tenantBusinessId: string;
};

const VocabularyContext = createContext<VocabularyContextValue | null>(null);

function readInitialType(): BusinessType | null {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("data-business-type");
    if (attr) return attr as BusinessType;
  }
  return null;
}

export function BusinessVocabularyProvider({ children }: { children: ReactNode }) {
  const { uid, ready: authReady } = useAuth();
  const [type, setType] = useState<BusinessType | null>(readInitialType);

  const { data: businesses, isFetched: listFetched } = useQuery({
    queryKey: ["businesses", uid],
    queryFn: businessApi.list,
    enabled: authReady && !!uid,
    staleTime: 10 * 60 * 1000,
  });

  const tenant = businesses?.[0];

  useEffect(() => {
    if (!uid) {
      setType(null);
      clearBusinessSession();
      return;
    }
    if (!tenant?.id || !tenant.type) {
      if (listFetched && !tenant) setType(null);
      return;
    }
    persistBusinessSnapshot({ id: tenant.id, type: tenant.type });
    setType(tenant.type);
  }, [uid, tenant?.id, tenant?.type, listFetched, tenant]);

  const tenantBusinessId = tenant?.id ?? "";
  const vocabReady = type !== null;
  const vocabulary = useMemo(
    () => getBusinessVocabulary(type ?? "OTHER"),
    [type]
  );

  const value = useMemo<VocabularyContextValue>(
    () => ({
      ready: vocabReady || (listFetched && !tenant),
      businessType: type ?? undefined,
      vocabulary,
      tenantBusinessId,
    }),
    [vocabReady, listFetched, tenant, type, vocabulary, tenantBusinessId]
  );

  return (
    <VocabularyContext.Provider value={value}>{children}</VocabularyContext.Provider>
  );
}

export function useBusinessVocabularyContext() {
  const ctx = useContext(VocabularyContext);
  if (!ctx) {
    throw new Error("useBusinessVocabularyContext requires BusinessVocabularyProvider");
  }
  return ctx;
}
