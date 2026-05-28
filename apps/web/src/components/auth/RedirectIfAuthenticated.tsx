"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { waitForAuthReady } from "@zapflow/firebase/client";
import { Loader2 } from "lucide-react";

export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    void waitForAuthReady().then((auth) => {
      if (auth.currentUser) {
        router.replace("/dashboard");
        return;
      }
      setChecking(false);
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return <>{children}</>;
}
