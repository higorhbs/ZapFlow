"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  authErrorMessage,
  loginWithEmail,
  registerWithEmail,
} from "@/lib/firebase-auth";
import { getClientAuth } from "@zapflow/firebase/client";
import { setToken } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PLAN_PRICES, planMarketingFeatures } from "@zapflow/shared";
import {
  MessageSquare,
  Loader2,
  X,
  Bot,
  CalendarCheck,
  CreditCard,
  Zap,
  ChevronRight,
  Check,
  Crown,
} from "lucide-react";

const PLANS: { id: keyof typeof PLAN_PRICES; highlight?: boolean; extras?: string[] }[] = [
  { id: "STARTER" },
  { id: "PRO", highlight: true, extras: ["Cobrança PIX automática", "Relatórios avançados"] },
  { id: "UNLIMITED", extras: ["Suporte prioritário", "Tudo do Pro"] },
];

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

const features = [
  {
    icon: Bot,
    title: "Atendimento automático 24h",
    desc: "Responda clientes no WhatsApp mesmo fora do horário comercial.",
  },
  {
    icon: CalendarCheck,
    title: "Agendamento via WhatsApp",
    desc: "Clientes agendam sozinhos, sem ligação, sem formulário.",
  },
  {
    icon: CreditCard,
    title: "Cobrança via PIX",
    desc: "Cobranças automáticas integradas ao seu fluxo de atendimento.",
  },
  {
    icon: Zap,
    title: "Respostas inteligentes",
    desc: "FAQ automatizado para as dúvidas mais frequentes do seu negócio.",
  },
];

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginData) {
    try {
      const res = await loginWithEmail(data.email, data.password);
      setToken(res.token);
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(authErrorMessage(err, "Falha ao entrar"));
    }
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Entrar na conta</h2>
      <p className="text-sm text-gray-500 mb-6">Acesse seu painel de atendimento</p>

      <GoogleSignInButton />
      <AuthDivider />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">E-mail</label>
          <input
            type="email"
            className="input"
            placeholder="seu@email.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className="label">Senha</label>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
          )}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Entrar
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Não tem conta?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="text-brand-600 font-medium hover:underline"
        >
          Criar grátis
        </button>
      </p>
    </div>
  );
}

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterData>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterData) {
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
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Criar conta grátis</h2>
      <p className="text-sm text-gray-500 mb-6">14 dias sem precisar de cartão</p>

      <GoogleSignInButton />
      <AuthDivider />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Nome do responsável</label>
          <input
            type="text"
            className="input"
            placeholder="João Silva"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="label">E-mail</label>
          <input
            type="email"
            className="input"
            placeholder="seu@email.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className="label">Senha</label>
          <input
            type="password"
            className="input"
            placeholder="Mínimo 8 caracteres"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
          )}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Criar minha conta
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Já tem conta?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="text-brand-600 font-medium hover:underline"
        >
          Entrar
        </button>
      </p>
    </div>
  );
}

type AuthMode = "login" | "register" | null;

export function LoginScreen() {
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const isOpen = authMode !== null;

  function open(mode: "login" | "register") {
    setAuthMode(mode);
  }

  function close() {
    setAuthMode(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-50 overflow-hidden scroll-smooth">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-sm">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">ZapFlow</span>
        </div>
        <nav className="flex items-center gap-6">
          <a
            href="#planos"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Planos
          </a>
          <button
            onClick={() => open("login")}
            className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            Entrar
          </button>
        </nav>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700 mb-6">
            <Zap className="w-3 h-3" />
            Para negócios locais que usam WhatsApp
          </span>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
            Seu negócio no WhatsApp,{" "}
            <span className="text-brand-600">no piloto automático.</span>
          </h1>

          <p className="text-lg text-gray-500 mb-10 leading-relaxed">
            Para barbearias, salões, hamburguerias, dentistas e lojas de bairro que
            querem atender melhor, agendar mais e nunca perder um cliente.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => open("register")}
              className="btn-primary px-6 py-3 text-base gap-2"
            >
              Começar grátis
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => open("login")}
              className="btn-secondary px-6 py-3 text-base"
            >
              Entrar na conta
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-20">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-brand-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Plans */}
        <section id="planos" className="mt-28 scroll-mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Planos simples e transparentes</h2>
            <p className="text-gray-500 text-base">
              Comece grátis por 14 dias. Sem cartão de crédito.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map(({ id, highlight, extras = [] }) => {
              const price = PLAN_PRICES[id];
              const featureList = [...planMarketingFeatures(id), ...extras];

              return (
                <div
                  key={id}
                  className={`relative bg-white rounded-2xl border p-7 flex flex-col shadow-sm transition-shadow hover:shadow-md ${
                    highlight
                      ? "border-brand-400 ring-2 ring-brand-400 ring-offset-2"
                      : "border-gray-200"
                  }`}
                >
                  {highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow">
                      <Crown className="w-3 h-3" />
                      Mais popular
                    </span>
                  )}

                  <h3 className="text-lg font-bold text-gray-900">{price.label}</h3>
                  <p className="mt-2 mb-6">
                    <span className="text-4xl font-extrabold text-gray-900">
                      R${price.brl}
                    </span>
                    <span className="text-sm text-gray-500">/mês</span>
                  </p>

                  <ul className="space-y-2.5 text-sm text-gray-600 flex-1 mb-8">
                    {featureList.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => open("register")}
                    className={highlight ? "btn-primary w-full py-2.5" : "btn-secondary w-full py-2.5"}
                  >
                    Começar grátis
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Overlay */}
      <div
        onClick={close}
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Auth panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-500 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">ZapFlow</span>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setAuthMode("login")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              authMode === "login"
                ? "text-brand-600 border-b-2 border-brand-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setAuthMode("register")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              authMode === "register"
                ? "text-brand-600 border-b-2 border-brand-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Criar conta
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          {authMode === "login" ? (
            <LoginForm onSwitch={() => setAuthMode("register")} />
          ) : (
            <RegisterForm onSwitch={() => setAuthMode("login")} />
          )}
        </div>
      </div>
    </div>
  );
}
