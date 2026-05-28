"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogApi, tenantApi } from "@/lib/api";
import { useBusinessId } from "@/lib/use-business-id";
import { useBusinessVocabulary } from "@/lib/use-business-vocabulary";
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency, cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Loader2, Package,
  ShoppingBag, Tag, AlertTriangle, X, Check,
} from "lucide-react";
import { PLAN_LIMITS } from "@zapflow/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { VocabLabel } from "@/components/layout/VocabLabel";

type CatalogItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  available: boolean;
  imageUrl?: string;
};

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Preço deve ser positivo"),
  available: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

// Gera cor determinística pelo nome do item
const AVATAR_COLORS = [
  { bg: "bg-blue-100",    text: "text-blue-700",    accent: "from-blue-400 to-blue-600" },
  { bg: "bg-violet-100",  text: "text-violet-700",  accent: "from-violet-400 to-violet-600" },
  { bg: "bg-emerald-100", text: "text-emerald-700", accent: "from-emerald-400 to-emerald-600" },
  { bg: "bg-amber-100",   text: "text-amber-700",   accent: "from-amber-400 to-amber-500" },
  { bg: "bg-rose-100",    text: "text-rose-700",    accent: "from-rose-400 to-rose-600" },
  { bg: "bg-cyan-100",    text: "text-cyan-700",    accent: "from-cyan-400 to-cyan-600" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", accent: "from-fuchsia-400 to-fuchsia-600" },
];

function getItemColor(name: string) {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

export default function CatalogPage() {
  const businessId = useBusinessId();
  const v = useBusinessVocabulary();
  const { ready, uid } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: items = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["catalog", businessId, uid],
    queryFn: () => catalogApi.list(businessId),
    enabled: ready && !!uid && !!businessId,
  });

  const { data: tenant } = useQuery({
    queryKey: ["tenant", uid],
    queryFn: () => tenantApi.get(),
    enabled: ready && !!uid,
  });

  const catalogLimit = PLAN_LIMITS[(tenant?.plan ?? "STARTER") as keyof typeof PLAN_LIMITS].catalogItems;
  const limitReached = Number.isFinite(catalogLimit) && items.length >= catalogLimit;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const watchAvailable = watch("available", true);

  function openNew() {
    if (limitReached) {
      toast.error(`Seu plano permite até ${catalogLimit} ${v.catalogLimitToast}.`);
      return;
    }
    setEditing(null);
    reset({ name: "", description: "", available: true });
    setShowForm(true);
  }

  function openEdit(item: CatalogItem) {
    setEditing(item);
    reset({ name: item.name, description: item.description ?? "", price: item.price, available: item.available });
    setShowForm(true);
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: { data: FormData; mode: "create" | "update"; itemId?: string }) => {
      const { data, mode, itemId } = payload;
      if (mode === "update" && itemId) {
        const updated = await catalogApi.update(businessId, itemId, data);
        if (!updated) throw new Error("Item não encontrado.");
        return { saved: updated, mode };
      }
      const created = await catalogApi.create(businessId, data);
      return { saved: created, mode: "create" as const };
    },
    onSuccess: ({ saved, mode }) => {
      queryClient.setQueryData<CatalogItem[]>(["catalog", businessId, uid], (old) => {
        const list = old ?? [];
        if (mode === "update") return list.map((i) => (i.id === saved.id ? { ...i, ...saved } : i));
        if (list.some((i) => i.id === saved.id)) return list;
        return [...list, saved];
      });
      setShowForm(false);
      setEditing(null);
      toast.success(mode === "update" ? "Item atualizado!" : "Item adicionado!");
    },
    onError: (err: unknown) => {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      if (code === "permission-denied") { toast.error("Sem permissão para salvar neste negócio."); return; }
      const msg = err instanceof Error ? err.message : "Erro ao salvar item";
      toast.error(msg.includes("undefined") ? "Dados inválidos. Confira nome e preço." : msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => catalogApi.remove(businessId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", businessId] });
      toast.success("Item removido");
    },
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-brand-500 to-blue-500 p-6 mb-8 shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-6 w-48 h-48 rounded-full bg-white/5" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm flex-shrink-0">
              <ShoppingBag className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                <VocabLabel ready={v.vocabReady} variant="light" width="9rem" block>
                  {v.catalogPageTitle}
                </VocabLabel>
              </h1>
              <p className="text-white/70 text-sm mt-0.5">
                <VocabLabel ready={v.vocabReady} variant="light" width="14rem" block>
                  {v.catalogPageSubtitle}
                </VocabLabel>
              </p>
            </div>
          </div>
          <button
            onClick={openNew}
            disabled={limitReached}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-brand-700 font-medium text-sm hover:bg-white/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Adicionar item
          </button>
        </div>
      </div>

      {/* Limit warning */}
      {limitReached && (
        <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Limite do plano atingido: máximo de <strong>{catalogLimit}</strong> {v.catalogLimitToast}.
          </p>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-violet-600 to-brand-500 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {editing ? "Editar item" : "Novo item"}
                  </h3>
                  <p className="text-white/70 text-xs mt-0.5">
                    {editing ? `Atualize o ${v.catalogItemSingular}` : `Adicione um ${v.catalogItemSingular} ao ${v.catalogNav.toLowerCase()}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit((d) => saveMutation.mutate({ data: d, mode: editing ? "update" : "create", itemId: editing?.id }))}
              className="px-6 py-5 space-y-4"
            >
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Nome *</Label>
                <Input type="text" placeholder="Corte masculino" {...register("name")} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Descrição</Label>
                <Textarea
                  className="min-h-20 resize-none"
                  placeholder="Inclui lavagem e finalização..."
                  {...register("description")}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Preço (R$) *</Label>
                <Input type="number" step="0.01" placeholder="50.00" {...register("price")} />
                {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
              </div>

              {/* Availability toggle */}
              <button
                type="button"
                onClick={() => setValue("available", !watchAvailable)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all",
                  watchAvailable
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 bg-gray-50 text-gray-500"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className={cn("w-2 h-2 rounded-full", watchAvailable ? "bg-emerald-500" : "bg-gray-400")} />
                  {watchAvailable ? "Disponível para pedido" : "Indisponível no momento"}
                </span>
                <div className={cn(
                  "relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors",
                  watchAvailable ? "bg-emerald-500" : "bg-gray-300"
                )}>
                  <span className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                    watchAvailable ? "translate-x-4" : "translate-x-0"
                  )} />
                </div>
                <input type="checkbox" className="sr-only" {...register("available")} />
              </button>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || saveMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {saveMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Check className="w-4 h-4" />
                  }
                  {editing ? "Salvar alterações" : "Adicionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex items-start gap-3 mb-6 px-4 py-4 rounded-2xl bg-red-50 border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-800">{(error as Error)?.message ?? `Erro ao carregar ${v.catalogNav.toLowerCase()}`}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 text-xs font-medium text-red-700 underline hover:no-underline"
            >
              Tentar de novo
            </button>
          </div>
        </div>
      )}

      {/* Items */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-brand-100 flex items-center justify-center mb-4 shadow-sm">
            <Package className="w-10 h-10 text-brand-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">{v.catalogEmptyTitle}</h3>
          <p className="text-sm text-gray-400 max-w-xs mb-6">{v.catalogEmptyHint}</p>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar primeiro item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(items as CatalogItem[]).map((item) => {
            const color = getItemColor(item.name);
            return (
              <div
                key={item.id}
                className="group relative rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-gray-300 hover:shadow-md transition-all"
              >
                {/* Top accent bar */}
                <div className={cn(
                  "h-1",
                  item.available
                    ? `bg-gradient-to-r ${color.accent}`
                    : "bg-gradient-to-r from-gray-300 to-gray-400"
                )} />

                <div className="p-5">
                  {/* Avatar + name + badge */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0",
                      item.available ? color.bg : "bg-gray-100",
                      item.available ? color.text : "text-gray-400"
                    )}>
                      {item.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate">
                        {item.name}
                      </h3>
                      <span className={cn(
                        "inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        item.available
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          item.available ? "bg-emerald-500" : "bg-gray-400"
                        )} />
                        {item.available ? "Disponível" : "Indisponível"}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">
                      {item.description}
                    </p>
                  )}

                  {/* Price + actions */}
                  <div className={cn("flex items-center justify-between", !item.description && "mt-2")}>
                    <div>
                      <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">Preço</p>
                      <p className={cn(
                        "text-xl font-bold",
                        item.available ? "text-brand-600" : "text-gray-400"
                      )}>
                        {formatCurrency(item.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="w-8 h-8 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 flex items-center justify-center transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm("Remover este item?")) deleteMutation.mutate(item.id); }}
                        disabled={deleteMutation.isPending}
                        className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add card */}
          <button
            onClick={openNew}
            disabled={limitReached}
            className="rounded-2xl border-2 border-dashed border-gray-200 bg-transparent hover:border-brand-400 hover:bg-brand-50/40 transition-all flex flex-col items-center justify-center gap-2 py-10 text-gray-400 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Novo item</span>
          </button>
        </div>
      )}
    </div>
  );
}
