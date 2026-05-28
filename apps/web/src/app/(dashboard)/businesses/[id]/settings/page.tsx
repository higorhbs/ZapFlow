"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { businessApi } from "@/lib/api";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { BusinessTypePicker } from "@/components/business/BusinessTypePicker";
import { WorkingHoursEditor, defaultWorkingHours, type WorkingHoursValue } from "@/components/business/WorkingHoursEditor";
import { useBusinessId } from "@/lib/use-business-id";
import { persistBusinessSnapshot } from "@/lib/business-route";

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

export default function SettingsPage() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();

  const { data: business, isLoading } = useQuery({
    queryKey: ["business", businessId],
    queryFn: () => businessApi.get(businessId),
  });

  const [workingHours, setWorkingHours] = useState<WorkingHoursValue>(defaultWorkingHours);
  const [hoursDirty, setHoursDirty] = useState(false);

  const { register, control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!business) return;
    if (business.id && business.type) persistBusinessSnapshot({ id: business.id, type: business.type });
    reset(business);
    const wh = business.workingHours as WorkingHoursValue;
    setWorkingHours(wh && Object.keys(wh).length > 0 ? wh : defaultWorkingHours());
    setHoursDirty(false);
  }, [business, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => businessApi.update(businessId, { ...data, workingHours }),
    onSuccess: (_data, variables) => {
      setHoursDirty(false);
      persistBusinessSnapshot({ id: businessId, type: variables.type });
      queryClient.invalidateQueries({ queryKey: ["business", businessId] });
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
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
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Configurações do negócio</h1>

      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-6">
        <Card className="space-y-4">
          <h2 className="font-semibold text-gray-900">Informações básicas</h2>

          <div className="space-y-1.5">
            <Label>Nome do negócio</Label>
            <Input type="text" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Tipo de negócio</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <BusinessTypePicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Telefone WhatsApp</Label>
            <Input type="text" {...register("phone")} />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input type="text" {...register("address")} />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea className="min-h-20 resize-none" {...register("description")} />
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold text-gray-900">Horário de funcionamento</h2>
          <p className="text-sm text-gray-500">
            Horários no fuso de Brasília. Fora desse horário o bot envia a mensagem &quot;fora do horário&quot; abaixo.
          </p>
          <WorkingHoursEditor
            value={workingHours}
            onChange={(v) => {
              setWorkingHours(v);
              setHoursDirty(true);
            }}
          />
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold text-gray-900">Mensagens automáticas</h2>
          <p className="text-sm text-gray-500">Variáveis disponíveis: <code className="bg-gray-100 px-1 rounded">{`{nome}`}</code>, <code className="bg-gray-100 px-1 rounded">{`{negocio}`}</code></p>

          <div className="space-y-1.5">
            <Label>Mensagem de boas-vindas</Label>
            <Textarea className="min-h-28 resize-none" {...register("greetingMsg")} />
            {errors.greetingMsg && <p className="text-xs text-red-500 mt-1">{errors.greetingMsg.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Mensagem fora do horário</Label>
            <Textarea className="min-h-28 resize-none" {...register("awayMsg")} />
            {errors.awayMsg && <p className="text-xs text-red-500 mt-1">{errors.awayMsg.message}</p>}
          </div>
        </Card>

        <Button
          type="submit"
          disabled={saveMutation.isPending || (!isDirty && !hoursDirty)}
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar configurações
        </Button>
      </form>
    </div>
  );
}
