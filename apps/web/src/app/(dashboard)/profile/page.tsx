"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User as FirebaseUser } from "firebase/auth";
import { profileApi, tenantApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  authErrorMessage,
  hasGoogleProvider,
  hasPasswordProvider,
  watchAuth,
} from "@/lib/firebase-auth";
import { PLAN_LABELS, cn } from "@/lib/utils";
import { toast } from "sonner";
import { CreditCard, Loader2, Mail, Lock, User, Shield } from "lucide-react";

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

  if (isLoading || !tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Meu perfil</h1>
        <p className="text-gray-500 mt-1">Dados da conta, segurança e pagamento</p>
      </div>

      <div className="card mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-lg font-bold">
          {(tenant.name || "?").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{tenant.name}</p>
          <p className="text-sm text-gray-500">{tenant.email}</p>
          <p className="text-xs text-gray-400 mt-1">
            Plano {PLAN_LABELS[tenant.plan]}
            {googleAccount && " · Login com Google"}
            {passwordAccount && !googleAccount && " · E-mail e senha"}
          </p>
        </div>
      </div>

      <section className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-brand-600" />
          Dados pessoais
        </h2>
        <form onSubmit={nameForm.handleSubmit((d) => updateName.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Nome</label>
            <input type="text" className="input" {...nameForm.register("name")} />
            {nameForm.formState.errors.name && (
              <p className="text-xs text-red-500 mt-1">{nameForm.formState.errors.name.message}</p>
            )}
          </div>
          <button type="submit" className="btn-primary" disabled={updateName.isPending}>
            {updateName.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar nome
          </button>
        </form>
      </section>

      <section className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4 text-brand-600" />
          E-mail
        </h2>
        {passwordAccount ? (
          <form onSubmit={emailForm.handleSubmit((d) => updateEmail.mutate(d))} className="space-y-4">
            <div>
              <label className="label">Novo e-mail</label>
              <input type="email" className="input" {...emailForm.register("email")} />
              {emailForm.formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">{emailForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="label">Senha atual</label>
              <input type="password" className="input" {...emailForm.register("currentPassword")} />
              {emailForm.formState.errors.currentPassword && (
                <p className="text-xs text-red-500 mt-1">
                  {emailForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <button type="submit" className="btn-primary" disabled={updateEmail.isPending}>
              {updateEmail.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Atualizar e-mail
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-500">
            Conta vinculada ao Google. O e-mail é o da sua conta Google e não pode ser alterado aqui.
          </p>
        )}
      </section>

      <section className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-600" />
          Senha
        </h2>
        {passwordAccount ? (
          <form
            onSubmit={passwordForm.handleSubmit((d) => updatePassword.mutate(d))}
            className="space-y-4"
          >
            <div>
              <label className="label">Senha atual</label>
              <input type="password" className="input" {...passwordForm.register("currentPassword")} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-red-500 mt-1">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div>
              <label className="label">Nova senha</label>
              <input type="password" className="input" {...passwordForm.register("newPassword")} />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-red-500 mt-1">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div>
              <label className="label">Confirmar nova senha</label>
              <input type="password" className="input" {...passwordForm.register("confirmPassword")} />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            <button type="submit" className="btn-primary" disabled={updatePassword.isPending}>
              {updatePassword.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Alterar senha
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-500">
            Você entrou com Google. Para usar senha, crie uma conta com e-mail ou vincule senha no Firebase
            Console.
          </p>
        )}
      </section>

      <section className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-brand-600" />
          Meio de pagamento
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Cartão e cobrança recorrente serão integrados em breve (Stripe). Enquanto isso, gerencie seu plano
          na aba Meu plano.
        </p>
        {tenant.stripeCustomerId ? (
          <p className="text-xs text-gray-400 mb-4">Cliente Stripe: {tenant.stripeCustomerId}</p>
        ) : null}
        <Link href="/plan" className={cn("btn-secondary inline-flex")}>
          <CreditCard className="w-4 h-4" />
          Ir para Meu plano
        </Link>
      </section>

      <section className="card bg-gray-50 border-gray-200">
        <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-500" />
          Segurança
        </h2>
        <p className="text-sm text-gray-500">
          Alterações sensíveis podem exigir login recente. Se aparecer erro de reautenticação, saia e entre
          novamente.
        </p>
      </section>
    </div>
  );
}
