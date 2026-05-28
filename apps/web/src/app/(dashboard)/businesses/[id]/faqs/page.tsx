"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { faqApi } from "@/lib/api";
import { useBusinessId } from "@/lib/use-business-id";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, HelpCircle, X } from "lucide-react";

const schema = z.object({
  question: z.string().min(5, "Pergunta muito curta"),
  answer: z.string().min(5, "Resposta muito curta"),
  keywords: z.string().min(1, "Informe pelo menos uma palavra-chave"),
});

type FormData = z.infer<typeof schema>;

const SUGGESTIONS = [
  { question: "Qual o horário de funcionamento?", answer: "Funcionamos de segunda a sexta das 9h às 18h, sábados das 9h às 14h.", keywords: "horário,funcionamento,abre,fecha,horario" },
  { question: "Onde vocês ficam localizados?", answer: "Estamos na Rua [endereço]. Confira no Google Maps: [link].", keywords: "endereço,onde,localização,localizacao,fica" },
  { question: "Como funciona o agendamento?", answer: "É simples! Digite *agendar* aqui mesmo no WhatsApp e escolha a data e horário disponível.", keywords: "agendar,agendamento,marcar,como funciona" },
  { question: "Vocês aceitam cartão?", answer: "Sim! Aceitamos cartão de crédito, débito e PIX.", keywords: "cartão,pagamento,cartao,forma de pagamento,pix" },
];

export default function FAQPage() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqs", businessId],
    queryFn: () => faqApi.list(businessId),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      faqApi.create(businessId, {
        ...data,
        keywords: data.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs", businessId] });
      setShowForm(false);
      reset();
      toast.success("FAQ adicionado!");
    },
    onError: () => toast.error("Erro ao salvar FAQ"),
  });

  const deleteMutation = useMutation({
    mutationFn: (faqId: string) => faqApi.remove(businessId, faqId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs", businessId] });
      toast.success("FAQ removido");
    },
  });

  function useSuggestion(s: typeof SUGGESTIONS[0]) {
    setValue("question", s.question);
    setValue("answer", s.answer);
    setValue("keywords", s.keywords);
    setShowForm(true);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FAQ — Perguntas Frequentes</h1>
          <p className="text-gray-500 mt-1">O bot responde automaticamente quando detectar as palavras-chave</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(true); reset(); }}>
          <Plus className="w-4 h-4" />
          Nova pergunta
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Adicionar FAQ</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Pergunta *</label>
                <input type="text" className="input" placeholder="Qual o horário de funcionamento?" {...register("question")} />
                {errors.question && <p className="text-xs text-red-500 mt-1">{errors.question.message}</p>}
              </div>
              <div>
                <label className="label">Resposta *</label>
                <textarea className="input h-28 resize-none" placeholder="Funcionamos de segunda a sexta..." {...register("answer")} />
                {errors.answer && <p className="text-xs text-red-500 mt-1">{errors.answer.message}</p>}
              </div>
              <div>
                <label className="label">Palavras-chave (separadas por vírgula) *</label>
                <input type="text" className="input" placeholder="horário, funcionamento, abre, fecha" {...register("keywords")} />
                <p className="text-xs text-gray-400 mt-1">O bot detecta qualquer dessas palavras na mensagem do cliente</p>
                {errors.keywords && <p className="text-xs text-red-500 mt-1">{errors.keywords.message}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {faqs.length === 0 && !isLoading && (
        <div className="mb-8">
          <p className="text-sm font-medium text-gray-600 mb-3">Sugestões para começar:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.question}
                onClick={() => useSuggestion(s)}
                className="text-left card border-dashed border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors"
              >
                <p className="font-medium text-sm text-gray-900 mb-1">{s.question}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{s.answer}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FAQ List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : faqs.length === 0 ? null : (
        <div className="space-y-3">
          {faqs.map((faq: any) => (
            <div key={faq.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                    <p className="font-medium text-gray-900 text-sm">{faq.question}</p>
                  </div>
                  <p className="text-sm text-gray-600 ml-6 mb-3">{faq.answer}</p>
                  <div className="ml-6 flex flex-wrap gap-1">
                    {faq.keywords.map((kw: string) => (
                      <span key={kw} className="badge bg-gray-100 text-gray-600 text-xs">{kw}</span>
                    ))}
                  </div>
                </div>
                <button
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  onClick={() => { if (confirm("Remover este FAQ?")) deleteMutation.mutate(faq.id); }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
