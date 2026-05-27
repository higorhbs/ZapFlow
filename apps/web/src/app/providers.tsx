"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { watchAuth, completeGoogleRedirect, authErrorMessage } from "@/lib/firebase-auth";
import { setToken, removeToken } from "@/lib/auth";
import { toast } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  useEffect(() => {
    let active = true;

    completeGoogleRedirect()
      .then((res) => {
        if (!active || !res) return;
        setToken(res.token);
        const path = window.location.pathname;
        if (path === "/" || path === "/register") {
          window.location.replace("/dashboard");
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        const path = window.location.pathname;
        if (path === "/" || path === "/register") {
          toast.error(authErrorMessage(err, "Falha ao concluir login com Google"));
        }
      });

    const unsub = watchAuth(async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setToken(token);
      } else {
        removeToken();
      }
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
