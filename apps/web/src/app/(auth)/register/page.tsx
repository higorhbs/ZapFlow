"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authErrorMessage, registerWithEmail } from "@/lib/firebase-auth";
import { getClientAuth } from "@zapflow/firebase/client";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { setToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { MessageSquare, Loader2, CheckCircle } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type FormData = z.infer<typeof schema>;

const benefits = [
  "14 dias grátis sem cartão",
  "Resposta automática 24h",
  "Agendamento via WhatsApp",
  "Cobrança via PIX automática",
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      const res = await registerWithEmail(data.name, data.email, data.password);
      setToken(res.token);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const user = getClientAuth().currentUser;
      if (user) {
        const token = await user.getIdToken();
        setToken(token);
        router.replace("/dashboard");
        toast.warning("Conta criada. Se algo faltar, recarregue a página.");
        return;
      }
      toast.error(authErrorMessage(err, "Falha ao criar conta"));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left panel */}
        <div className="hidden md:block">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">ZapFlow</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
            Seu negócio no WhatsApp,<br />no piloto automático.
          </h2>
          <p className="text-gray-500 mb-8">
            Para barbearias, salões, hamburguerias, dentistas e lojas de bairro que querem atender melhor sem perder clientes.
          </p>
          <ul className="space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-3 text-gray-700">
                <CheckCircle className="w-5 h-5 text-brand-600 flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Form */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6 md:hidden">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ZapFlow</span>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-1">Criar conta grátis</h1>
          <p className="text-sm text-gray-500 mb-6">14 dias sem precisar de cartão</p>

          <GoogleSignInButton />
          <AuthDivider />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Nome do responsável</label>
              <input type="text" className="input" placeholder="João Silva" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" placeholder="seu@email.com" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Senha</label>
              <input type="password" className="input" placeholder="Mínimo 8 caracteres" {...register("password")} />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Criar minha conta
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tem conta?{" "}
            <Link href="/" className="text-brand-600 font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
