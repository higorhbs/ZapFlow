"use client";

import { useState } from "react";
import { APP_DISPLAY_NAME } from "@zapflow/shared";
import { ChevronDown, ChevronUp, ChevronRight, ChevronLeft, ExternalLink, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── Visual mockups ────────────────────────────────────────────────────────────

function BrowserChrome({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden text-xs shadow-sm">
      <div className="bg-gray-100 px-3 py-1.5 flex items-center gap-2 border-b border-gray-200">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded-full border border-gray-200 px-2 py-0.5 text-gray-400 text-[10px] truncate">
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}

function MockupRegister() {
  return (
    <BrowserChrome url="asaas.com/register">
      <div className="p-4 bg-white">
        <div className="text-center mb-4">
          <div className="w-16 h-7 bg-blue-700 rounded mx-auto mb-1.5 flex items-center justify-center">
            <span className="text-white text-[10px] font-extrabold tracking-wider">ASAAS</span>
          </div>
          <p className="text-[10px] text-gray-500">Crie sua conta gratuita</p>
        </div>
        <div className="space-y-2 max-w-[180px] mx-auto">
          <div className="border border-gray-200 rounded px-2 py-1.5 text-[10px] text-gray-400">Nome da empresa</div>
          <div className="border border-gray-200 rounded px-2 py-1.5 text-[10px] text-gray-400">CNPJ ou CPF</div>
          <div className="border border-gray-200 rounded px-2 py-1.5 text-[10px] text-gray-400">E-mail</div>
          <div className="border border-gray-200 rounded px-2 py-1.5 text-[10px] text-gray-400">Senha</div>
          <div className="bg-blue-700 rounded px-2 py-1.5 text-[10px] text-white text-center font-medium">
            Criar conta
          </div>
          <div className="text-center text-[9px] text-gray-400">
            Já tem conta?{" "}
            <span className="text-blue-600">Entrar</span>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

function MockupApiKey() {
  return (
    <BrowserChrome url="app.asaas.com → Minha conta → Integrações → API">
      <div className="relative">
        <img
          src="https://files.readme.io/f4b7e1df6a46013c6702d8c5fa18485eb7751ca3b4f4781f6521641257838e77-image.png"
          alt="Tela de Chave API no painel Asaas"
          className="w-full block"
        />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-md">
          Clique em "Gerar chave de API" e copie
        </div>
      </div>
    </BrowserChrome>
  );
}

function MockupAtendeJaForm() {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden text-xs shadow-sm">
      <div className="bg-brand-600 px-3 py-2 text-[10px] font-semibold text-white">
        {APP_DISPLAY_NAME} — Pagamentos PIX
      </div>
      <div className="p-3 bg-white space-y-2.5">
        <div>
          <p className="text-[9px] font-medium text-gray-600 mb-0.5">Chave API Asaas *</p>
          <div className="border-2 border-brand-400 rounded px-2 py-1.5 font-mono text-[9px] text-gray-700 bg-brand-50 flex items-center justify-between">
            <span>$aact_YTU5YTE1M2M3...</span>
            <Check className="w-3 h-3 text-brand-600 shrink-0" />
          </div>
          <p className="text-[8px] text-brand-600 mt-0.5 flex items-center gap-0.5">
            <span>↑</span> Cole aqui a chave copiada do Asaas
          </p>
        </div>
        <div className="bg-brand-600 rounded px-2 py-1.5 text-[9px] text-white text-center font-medium">
          Salvar integração
        </div>
      </div>
    </div>
  );
}

function MockupWebhook() {
  return (
    <BrowserChrome url="app.asaas.com → Integrações → Webhooks → Adicionar">
      <div className="relative">
        <img
          src="https://files.readme.io/5723580795070702019642213ba042daac5515bbf8174db2a51e2395927c303c-image.png"
          alt="Formulário de criação de webhook no painel Asaas"
          className="w-full block"
        />
        <div className="absolute top-2 right-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
          Cole a URL e o token do {APP_DISPLAY_NAME}
        </div>
      </div>
    </BrowserChrome>
  );
}

function MockupWhatsApp() {
  return (
    <div className="mx-auto w-[170px]">
      <div className="rounded-[24px] border-4 border-gray-800 bg-gray-800 overflow-hidden shadow-xl">
        <div className="bg-gray-800 h-5 flex items-center justify-center">
          <div className="w-10 h-2 bg-gray-900 rounded-full" />
        </div>
        <div className="bg-[#e5ddd5]">
          <div className="bg-[#075e54] px-2 py-1.5 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gray-300" />
            <div>
              <p className="text-white text-[9px] font-semibold leading-none">Minha Loja</p>
              <p className="text-[#b2dfdb] text-[7px]">online</p>
            </div>
          </div>
          <div className="p-2 space-y-1.5 bg-[url('data:image/png;base64,iVBORw0KGgo=')] min-h-[110px]">
            <div className="bg-white rounded-lg rounded-tl-none p-1.5 max-w-[85%] shadow-sm">
              <p className="text-[8px] text-gray-700">Olá! Para gerar um PIX, digite: <strong>pix</strong> + valor</p>
              <p className="text-right text-[7px] text-gray-400">10:30</p>
            </div>
            <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none p-1.5 max-w-[70%] ml-auto shadow-sm">
              <p className="text-[8px] text-gray-700 font-medium">pix 50</p>
              <p className="text-right text-[7px] text-gray-400">10:31</p>
            </div>
            <div className="bg-white rounded-lg rounded-tl-none p-1.5 max-w-[90%] shadow-sm">
              <p className="text-[8px] font-semibold text-gray-800 mb-0.5">🔑 PIX gerado! R$ 50,00</p>
              <div className="bg-gray-100 rounded px-1 py-0.5 font-mono text-[6px] text-gray-600 truncate">
                00020126580014BR.GOV.BCB...
              </div>
              <p className="text-[7px] text-green-600 mt-0.5 font-medium">✓ Copie e pague no app do banco</p>
              <p className="text-right text-[7px] text-gray-400">10:31</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 h-4 flex items-center justify-center">
          <div className="w-8 h-1 bg-gray-600 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── Steps data ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: "🏦",
    title: "Criar conta no Asaas",
    badge: "Gratuito",
    badgeColor: "text-emerald-700 bg-emerald-50",
    description:
      "O Asaas é o gateway de pagamentos que gerará os PIX para seus clientes. Crie uma conta gratuita para começar.",
    tips: [
      <>
        Acesse{" "}
        <a
          href="https://www.asaas.com/register/accountInfo"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 underline inline-flex items-center gap-0.5"
        >
          asaas.com <ExternalLink className="w-3 h-3" />
        </a>{" "}
        e clique em <strong>Criar conta</strong>
      </>,
      "Preencha os dados da empresa: CNPJ ou CPF",
      "Complete a verificação de identidade exigida pelo Asaas",
    ],
    mockup: <MockupRegister />,
  },
  {
    icon: "🔑",
    title: "Gerar a Chave API",
    badge: "Painel Asaas",
    badgeColor: "text-blue-700 bg-blue-50",
    description:
      `A chave API é o que permite o ${APP_DISPLAY_NAME} criar cobranças diretamente na sua conta Asaas.`,
    tips: [
      <>
        No painel Asaas, vá em <strong>Minha conta → Integrações → API</strong>
      </>,
      <>
        Clique em <strong>Gerar chave API</strong> (ou use uma já existente)
      </>,
      <>
        Copie a chave — ela começa com{" "}
        <code className="text-[11px] bg-gray-100 px-1 rounded font-mono">$aact_</code>
      </>,
    ],
    mockup: <MockupApiKey />,
    fullWidthMockup: true,
  },
  {
    icon: "📋",
    title: `Colar no ${APP_DISPLAY_NAME}`,
    badge: "Esta página",
    badgeColor: "text-brand-700 bg-brand-50",
    description:
      `Cole a chave API no formulário abaixo. O ${APP_DISPLAY_NAME} valida automaticamente a chave na hora de salvar.`,
    tips: [
      "Cole a chave no campo \"Chave API Asaas\" abaixo",
      "Clique em Salvar integração — você verá o saldo da conta Asaas se der certo",
    ],
    mockup: <MockupAtendeJaForm />,
  },
  {
    icon: "🔗",
    title: "Configurar o Webhook",
    badge: "Recomendado",
    badgeColor: "text-amber-700 bg-amber-50",
    description:
      `O webhook permite que o Asaas avise o ${APP_DISPLAY_NAME} automaticamente quando um PIX for pago, confirmando a cobrança em tempo real.`,
    tips: [
      <>
        No Asaas: <strong>Integrações → Webhooks → Adicionar URL</strong>
      </>,
      "Cole a URL exibida abaixo nesta página (botão Copiar)",
      <>
        Ative os eventos:{" "}
        <code className="text-[11px] bg-gray-100 px-1 rounded font-mono">PAYMENT_RECEIVED</code>,{" "}
        <code className="text-[11px] bg-gray-100 px-1 rounded font-mono">PAYMENT_CONFIRMED</code> e{" "}
        <code className="text-[11px] bg-gray-100 px-1 rounded font-mono">PAYMENT_OVERDUE</code>
      </>,
      "Crie um token seguro (qualquer texto) e cole o mesmo no campo \"Token do webhook\" aqui",
    ],
    mockup: <MockupWebhook />,
    fullWidthMockup: true,
  },
  {
    icon: "✅",
    title: "Testar no WhatsApp",
    badge: "Pronto!",
    badgeColor: "text-emerald-700 bg-emerald-50",
    description:
      "Com o WhatsApp conectado e a integração salva, seus clientes já podem pagar via PIX direto no chat.",
    tips: [
      "Envie \"menu\" para o número do negócio no WhatsApp",
      "Escolha Pagar com PIX ou envie \"pix 10\" para gerar uma cobrança de R$ 10",
      "Pague o PIX no app do banco normalmente",
      "O status da cobrança atualiza automaticamente quando o webhook estiver configurado",
    ],
    mockup: <MockupWhatsApp />,
  },
];

// ── Main component ────────────────────────────────────────────────────────────

export function AsaasSetupGuide({ className }: { className?: string }) {
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState(0);

  const step = STEPS[active];
  const isFirst = active === 0;
  const isLast = active === STEPS.length - 1;

  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white overflow-hidden", className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
            <span className="text-sm">⚙️</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Como configurar — passo a passo</p>
            <p className="text-xs text-gray-400">5 etapas para ativar cobranças PIX no WhatsApp</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {/* Step indicators */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  className="flex-1 group relative"
                  title={s.title}
                >
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i < active
                        ? "bg-brand-500"
                        : i === active
                        ? "bg-brand-600"
                        : "bg-gray-200 group-hover:bg-gray-300"
                    )}
                  />
                  <div
                    className={cn(
                      "absolute -top-4 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all duration-200",
                      i < active
                        ? "bg-brand-500 border-brand-500 text-white"
                        : i === active
                        ? "bg-white border-brand-600 text-brand-600 shadow-sm ring-2 ring-brand-100"
                        : "bg-white border-gray-300 text-gray-400"
                    )}
                  >
                    {i < active ? <Check className="w-2.5 h-2.5" /> : i + 1}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 text-right mt-1">
              Etapa {active + 1} de {STEPS.length}
            </p>
          </div>

          {/* Step content */}
          <div className="px-5 pt-4">
            <div className={cn("gap-5", step.fullWidthMockup ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2")}>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{step.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-900">{step.title}</h3>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", step.badgeColor)}>
                        {step.badge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {step.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-gray-600">
                      <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span className="leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mockup lateral (CSS mockups) */}
              {!step.fullWidthMockup && (
                <div className="flex items-center justify-center">
                  <div className="w-full">{step.mockup}</div>
                </div>
              )}
            </div>

            {/* Mockup full-width (screenshots reais) */}
            {step.fullWidthMockup && (
              <div className="w-full mt-4">{step.mockup}</div>
            )}
          </div>

          {/* Navigation — sempre na mesma posição, abaixo do conteúdo */}
          <div className="px-5 py-4 mt-2 border-t border-gray-100 flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setActive((v) => v - 1)}
              disabled={isFirst}
              className="gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setActive((v) => v + 1)}
              disabled={isLast}
              className="gap-1"
            >
              Próximo
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            {isLast && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Tudo pronto!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
