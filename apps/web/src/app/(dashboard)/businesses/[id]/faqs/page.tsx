"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { businessApi, faqApi } from "@/lib/api";
import { useBusinessId } from "@/lib/use-business-id";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Bot, MessageSquare, HelpCircle, Plus, Trash2, Loader2, X,
  ChevronUp, ChevronDown, Eye, Save,
  CalendarCheck, BookOpen, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface BotMenuItemConfig {
  num: number;
  action: "APPOINTMENT" | "CATALOG" | "FAQ" | "HUMAN";
  label: string;
  enabled: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ACTION_META: Record<BotMenuItemConfig["action"], { label: string; icon: React.ComponentType<{ className?: string }>; color: string; emoji: string }> = {
  APPOINTMENT: { label: "Agendamentos", icon: CalendarCheck, color: "bg-blue-100 text-blue-700",   emoji: "📅" },
  CATALOG:     { label: "Catálogo",     icon: BookOpen,      color: "bg-purple-100 text-purple-700", emoji: "🛍️" },
  FAQ:         { label: "Perguntas",    icon: HelpCircle,    color: "bg-yellow-100 text-yellow-700", emoji: "❓" },
  HUMAN:       { label: "Atendente",   icon: Users,         color: "bg-green-100 text-green-700",  emoji: "👤" },
};

const DEFAULT_MENU: BotMenuItemConfig[] = [
  { num: 1, action: "APPOINTMENT", label: "Agendamentos",         enabled: true },
  { num: 2, action: "CATALOG",     label: "Catálogo",              enabled: true },
  { num: 3, action: "FAQ",         label: "Perguntas frequentes",  enabled: true },
  { num: 4, action: "HUMAN",       label: "Falar com atendente",   enabled: true },
];

const faqSchema = z.object({
  question: z.string().min(5, "Pergunta muito curta"),
  answer:   z.string().min(5, "Resposta muito curta"),
  keywords: z.string().min(1, "Informe pelo menos uma palavra-chave"),
});
type FAQForm = z.infer<typeof faqSchema>;

// ── Tabs ───────────────────────────────────────────────────────────────────────
type Tab = "menu" | "faqs";

// ── BotMenuEditor ──────────────────────────────────────────────────────────────
function BotMenuEditor({ businessId, initialMenu, businessName }: {
  businessId: string;
  initialMenu: BotMenuItemConfig[];
  businessName: string;
}) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<BotMenuItemConfig[]>(initialMenu);

  const saveMutation = useMutation({
    mutationFn: () => businessApi.update(businessId, { botMenu: items } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business", businessId] });
      toast.success("Menu do bot salvo!");
    },
    onError: () => toast.error("Erro ao salvar menu"),
  });

  function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setItems(next.map((it, i) => ({ ...it, num: i + 1 })));
  }

  function toggle(index: number) {
    setItems(items.map((it, i) => i === index ? { ...it, enabled: !it.enabled } : it));
  }

  const previewLines = buildPreviewLines(items, businessName);

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 max-w-3xl mx-auto">
      {/* Editor */}
      <div>
        <p className="text-sm text-gray-500 mb-4">
          Defina quais opções aparecem no menu quando o cliente digita <code className="bg-gray-100 px-1 rounded text-xs">menu</code> no WhatsApp.
        </p>

        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden mb-4">
          {items.map((item, i) => {
            const meta = ACTION_META[item.action];
            const Icon = meta.icon;
            return (
              <div
                key={item.action}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors",
                  item.enabled ? "bg-white" : "bg-gray-50 opacity-60"
                )}
              >
                {/* Order badge */}
                <span className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                  item.enabled ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-400"
                )}>
                  {item.num}
                </span>

                {/* Action badge */}
                <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium flex-shrink-0", meta.color)}>
                  <Icon className="w-3 h-3" />
                  {meta.label}
                </span>

                <div className="flex-1" />

                {/* Controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Up / Down grouped */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden divide-x divide-gray-200">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="w-8 h-8 flex items-center justify-center text-brand-600 hover:bg-brand-50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === items.length - 1}
                      className="w-8 h-8 flex items-center justify-center text-brand-600 hover:bg-brand-50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Toggle enable */}
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    className={cn(
                      "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                      item.enabled ? "bg-brand-600" : "bg-gray-200"
                    )}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200",
                      item.enabled ? "translate-x-4" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="btn-primary"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar menu
        </button>
      </div>

      {/* Preview */}
      <div>
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-600">
          <Eye className="w-4 h-4" />
          Pré-visualização
        </div>

        {/* iPhone 15 Pro frame */}
        <div className="relative w-[270px] select-none">
          {/* Body */}
          <div className="relative rounded-[3.2rem] bg-gradient-to-b from-[#3A3A3C] to-[#1C1C1E] shadow-[0_30px_60px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)] border border-[#48484A]">

            {/* Side buttons — left */}
            <div className="absolute -left-[3px] top-[72px] w-[3px] h-6 bg-[#3A3A3C] rounded-l-full" />
            <div className="absolute -left-[3px] top-[106px] w-[3px] h-10 bg-[#3A3A3C] rounded-l-full" />
            <div className="absolute -left-[3px] top-[152px] w-[3px] h-10 bg-[#3A3A3C] rounded-l-full" />
            {/* Side button — right (power) */}
            <div className="absolute -right-[3px] top-[114px] w-[3px] h-14 bg-[#3A3A3C] rounded-r-full" />

            {/* Screen bezel */}
            <div className="m-[6px] rounded-[2.7rem] overflow-hidden bg-black">

              {/* Status bar — hora | Dynamic Island | ícones na mesma linha */}
              <div className="relative bg-[#075E54] flex items-center justify-between px-4 h-[36px]">
                {/* Hora */}
                <span className="text-white text-[9px] font-semibold tracking-tight z-10">9:41</span>

                {/* Dynamic Island — centralizado verticalmente e horizontalmente */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                                w-[82px] h-[24px] bg-black rounded-full
                                flex items-center justify-center gap-2 z-20">
                  <div className="w-[7px] h-[7px] rounded-full bg-[#1a1a1a] border border-[#333]" />
                  <div className="w-2 h-2 rounded-full bg-[#222] border border-[#3a3a3a]" />
                </div>

                {/* Ícones de status */}
                <div className="flex items-center gap-1.5 z-10">
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                    <rect x="0"    y="6"   width="2.5" height="4"  rx="0.4" fill="white"/>
                    <rect x="3.5"  y="4"   width="2.5" height="6"  rx="0.4" fill="white"/>
                    <rect x="7"    y="2"   width="2.5" height="8"  rx="0.4" fill="white"/>
                    <rect x="10.5" y="0"   width="2.5" height="10" rx="0.4" fill="white" opacity="0.35"/>
                  </svg>
                  <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                    <path d="M6.5 8a1 1 0 110 2 1 1 0 010-2z" fill="white"/>
                    <path d="M3.5 6C4.5 5 5.4 4.5 6.5 4.5S8.5 5 9.5 6" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
                    <path d="M1.5 4C3 2.5 4.7 1.5 6.5 1.5s3.5 1 5 2.5" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.5"/>
                  </svg>
                  <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
                    <rect x="0.5" y="0.5" width="16" height="9" rx="2" stroke="white" strokeOpacity="0.5"/>
                    <rect x="2"   y="2"   width="12" height="6"  rx="1" fill="white"/>
                    <path d="M17.5 3.5v3a1.5 1.5 0 000-3z" fill="white" fillOpacity="0.5"/>
                  </svg>
                </div>
              </div>

              {/* WhatsApp header */}
              <div className="bg-[#075E54] px-3 py-2 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#128C7E] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {businessName.trim()[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-[11px] font-semibold leading-none truncate">{businessName}</p>
                  <p className="text-[#A8D5CF] text-[9px] mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4FC3F7] inline-block flex-shrink-0" />
                    online agora
                  </p>
                </div>
                <div className="flex gap-0.5">
                  {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-white/60" />)}
                </div>
              </div>

              {/* Chat background */}
              <div
                className="px-3 py-3 min-h-[340px]"
                style={{ background: "#E5DDD5 url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
              >
                {/* Timestamp */}
                <div className="flex justify-center mb-3">
                  <span className="bg-black/20 text-white text-[9px] px-2 py-0.5 rounded-full">Hoje</span>
                </div>

                {/* Bot message bubble — right/green like onboarding */}
                <div className="flex justify-end">
                  <div
                    className="relative rounded-2xl rounded-tr-sm px-3 py-2 shadow-sm"
                    style={{ fontSize: "11.5px", lineHeight: "1.55", maxWidth: "88%", backgroundColor: "#DCF8C6" }}
                  >
                    {/* Tail */}
                    <div className="absolute -right-[7px] top-0 w-0 h-0"
                      style={{ borderTop: "8px solid #DCF8C6", borderRight: "8px solid transparent" }} />
                    <WaMessage lines={previewLines} />
                    <div className="flex justify-end items-center gap-1 mt-1.5">
                      <span className="text-[9px] text-gray-400">agora</span>
                      <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
                        <path d="M1 4l2.5 2.5L8 1" stroke="#53BDEB" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 4l2.5 2.5L12 1" stroke="#53BDEB" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="bg-[#F0F2F5] px-2 py-2 flex items-center gap-1.5">
                <div className="flex-1 bg-white rounded-full px-3 py-1.5 shadow-sm">
                  <span className="text-[10px] text-gray-400">Mensagem</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#128C7E] flex items-center justify-center shadow-sm flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
              </div>

              {/* Home indicator */}
              <div className="bg-[#F0F0F0] flex justify-center pb-1.5 pt-0.5">
                <div className="w-20 h-1 bg-black/25 rounded-full" />
              </div>

            </div>{/* end screen */}
          </div>{/* end body */}
        </div>
      </div>
    </div>
  );
}

// ── WhatsApp markdown renderer ─────────────────────────────────────────────────
function WaMessage({ lines }: { lines: WaLine[] }) {
  return (
    <div className="text-gray-800 space-y-0 leading-[1.5]" style={{ fontSize: "12px" }}>
      {lines.map((line, i) => (
        <p key={i} className={line.blank ? "h-2" : ""}>
          {!line.blank && <WaInline text={line.text ?? ""} />}
        </p>
      ))}
    </div>
  );
}

function WaInline({ text }: { text: string }) {
  const tokens = text.split(/(\*[^*]+\*|_[^_]+_)/g);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.startsWith("*") && t.endsWith("*"))
          return <strong key={i} className="font-semibold">{t.slice(1, -1)}</strong>;
        if (t.startsWith("_") && t.endsWith("_"))
          return <em key={i} className="italic text-gray-500">{t.slice(1, -1)}</em>;
        return <span key={i}>{t}</span>;
      })}
    </>
  );
}

interface WaLine { text?: string; blank?: boolean }

function buildPreviewLines(items: BotMenuItemConfig[], name: string): WaLine[] {
  const enabled = items.filter((i) => i.enabled);
  const lines: WaLine[] = [];
  lines.push({ text: `*Menu — ${name}*` });
  lines.push({ blank: true });
  enabled.forEach((e) => {
    const emoji = ACTION_META[e.action].emoji;
    lines.push({ text: `*${e.num}* — ${emoji} ${e.label}` });
  });
  lines.push({ blank: true });
  lines.push({ text: `*0* — 👋 Sair` });
  lines.push({ blank: true });
  lines.push({ text: `_Palavras: agendar, catálogo, dúvida, atendente_` });
  return lines;
}

// ── FAQsEditor ─────────────────────────────────────────────────────────────────
function FAQsEditor({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqs", businessId],
    queryFn: () => faqApi.list(businessId),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FAQForm>({
    resolver: zodResolver(faqSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: FAQForm) =>
      faqApi.create(businessId, {
        ...data,
        keywords: data.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        sortOrder: faqs.length,
        active: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs", businessId] });
      setShowForm(false);
      reset();
      toast.success("Pergunta adicionada!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => faqApi.remove(businessId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs", businessId] });
      toast.success("Pergunta removida");
    },
  });

  const SUGGESTIONS = [
    { question: "Qual o horário de funcionamento?", answer: "Funcionamos de segunda a sexta das 9h às 18h, sábados das 9h às 14h.", keywords: "horário,funcionamento,abre,fecha" },
    { question: "Onde vocês ficam localizados?", answer: "Estamos na Rua [endereço]. Confira no Google Maps: [link].", keywords: "endereço,onde,localização,fica" },
    { question: "Como funciona o agendamento?", answer: "Digite *agendar* aqui no WhatsApp e escolha data e horário disponível.", keywords: "agendar,agendamento,marcar,como funciona" },
    { question: "Vocês aceitam cartão?", answer: "Sim! Aceitamos cartão de crédito, débito e PIX.", keywords: "cartão,pagamento,pix,forma de pagamento" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          O bot responde automaticamente ao detectar as palavras-chave na mensagem do cliente.
        </p>
        <button className="btn-primary" onClick={() => { setShowForm(true); reset(); }}>
          <Plus className="w-4 h-4" />
          Nova pergunta
        </button>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Nova pergunta</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Pergunta</label>
                <input type="text" className="input" placeholder="Qual o horário de funcionamento?" {...register("question")} />
                {errors.question && <p className="text-xs text-red-500 mt-1">{errors.question.message}</p>}
              </div>
              <div>
                <label className="label">Resposta do bot</label>
                <textarea className="input h-28 resize-none" placeholder="Funcionamos de segunda a sexta..." {...register("answer")} />
                {errors.answer && <p className="text-xs text-red-500 mt-1">{errors.answer.message}</p>}
              </div>
              <div>
                <label className="label">Palavras-chave <span className="font-normal text-gray-400">(separadas por vírgula)</span></label>
                <input type="text" className="input" placeholder="horário, funcionamento, abre, fecha" {...register("keywords")} />
                <p className="text-xs text-gray-400 mt-1">O bot detecta qualquer dessas palavras na mensagem</p>
                {errors.keywords && <p className="text-xs text-red-500 mt-1">{errors.keywords.message}</p>}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary flex-1" disabled={isSubmitting || createMutation.isPending}>
                  {(isSubmitting || createMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {faqs.length === 0 && !isLoading && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sugestões para começar</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.question}
                onClick={() => { setValue("question", s.question); setValue("answer", s.answer); setValue("keywords", s.keywords); setShowForm(true); }}
                className="text-left card border-dashed border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors"
              >
                <p className="font-medium text-sm text-gray-900 mb-1">{s.question}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{s.answer}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FAQ list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : faqs.length > 0 ? (
        <div className="space-y-2">
          {(faqs as any[]).map((faq) => (
            <div key={faq.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                    <p className="font-semibold text-sm text-gray-900">{faq.question}</p>
                  </div>
                  <p className="text-sm text-gray-600 ml-6 mb-3 leading-relaxed">{faq.answer}</p>
                  <div className="ml-6 flex flex-wrap gap-1.5">
                    {faq.keywords.map((kw: string) => (
                      <span key={kw} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { if (confirm("Remover esta pergunta?")) deleteMutation.mutate(faq.id); }}
                  disabled={deleteMutation.isPending}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function BotPage() {
  const businessId = useBusinessId();
  const [tab, setTab] = useState<Tab>("menu");

  const { data: business, isLoading } = useQuery({
    queryKey: ["business", businessId],
    queryFn: () => businessApi.get(businessId),
  });

  const savedMenu = (business as any)?.botMenu as BotMenuItemConfig[] | undefined;
  const initialMenu: BotMenuItemConfig[] =
    savedMenu && savedMenu.length > 0 ? savedMenu : DEFAULT_MENU;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
          <Bot className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuração do Bot</h1>
          <p className="text-gray-500 text-sm mt-0.5">Personalize o menu e as respostas automáticas do seu bot no WhatsApp</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-8">
        {([
          { id: "menu", label: "Menu do Bot",          icon: MessageSquare },
          { id: "faqs", label: "Perguntas & Respostas", icon: HelpCircle },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : tab === "menu" ? (
        <BotMenuEditor businessId={businessId} initialMenu={initialMenu} businessName={business?.name ?? "Meu Negócio"} />
      ) : (
        <FAQsEditor businessId={businessId} />
      )}
    </div>
  );
}
