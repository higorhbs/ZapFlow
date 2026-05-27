"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authErrorMessage, loginWithEmail } from "@/lib/firebase-auth";
import { setToken } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { MessageSquare, Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

type FormData = z.infer<typeof schema>;

export function LoginScreen() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      const res = await loginWithEmail(data.email, data.password);
      setToken(res.token);
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(authErrorMessage(err, "Falha ao entrar"));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">ZapFlow</span>
        </div>

        <div className="card">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Entrar na conta</h1>
          <p className="text-sm text-gray-500 mb-6">Acesse seu painel de atendimento</p>

          <GoogleSignInButton />
          <AuthDivider />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" placeholder="seu@email.com" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Senha</label>
              <input type="password" className="input" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Entrar
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Não tem conta?{" "}
            <Link href="/register" className="text-brand-600 font-medium hover:underline">
              Criar grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
