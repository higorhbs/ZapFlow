"use client";

import { getBusinessVocabulary } from "@zapflow/shared";
import { useBusinessVocabularyContext } from "@/contexts/business-vocabulary-context";
import { useBusinessId } from "./use-business-id";

export function useBusinessVocabulary(opts?: { requiredId?: boolean }) {
  const { ready, vocabulary, businessType, tenantBusinessId } =
    useBusinessVocabularyContext();
  const routeBusinessId = useBusinessId({ required: opts?.requiredId ?? true });
  const businessId = routeBusinessId || tenantBusinessId;

  return Object.assign(vocabulary, {
    businessType,
    businessId,
    vocabReady: ready,
  });
}

export { getBusinessVocabulary };
