"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authErrorMessage, completeGoogleRedirect } from "@/lib/firebase-auth";
import { setToken } from "@/lib/auth";

export function GoogleAuthRedirectHandler() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    completeGoogleRedirect()
      .then((res) => {
        if (!res) return;
        setToken(res.token);
        router.replace("/dashboard");
      })
      .catch((err: unknown) => {
        toast.error(authErrorMessage(err, "Falha ao concluir login com Google"));
      });
  }, [router]);

  return null;
}
