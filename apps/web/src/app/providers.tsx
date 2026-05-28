"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { watchAuth, completeGoogleRedirect, authErrorMessage } from "@/lib/firebase-auth";
import { setToken, removeToken } from "@/lib/auth";
import { AuthDrawerProvider } from "@/contexts/auth-drawer-context";
import { HostingRouteGuard } from "@/components/HostingRouteGuard";
import { hostingHref, isFirebaseHostingClient } from "@/lib/hosting-href";
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
        const dest = isFirebaseHostingClient() ? hostingHref("/dashboard") : "/dashboard";
        window.location.replace(dest);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const params = new URLSearchParams(window.location.search);
        if (window.location.pathname === "/" && params.has("auth")) {
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

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <HostingRouteGuard>
          <AuthDrawerProvider>{children}</AuthDrawerProvider>
        </HostingRouteGuard>
      </Suspense>
    </QueryClientProvider>
  );
}
