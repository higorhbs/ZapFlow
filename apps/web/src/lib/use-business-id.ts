"use client";

import { useParams, usePathname } from "next/navigation";

export function useBusinessId(): string {
  const pathname = usePathname() ?? "";
  const fromPath = pathname.match(/\/businesses\/([^/]+)/)?.[1];

  if (fromPath && fromPath !== "new") {
    return fromPath;
  }

  const fromParams = useParams()?.id;
  if (typeof fromParams === "string" && fromParams && fromParams !== "new") {
    return fromParams;
  }

  throw new Error("ID do negócio não encontrado na URL.");
}
