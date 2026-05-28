"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { tenantApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  CheckCircle2, ChevronLeft, ChevronRight,
  Bot, CalendarClock, BookOpen, HelpCircle,
  Clock, Users, TrendingUp, Star, MessageSquareText, Zap,
} from "lucide-react";

interface ChatMsg {
  from: "customer" | "bot";
  text: string;
  time: string;
}

interface StepDef {
  badge: string;
  title: string;
  subtitle: string;
  color: string;
  accentColor: string;
  features: { icon: React.ElementType; text: string }[];
  chat: { businessName: string; messages: ChatMsg[] };
}

const STEPS: StepDef[] = [
  {
    badge: "Atendimento automático",
    title: "Seu WhatsApp trabalhando 24h por dia",
    subtitle: "O bot responde instantaneamente com um menu personalizado, apresentando tudo que seu negócio oferece — mesmo quando você dorme.",
    color: "from-brand-500 to-brand-700",
    accentColor: "bg-brand-600",
    features: [
      { icon: Clock, text: "Respostas imediatas fora do horário" },
      { icon: Bot, text: "Menu configurável com até 4 opções" },
      { icon: Star, text: "Experiência profissional para o cliente" },
    ],
    chat: {
      businessName: "Barbearia do João",
      messages: [
        { from: "customer", text: "Oi, boa noite! Vocês ainda atendem?", time: "21:42" },
        {
          from: "bot",
          text: "Olá! 👋 Sou o assistente da *Barbearia do João*\n\nComo posso ajudar?\n\n*1* — 📅 Agendamentos\n*2* — 🛍️ Catálogo\n*3* — ❓ Dúvidas\n*0* — 👤 Falar com atendente",
          time: "21:42",
        },
      ],
    },
  },
  {
    badge: "Agendamentos",
    title: "Clientes agendam sem precisar ligar",
    subtitle: "O bot guia o cliente pelo fluxo completo: escolha do serviço, data disponível e confirmação — tudo via WhatsApp.",
    color: "from-blue-500 to-blue-700",
    accentColor: "bg-blue-600",
    features: [
      { icon: CalendarClock, text: "Agenda em tempo real, sem conflitos" },
      { icon: CheckCircle2, text: "Confirmação automática por mensagem" },
      { icon: Users, text: "Histórico completo no painel" },
    ],
    chat: {
      businessName: "Barbearia do João",
      messages: [
        { from: "customer", text: "1", time: "10:05" },
        { from: "bot", text: "Qual serviço deseja?\n\n*1* — ✂️ Corte Masculino  R$ 40\n*2* — 🪒 Barba  R$ 25\n*3* — ✂️🪒 Corte + Barba  R$ 60", time: "10:05" },
        { from: "customer", text: "1", time: "10:06" },
        { from: "bot", text: "Disponibilidade:\n\n▸ Seg 02/06 — 09h, 11h, 14h\n▸ Ter 03/06 — 10h, 15h, 17h\n\nQual prefere?", time: "10:06" },
        { from: "customer", text: "terça 10h", time: "10:07" },
        { from: "bot", text: "✅ Agendado!\n\n📅 Terça, 03/06 às 10:00\n✂️ Corte Masculino\n\nAté lá! 💈", time: "10:07" },
      ],
    },
  },
  {
    badge: "Catálogo digital",
    title: "Seu catálogo sempre atualizado no chat",
    subtitle: "Serviços, produtos e preços apresentados direto no WhatsApp. O cliente vê tudo e já agenda em seguida.",
    color: "from-purple-500 to-purple-700",
    accentColor: "bg-purple-600",
    features: [
      { icon: BookOpen, text: "Catálogo sincronizado com o painel" },
      { icon: TrendingUp, text: "Clientes visualizam e já agendam" },
      { icon: Star, text: "Fotos, descrições e preços" },
    ],
    chat: {
      businessName: "Barbearia do João",
      messages: [
        { from: "customer", text: "2", time: "14:30" },
        {
          from: "bot",
          text: "🛍️ *Nosso Catálogo*\n\n✂️ *Corte Masculino*\nAcabamento preciso e moderno\n💰 R$ 40,00\n\n🪒 *Barba*\nModelagem completa\n💰 R$ 25,00\n\n✂️🪒 *Corte + Barba*\nCombo completo com desconto\n💰 R$ 60,00\n\nDigite *1* para agendar!",
          time: "14:30",
        },
      ],
    },
  },
  {
    badge: "Perguntas & Respostas",
    title: "Bot resolve dúvidas na hora certa",
    subtitle: "Cadastre as perguntas mais frequentes. O bot identifica palavras-chave e responde automaticamente, transferindo ao atendente quando necessário.",
    color: "from-amber-500 to-orange-600",
    accentColor: "bg-amber-500",
    features: [
      { icon: HelpCircle, text: "Busca por palavras-chave inteligente" },
      { icon: MessageSquareText, text: "Respostas personalizadas por dúvida" },
      { icon: Users, text: "Passa ao atendente quando necessário" },
    ],
    chat: {
      businessName: "Barbearia do João",
      messages: [
        { from: "customer", text: "Aceita cartão de crédito?", time: "16:15" },
        {
          from: "bot",
          text: "💳 Sim! Aceitamos:\n\n• Cartão de crédito e débito\n• PIX (5% de desconto!)\n• Dinheiro\n\nTem mais alguma dúvida? 😊",
          time: "16:15",
        },
        { from: "customer", text: "Qual o endereço?", time: "16:16" },
        {
          from: "bot",
          text: "📍 Rua das Flores, 123 — Centro\n\n🕐 Horários:\nSeg–Sex: 9h às 20h\nSáb: 9h às 18h",
          time: "16:16",
        },
      ],
    },
  },
];

function parseWaText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    const tokens = line.split(/(\*[^*]+\*|_[^_]+_)/g);
    return (
      <span key={li}>
        {tokens.map((t, i) => {
          if (t.startsWith("*") && t.endsWith("*"))
            return <strong key={i} className="font-semibold">{t.slice(1, -1)}</strong>;
          if (t.startsWith("_") && t.endsWith("_"))
            return <em key={i} className="italic opacity-80">{t.slice(1, -1)}</em>;
          return <span key={i}>{t}</span>;
        })}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
}

function WaChat({ businessName, messages }: { businessName: string; messages: ChatMsg[] }) {
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10 h-full">
      {/* Header */}
      <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-[#128C7E] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {businessName.trim()[0]}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold leading-tight truncate">{businessName}</p>
          <p className="text-[#A8D5CF] text-[11px] leading-none flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4FC3F7] inline-block" />
            online agora
          </p>
        </div>
      </div>

      {/* Chat area */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
        style={{
          background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23ece5dd'/%3E%3C/svg%3E\")",
          backgroundColor: "#ECE5DD",
        }}
      >
        {messages.map((msg, i) => {
          const isBot = msg.from === "bot";
          return (
            <div key={i} className={`flex ${isBot ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm text-[12.5px] leading-relaxed relative ${
                  isBot
                    ? "bg-[#DCF8C6] text-gray-800 rounded-tr-sm"
                    : "bg-white text-gray-800 rounded-tl-sm"
                }`}
              >
                <div>{parseWaText(msg.text)}</div>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] text-gray-400">{msg.time}</span>
                  {isBot && (
                    <svg viewBox="0 0 16 11" className="w-4 h-3 fill-[#53BDEB]">
                      <path d="M11.071.653a.75.75 0 0 0-1.142 0L5.857 5.726 4.07 3.939a.75.75 0 1 0-1.06 1.06L5.326 7.31a.75.75 0 0 0 1.06 0l4.685-4.957M15.07.653a.75.75 0 0 0-1.142 0L9.857 5.726l-.571-.571" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div className="bg-[#F0F2F5] px-3 py-2 flex items-center gap-2 flex-shrink-0">
        <div className="flex-1 bg-white rounded-full px-4 py-2 text-xs text-gray-400">
          Mensagem
        </div>
        <div className="w-9 h-9 rounded-full bg-[#128C7E] flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function lsKey(uid: string) {
  return `zapflow_onboarding_done_${uid}`;
}

export function OnboardingTour() {
  const { uid, ready } = useAuth();
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Persist dismiss in localStorage so it survives reloads even if Firestore write fails
  useEffect(() => {
    if (!uid) return;
    setDismissed(localStorage.getItem(lsKey(uid)) === "1");
    setHydrated(true);
  }, [uid]);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", uid],
    queryFn: () => tenantApi.get(),
    enabled: ready && !!uid,
  });

  const complete = useMutation({
    mutationFn: () => tenantApi.completeOnboarding(),
  });

  function dismiss() {
    if (uid) localStorage.setItem(lsKey(uid), "1");
    setDismissed(true);
    setForceOpen(false);
    complete.mutate();
  }

  const current = STEPS[step];
  const done = Boolean((tenant as any)?.onboardingCompletedAt);
  const visible = hydrated && !dismissed && !isLoading && !!tenant && (!done || forceOpen);
  const canBack = step > 0;
  const isLast = step === STEPS.length - 1;
  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  useEffect(() => {
    function openOnboarding() {
      setStep(0);
      setForceOpen(true);
      if (uid) localStorage.removeItem(lsKey(uid));
      setDismissed(false);
    }
    window.addEventListener("zapflow:open-onboarding", openOnboarding);
    return () => window.removeEventListener("zapflow:open-onboarding", openOnboarding);
  }, [uid]);

  if (!visible) return null;

  const Icon = current.features[0].icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 flex-shrink-0">
          <div
            className="h-full bg-brand-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">

          {/* Left: info */}
          <div className="md:w-[42%] flex flex-col justify-between p-6 md:p-8 flex-shrink-0">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-5">
                <Zap className="w-3 h-3" />
                {current.badge}
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 leading-snug mb-3">
                {current.title}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                {current.subtitle}
              </p>

              {/* Features */}
              <ul className="space-y-3">
                {current.features.map(({ icon: FIcon, text }, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <FIcon className="w-3.5 h-3.5 text-brand-600" />
                    </div>
                    <span className="text-sm text-gray-700">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center gap-2 mt-6">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === step ? "w-6 h-2 bg-brand-600" : "w-2 h-2 bg-gray-200 hover:bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right: chat demo */}
          <div className="flex-1 bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-5 flex flex-col min-h-0 border-t md:border-t-0 md:border-l border-gray-100">
            <div className="flex-1 min-h-0">
              <WaChat
                businessName={current.chat.businessName}
                messages={current.chat.messages}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 md:px-8 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={dismiss}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            disabled={complete.isPending}
          >
            Pular tour
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={!canBack}
              className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
            <button
              type="button"
              onClick={() => {
                if (isLast) { dismiss(); return; }
                setStep((s) => s + 1);
              }}
              disabled={complete.isPending}
              className="btn-primary"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Começar agora
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
