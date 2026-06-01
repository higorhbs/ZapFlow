"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User as FirebaseUser } from "firebase/auth";
import { privacyApi, profileApi, tenantApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  authErrorMessage,
  hasGoogleProvider,
  hasPasswordProvider,
  watchAuth,
} from "@/lib/firebase-auth";
import { PLAN_LABELS, cn } from "@/lib/utils";
import { toast } from "sonner";
import { CreditCard, Loader2, Mail, Lock, User, Shield, Sparkles, Chrome, FileDown, ChevronRight, Trash2, Crown, Zap, AlertTriangle } from "lucide-react";
import { resetClientSession, signOutAndReset } from "@/lib/session-reset";
import { hostingHref } from "@/lib/hosting-href";

const nameSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
});

const emailSchema = z.object({
  email: z.string().email("E-mail inválido"),
  currentPassword: z.string().min(1, "Informe a senha atual"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirme a senha"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type NameForm = z.infer<typeof nameSchema>;
type EmailForm = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { uid, ready } = useAuth();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => watchAuth(setUser), []);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", uid],
    queryFn: () => tenantApi.get(),
    enabled: ready && !!uid,
  });

  const passwordAccount = hasPasswordProvider(user);
  const googleAccount = hasGoogleProvider(user);

  const nameForm = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    values: { name: tenant?.name ?? "" },
  });

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    values: { email: tenant?.email ?? "", currentPassword: "" },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const updateName = useMutation({
    mutationFn: (data: NameForm) => profileApi.updateName(data.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", uid] });
      toast.success("Nome atualizado");
    },
    onError: (err: unknown) => toast.error(authErrorMessage(err, "Erro ao atualizar nome")),
  });

  const updateEmail = useMutation({
    mutationFn: (data: EmailForm) => profileApi.updateEmail(data.email, data.currentPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", uid] });
      emailForm.resetField("currentPassword");
      toast.success("E-mail atualizado");
    },
    onError: (err: unknown) => toast.error(authErrorMessage(err, "Erro ao atualizar e-mail")),
  });

  const updatePassword = useMutation({
    mutationFn: (data: PasswordForm) =>
      profileApi.updatePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      passwordForm.reset();
      toast.success("Senha alterada");
    },
    onError: (err: unknown) => toast.error(authErrorMessage(err, "Erro ao alterar senha")),
  });

  const exportData = useMutation({
    mutationFn: () => privacyApi.exportMyData(),
    onSuccess: (payload) => {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flowdesk-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exportação concluída");
    },
    onError: (err: unknown) => toast.error(authErrorMessage(err, "Erro ao exportar dados")),
  });

  const deleteAccount = useMutation({
    mutationFn: () => privacyApi.deleteAccount(),
    onSuccess: async () => {
      setDeleteOpen(false);
      setDeleteConfirm("");
      try {
        await signOutAndReset(queryClient);
      } catch {
        resetClientSession(queryClient);
      }
      toast.success("Sua conta foi excluída permanentemente.");
      window.location.href = hostingHref("/");
    },
    onError: (err: unknown) =>
      toast.error(authErrorMessage(err, "Não foi possível excluir a conta. Tente novamente.")),
  });

  if (isLoading || !tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const initials = (tenant.name || "?").trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Profile hero */}
      {(() => {
        const planHero: Record<string, { gradient: string; sub: string; icon: React.ReactNode; badge: string }> = {
          FREE:      { gradient: "from-gray-600 to-gray-800",     sub: "text-gray-300",   icon: <Zap className="w-3.5 h-3.5" />,   badge: "bg-white/15 text-white" },
          PRO:       { gradient: "from-brand-600 to-brand-800",   sub: "text-brand-200",  icon: <Zap className="w-3.5 h-3.5" />,   badge: "bg-white/20 text-white" },
          UNLIMITED: { gradient: "from-violet-600 to-purple-800", sub: "text-violet-200", icon: <Crown className="w-3.5 h-3.5" />, badge: "bg-white/20 text-white" },
        };
        const h = planHero[tenant.plan] ?? planHero.FREE;
        return (
          <div className={cn("rounded-2xl bg-gradient-to-r p-5 mb-6 flex items-center gap-4", h.gradient)}>
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={tenant.name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-white/30 flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center text-xl font-bold ring-2 ring-white/30 flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-lg leading-tight truncate">{tenant.name}</p>
              <p className={cn("text-sm truncate", h.sub)}>{tenant.email}</p>
            </div>
            <Link
              href="/plan"
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:brightness-110 hover:ring-2 hover:ring-white/30",
                h.badge
              )}
              aria-label={`Plano ${PLAN_LABELS[tenant.plan]} — ver detalhes`}
            >
              {h.icon}
              {PLAN_LABELS[tenant.plan]}
            </Link>
          </div>
        );
      })()}

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Left: Dados da conta */}
        <Card className="space-y-5 px-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
            <span className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-brand-600" />
            </span>
            Dados da conta
          </h2>

          {/* Name */}
          <form onSubmit={nameForm.handleSubmit((d) => updateName.mutate(d))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input type="text" {...nameForm.register("name")} />
              {nameForm.formState.errors.name && (
                <p className="text-xs text-red-500 mt-1">{nameForm.formState.errors.name.message}</p>
              )}
            </div>
            <Button type="submit" className="h-10 w-full" disabled={updateName.isPending}>
              {updateName.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar nome
            </Button>
          </form>

          {/* Email */}
          <div className="pt-3 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-3">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              E-mail
            </h3>
            {passwordAccount ? (
              <form onSubmit={emailForm.handleSubmit((d) => updateEmail.mutate(d))} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Novo e-mail</Label>
                  <Input type="email" {...emailForm.register("email")} />
                  {emailForm.formState.errors.email && (
                    <p className="text-xs text-red-500 mt-1">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Senha atual</Label>
                  <Input type="password" {...emailForm.register("currentPassword")} />
                  {emailForm.formState.errors.currentPassword && (
                    <p className="text-xs text-red-500 mt-1">{emailForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>
                <Button type="submit" className="h-10 w-full" disabled={updateEmail.isPending}>
                  {updateEmail.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Atualizar e-mail
                </Button>
              </form>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <Chrome className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Conta vinculada ao Google. O e-mail é gerenciado pela sua conta Google.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Right: Senha */}
        <Card className="px-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100 mb-5">
            <span className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-brand-600" />
            </span>
            Segurança
          </h2>

          {passwordAccount ? (
            <form
              onSubmit={passwordForm.handleSubmit((d) => updatePassword.mutate(d))}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label>Senha atual</Label>
                <Input type="password" {...passwordForm.register("currentPassword")} />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Nova senha</Label>
                <Input type="password" {...passwordForm.register("newPassword")} />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar nova senha</Label>
                <Input type="password" {...passwordForm.register("confirmPassword")} />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="mt-1 h-10 w-full" disabled={updatePassword.isPending}>
                {updatePassword.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Alterar senha
              </Button>
            </form>
          ) : (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 mb-4">
              <Chrome className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Você entrou com Google. A senha é gerenciada pela sua conta Google.
              </p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 flex items-start gap-1.5">
              <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              Alterações sensíveis podem exigir login recente. Se aparecer erro, saia e entre novamente.
            </p>
          </div>
        </Card>
      </div>

      {/* Bottom: two groups side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Conta */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Conta</p>
          <Card className="divide-y divide-gray-100 p-0 overflow-hidden">
            <Link
              href="/plan"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group"
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                tenant.plan === "UNLIMITED" ? "bg-violet-50" :
                tenant.plan === "PRO"       ? "bg-brand-50"  : "bg-gray-100"
              )}>
                <CreditCard className={cn(
                  "w-4 h-4",
                  tenant.plan === "UNLIMITED" ? "text-violet-600" :
                  tenant.plan === "PRO"       ? "text-brand-600"  : "text-gray-500"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Meu plano</p>
                <p className="text-xs text-gray-500">Plano {PLAN_LABELS[tenant.plan]} · ver detalhes</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
            </Link>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("flowdesk:open-onboarding"))}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Ver tour do sistema</p>
                <p className="text-xs text-gray-500">Conheça todos os recursos disponíveis</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
            </button>
          </Card>
        </div>

        {/* Privacidade */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Privacidade</p>
          <Card className="divide-y divide-gray-100 p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => exportData.mutate()}
              disabled={exportData.isPending}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group text-left disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                {exportData.isPending
                  ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  : <FileDown className="w-4 h-4 text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Baixar meus dados</p>
                <p className="text-xs text-gray-500">Receba uma cópia de todas as suas informações</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                setDeleteConfirm("");
                setDeleteOpen(true);
              }}
              disabled={deleteAccount.isPending}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group text-left disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                {deleteAccount.isPending
                  ? <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
                  : <Trash2 className="w-4 h-4 text-rose-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-rose-600">Excluir conta permanentemente</p>
                <p className="text-xs text-gray-500">Apaga negócio, conversas, assinatura e login</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-rose-400 transition-colors flex-shrink-0" />
            </button>
          </Card>
        </div>
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Excluir conta permanentemente?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Esta ação é irreversível. Serão apagados:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-5 list-disc pl-5">
              <li>Seu negócio, conversas, agendamentos e catálogo</li>
              <li>Conexão do WhatsApp e sessão no servidor</li>
              <li>Assinatura e dados de cobrança (quando houver)</li>
              <li>Seu acesso ao painel</li>
            </ul>
            <Label htmlFor="delete-confirm" className="text-sm text-gray-700">
              Digite <span className="font-semibold">EXCLUIR</span> para confirmar
            </Label>
            <Input
              id="delete-confirm"
              className="mt-1.5 mb-5"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="EXCLUIR"
              autoComplete="off"
              disabled={deleteAccount.isPending}
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={deleteAccount.isPending}
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirm("");
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1 bg-rose-600 hover:bg-rose-700"
                disabled={deleteConfirm !== "EXCLUIR" || deleteAccount.isPending}
                onClick={() => deleteAccount.mutate()}
              >
                {deleteAccount.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Excluir minha conta"
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
