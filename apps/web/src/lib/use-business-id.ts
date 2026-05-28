"use client";

import { useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { businessApi } from "./api";
import { useAuth } from "@/contexts/auth-context";

const STORAGE_KEY = "zapflow:activeBusinessId";
export const HOSTING_PLACEHOLDER_BUSINESS_ID = "app";

function pathBusinessId(pathname: string): string | undefined {
  const id = pathname.match(/\/businesses\/([^/]+)/)?.[1];
  if (!id || id === "new") return undefined;
  return id;
}

function inBusinessRoute(pathname: string): boolean {
  return /\/businesses\/[^/]+/.test(pathname);
}

function readStoredBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = sessionStorage.getItem(STORAGE_KEY);
    return id && id !== HOSTING_PLACEHOLDER_BUSINESS_ID ? id : null;
  } catch {
    return null;
  }
}

export function persistBusinessId(id: string) {
  if (typeof window === "undefined" || !id || id === HOSTING_PLACEHOLDER_BUSINESS_ID) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

type UseBusinessIdOptions = { required?: boolean };

export function useBusinessId(opts: UseBusinessIdOptions = { required: true }): string {
  const pathname = usePathname() ?? "";
  const fromParams = useParams()?.id;
  const paramId = typeof fromParams === "string" ? fromParams : undefined;
  const pathId = pathBusinessId(pathname);
  const raw = pathId ?? paramId;
  const onBusinessRoute = inBusinessRoute(pathname);

  const { uid, ready } = useAuth();
  const needsResolve = onBusinessRoute && (!raw || raw === HOSTING_PLACEHOLDER_BUSINESS_ID);

  const { data: businesses } = useQuery({
    queryKey: ["businesses", uid],
    queryFn: businessApi.list,
    enabled: ready && !!uid && needsResolve,
  });

  const tenantId = businesses?.[0]?.id;
  const stored = readStoredBusinessId();

  useEffect(() => {
    if (raw && raw !== HOSTING_PLACEHOLDER_BUSINESS_ID) persistBusinessId(raw);
    if (tenantId) persistBusinessId(tenantId);
  }, [raw, tenantId]);

  if (!onBusinessRoute) {
    if (opts.required) throw new Error("ID do negócio não encontrado na URL.");
    return "";
  }

  if (raw && raw !== HOSTING_PLACEHOLDER_BUSINESS_ID) return raw;
  if (tenantId) return tenantId;
  if (stored) return stored;

  if (!ready || (needsResolve && businesses === undefined)) {
    return "";
  }

  if (opts.required) throw new Error("ID do negócio não encontrado na URL.");
  return "";
}
