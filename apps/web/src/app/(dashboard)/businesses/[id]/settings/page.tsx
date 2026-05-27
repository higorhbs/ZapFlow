"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { businessApi } from "@/lib/api";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { useEffect, use } from "react";
import { BusinessTypePicker } from "@/components/business/BusinessTypePicker";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_PT: Record<string, string> = {
  mon: "Segunda", tue: "Terça", wed: "Quarta", thu: "Quinta",
  fri: "Sexta", sat: "Sábado", sun: "Domingo",
};

const schema = z.object({
  name: z.string().min(2),
  type: z.enum(["BARBERSHOP", "SALON", "RESTAURANT", "DENTAL", "STORE", "OTHER"]),
  phone: z.string().min(10),
  address: z.string().optional(),
  description: z.string().optional(),
  greetingMsg: z.string().min(5),
  awayMsg: z.string().min(5),
});

type FormData = z.infer<typeof schema>;

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: businessId } = use(params);
  const queryClient = useQueryClient();

  const { data: business, isLoading } = useQuery({
    queryKey: ["business", businessId],
    queryFn: () => businessApi.get(businessId),
  });

  const { register, control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (business) reset(business);
  }, [business, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => businessApi.update(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business", businessId] });
      toast.success("Configurações salvas!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Configurações do negócio</h1>

      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Informações básicas</h2>

          <div>
            <label className="label">Nome do negócio</label>
            <input type="text" className="input" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label mb-2 block">Tipo de negócio</label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <BusinessTypePicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div>
            <label className="label">Telefone WhatsApp</label>
            <input type="text" className="input" {...register("phone")} />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="label">Endereço</label>
            <input type="text" className="input" {...register("address")} />
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea className="input h-20 resize-none" {...register("description")} />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Mensagens automáticas</h2>
          <p className="text-sm text-gray-500">Variáveis disponíveis: <code className="bg-gray-100 px-1 rounded">{`{nome}`}</code>, <code className="bg-gray-100 px-1 rounded">{`{negocio}`}</code></p>

          <div>
            <label className="label">Mensagem de boas-vindas</label>
            <textarea className="input h-28 resize-none" {...register("greetingMsg")} />
            {errors.greetingMsg && <p className="text-xs text-red-500 mt-1">{errors.greetingMsg.message}</p>}
          </div>

          <div>
            <label className="label">Mensagem fora do horário</label>
            <textarea className="input h-28 resize-none" {...register("awayMsg")} />
            {errors.awayMsg && <p className="text-xs text-red-500 mt-1">{errors.awayMsg.message}</p>}
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={saveMutation.isPending || !isDirty}
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar configurações
        </button>
      </form>
    </div>
  );
}
