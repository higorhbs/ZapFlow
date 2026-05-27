import Link from "next/link";
import { MessageSquare, Calendar, QrCode, Bot, Star, CheckCircle, ArrowRight, Scissors, Coffee, Stethoscope, Store } from "lucide-react";
import { PLAN_PRICES, planMarketingFeatures } from "@zapflow/shared";

const FEATURES = [
  { icon: Bot, title: "Resposta Automática 24h", desc: "O bot atende seus clientes a qualquer hora, mesmo quando você está dormindo ou atendendo outro cliente." },
  { icon: Calendar, title: "Agendamento pelo WhatsApp", desc: "Cliente digita 'agendar', escolhe o serviço, data e horário. Tudo sem precisar da sua intervenção." },
  { icon: Store, title: "Catálogo e Orçamentos", desc: "Envie automaticamente tabela de preços e serviços quando o cliente perguntar." },
  { icon: QrCode, title: "Cobrança via PIX", desc: "Gere cobranças com QR Code e copia-e-cola direto na conversa. Receba o sinal sem esforço." },
  { icon: MessageSquare, title: "FAQ Inteligente", desc: "Configure as perguntas mais frequentes e o bot responde na hora, sem você precisar repetir." },
  { icon: CheckCircle, title: "Atendimento Humano", desc: "O cliente pede para falar com atendente? O bot pausa e você assume o controle pela plataforma." },
];

const SEGMENTS = [
  { icon: Scissors, label: "Barbearia", color: "bg-blue-50 text-blue-600" },
  { icon: Star, label: "Manicure / Salão", color: "bg-pink-50 text-pink-600" },
  { icon: Coffee, label: "Hamburgueria", color: "bg-orange-50 text-orange-600" },
  { icon: Stethoscope, label: "Dentista", color: "bg-teal-50 text-teal-600" },
  { icon: Store, label: "Loja de Bairro", color: "bg-purple-50 text-purple-600" },
];

const PLANS = [
  { id: "STARTER" as const, highlight: false },
  { id: "PRO" as const, highlight: true },
  { id: "UNLIMITED" as const, highlight: false },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">ZapFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Entrar</Link>
            <Link href="/register" className="btn-primary text-sm">Testar grátis</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <span className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
          14 dias grátis • Sem cartão de crédito
        </span>
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Seu WhatsApp no<br />
          <span className="text-brand-600">piloto automático</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          O ZapFlow responde seus clientes, agenda horários e cobra o sinal via PIX — tudo automaticamente.
          Para barbearia, salão, hamburgueria, dentista e loja de bairro.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/register" className="btn-primary text-base px-6 py-3">
            Começar grátis agora
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/" className="btn-secondary text-base px-6 py-3">
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* Segments */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">Feito para</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {SEGMENTS.map(({ icon: Icon, label, color }) => (
              <div key={label} className={`flex items-center gap-2 px-5 py-3 rounded-full ${color} font-medium`}>
                <Icon className="w-4 h-4" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Tudo que você precisa para atender bem</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Um bot inteligente que entende a mensagem do cliente e responde com a ação certa, na hora certa.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-brand-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-brand-600 py-24 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Como funciona na prática?</h2>
          <p className="text-brand-100 mb-12">Uma conversa real no WhatsApp</p>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-left max-w-sm mx-auto font-mono text-sm space-y-3">
            {[
              { side: "left", name: "Cliente", msg: "Oi! Quanto custa um corte?" },
              { side: "right", name: "ZapFlow", msg: "💰 Tabela de Preços:\n• Corte masculino: R$ 45\n• Corte + barba: R$ 65\n• Barba: R$ 30\n\nDigite agendar para marcar!" },
              { side: "left", name: "Cliente", msg: "agendar" },
              { side: "right", name: "ZapFlow", msg: "📅 Qual serviço?\n1. Corte — R$ 45\n2. Corte + barba — R$ 65\n\nDigite o número:" },
              { side: "left", name: "Cliente", msg: "1" },
              { side: "right", name: "ZapFlow", msg: "✅ Agendado!\nCorte • Quinta 15/06 às 10:00\nTe esperamos! 😊" },
            ].map((msg, i) => (
              <div key={i} className={`flex ${msg.side === "right" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 ${msg.side === "right" ? "bg-brand-500" : "bg-white/20"}`}>
                  <p className="text-xs opacity-70 mb-0.5">{msg.name}</p>
                  <p className="whitespace-pre-wrap">{msg.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Preços simples e transparentes</h2>
          <p className="text-gray-500">Sem taxas escondidas. Cancele quando quiser.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const price = PLAN_PRICES[plan.id];
            const features = planMarketingFeatures(plan.id);
            return (
            <div
              key={plan.id}
              className={`card text-center ${plan.highlight ? "border-brand-400 ring-2 ring-brand-400 ring-offset-2" : ""}`}
            >
              {plan.highlight && (
                <div className="bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                  MAIS POPULAR
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-1">{price.label}</h3>
              <p className="text-4xl font-extrabold text-gray-900 mb-1">
                R$ {price.brl}
                <span className="text-base font-normal text-gray-400">/mês</span>
              </p>
              <ul className="text-sm text-gray-500 space-y-2 my-6 text-left px-2">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                  14 dias grátis
                </li>
              </ul>
              <Link href="/register" className={plan.highlight ? "btn-primary w-full" : "btn-secondary w-full"}>
                Começar grátis
              </Link>
            </div>
          );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 py-20 text-center text-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-4">Pronto para parar de perder clientes?</h2>
          <p className="text-gray-400 mb-8">Configure em 5 minutos. Sem cartão. Sem contrato.</p>
          <Link href="/register" className="btn-primary text-base px-8 py-3">
            Criar minha conta grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-gray-600">ZapFlow</span>
          </div>
          <p>© {new Date().getFullYear()} ZapFlow. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
