"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MailCheck, RefreshCw, LogOut } from "lucide-react";
import { watchAuth, resendVerificationEmail, refreshVerifiedSession } from "@/lib/firebase-auth";
import { setToken } from "@/lib/auth";
import { signOutAndReset } from "@/lib/session-reset";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner() {
  const router = useRouter();
  const [loadingResend, setLoadingResend] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    return watchAuth(async (user) => {
      if (!user) {
        setPendingEmail(null);
        return;
      }
      await user.reload();
      setPendingEmail(user.emailVerified ? null : user.email ?? null);
    });
  }, []);

  if (!pendingEmail) return null;

  async function handleResend() {
    setLoadingResend(true);
    try {
      await resendVerificationEmail();
      toast.success("E-mail de confirmação reenviado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reenviar o e-mail.");
    } finally {
      setLoadingResend(false);
    }
  }

  async function handleConfirm() {
    setLoadingConfirm(true);
    try {
      const res = await refreshVerifiedSession();
      setToken(res.token);
      toast.success("E-mail confirmado. Liberando acesso...");
      router.replace("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Ainda não localizamos a confirmação.");
    } finally {
      setLoadingConfirm(false);
    }
  }

  async function handleLogout() {
    await signOutAndReset();
    toast.message("Sessão encerrada.");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pt-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700">
              <MailCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-950">Confirme seu e-mail para liberar o acesso</p>
              <p className="text-sm text-amber-900/80">
                Enviamos um link para {pendingEmail}. O painel e a API só ficam disponíveis após a confirmação.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleResend} disabled={loadingResend || loadingConfirm}>
              {loadingResend ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Reenviar e-mail
            </Button>
            <Button type="button" size="sm" onClick={handleConfirm} disabled={loadingResend || loadingConfirm}>
              {loadingConfirm ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
              Já confirmei
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleLogout} disabled={loadingResend || loadingConfirm}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
