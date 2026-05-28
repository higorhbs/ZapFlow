"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogApi } from "@/lib/api";
import { useBusinessId } from "@/lib/use-business-id";
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Package } from "lucide-react";

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

export default function CatalogPage() {
  const businessId = useBusinessId();
  const { ready, uid } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: items = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["catalog", businessId, uid],
    queryFn: () => catalogApi.list(businessId),
    enabled: ready && !!uid && !!businessId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  function openNew() {
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
        if (mode === "update") {
          return list.map((i) => (i.id === saved.id ? { ...i, ...saved } : i));
        }
        if (list.some((i) => i.id === saved.id)) return list;
        return [...list, saved];
      });
      setShowForm(false);
      setEditing(null);
      toast.success(mode === "update" ? "Item atualizado!" : "Item adicionado!");
    },
    onError: (err: unknown) => {
      const code =
        err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      if (code === "permission-denied") {
        toast.error("Sem permissão para salvar neste negócio.");
        return;
      }
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Serviços</h1>
          <p className="text-gray-500 mt-1">Itens exibidos quando o cliente pede o catálogo ou orçamento</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <Plus className="w-4 h-4" />
          Adicionar item
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              {editing ? "Editar item" : "Novo item"}
            </h2>
            <form
              onSubmit={handleSubmit((d) =>
                saveMutation.mutate({
                  data: d,
                  mode: editing ? "update" : "create",
                  itemId: editing?.id,
                })
              )}
              className="space-y-4"
            >
              <div>
                <label className="label">Nome *</label>
                <input type="text" className="input" placeholder="Corte masculino" {...register("name")} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea className="input h-20 resize-none" placeholder="Inclui lavagem e finalização..." {...register("description")} />
              </div>
              <div>
                <label className="label">Preço (R$) *</label>
                <input type="number" step="0.01" className="input" placeholder="50.00" {...register("price")} />
                {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="available" className="rounded" {...register("available")} />
                <label htmlFor="available" className="text-sm text-gray-700">Disponível</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary flex-1" disabled={isSubmitting || saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isError && (
        <div className="mb-6 card bg-red-50 border-red-200 text-sm text-red-800">
          <p>{(error as Error)?.message ?? "Erro ao carregar catálogo"}</p>
          <button type="button" className="btn-secondary mt-3 text-xs" onClick={() => refetch()}>
            Tentar de novo
          </button>
        </div>
      )}

      {/* Items list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum item no catálogo</p>
          <p className="text-sm mt-1">Adicione seus serviços e produtos para o bot enviar automaticamente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: CatalogItem) => (
            <div key={item.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <span className={`badge ${item.available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {item.available ? "Disponível" : "Indisponível"}
                </span>
              </div>
              {item.description && <p className="text-sm text-gray-500 mb-3">{item.description}</p>}
              <p className="text-xl font-bold text-brand-600 mb-4">{formatCurrency(item.price)}</p>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 text-xs" onClick={() => openEdit(item)}>
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
                <button
                  className="btn-secondary text-xs text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if (confirm("Remover este item?")) deleteMutation.mutate(item.id);
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
