"use client";

import { useEffect, useState } from "react";
import { useAppRouter } from "@/lib/app-navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getClientAuth } from "@zapflow/firebase/client";
import { authApi } from "@/lib/api";
import { AuthContext } from "@/contexts/auth-context";
import { removeToken } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useAppRouter();
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const auth = getClientAuth();
    let unsub = () => {};

    const applyUser = (user: User | null) => {
      if (!user) {
        setUid(null);
        setReady(false);
        router.replace("/?auth=login");
        return;
      }
      void user.reload().then(() => {
        if (!user.emailVerified) {
          removeToken();
          setUid(null);
          setReady(false);
          router.replace("/?auth=register");
          return;
        }
        setUid(user.uid);
        setReady(true);
        void user.reload().catch(() => {});
        void authApi.sync(user.displayName ?? undefined).catch(() => {});
      });
    };

    void auth.authStateReady().then(() => {
      applyUser(auth.currentUser);
      unsub = onAuthStateChanged(auth, applyUser);
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
