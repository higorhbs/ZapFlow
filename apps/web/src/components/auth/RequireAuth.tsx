"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getClientAuth } from "@zapflow/firebase/client";
import { authApi } from "@/lib/api";
import { AuthContext } from "@/contexts/auth-context";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const auth = getClientAuth();
    let unsub = () => {};

    auth.authStateReady().then(() => {
      unsub = onAuthStateChanged(auth, (user) => {
        if (!user) {
          setUid(null);
          setReady(false);
          router.replace("/");
          return;
        }
        setUid(user.uid);
        authApi
          .sync(user.displayName ?? undefined)
          .catch(() => {})
          .finally(() => setReady(true));
      });
    });

    return () => unsub();
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <AuthContext.Provider value={{ ready, uid }}>{children}</AuthContext.Provider>;
}
