"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { businessApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BusinessTypePicker } from "@/components/business/BusinessTypePicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useRequiresBusinessSetup } from "@/hooks/use-requires-business-setup";

const schema = z
  .object({
    name: z.string().min(2, "Nome muito curto"),
    type: z.enum(["BARBERSHOP", "SALON", "RESTAURANT", "DENTAL", "STORE", "OTHER"]),
    typeLabel: z.string().trim().max(60).optional(),
    phone: z.string().min(10, "Telefone inválido"),
    address: z.string().optional(),
    description: z.string().optional(),
    greetingMsg: z.string().optional(),
    awayMsg: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "OTHER" && (!data.typeLabel || data.typeLabel.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o nome do tipo de negócio",
        path: ["typeLabel"],
      });
    }
  });

type FormData = z.infer<typeof schema>;

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_PT = { mon: "Seg", tue: "Ter", wed: "Qua", thu: "Qui", fri: "Sex", sat: "Sáb", sun: "Dom" };

export default function NewBusinessPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { uid, ready } = useAuth();
  const { active: setupRequired } = useRequiresBusinessSetup();
  const { data: businesses, isLoading: checkingBusiness } = useQuery({
    queryKey: ["businesses", uid],
    queryFn: businessApi.list,
    enabled: ready && !!uid,
  });
  const existingBusiness = businesses?.[0];
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "BARBERSHOP",
      typeLabel: "",
      greetingMsg: "Olá {nome}! Bem-vindo ao {negocio} 😊 Como posso ajudar?",
      awayMsg: "Olá! No momento estamos fechados, mas logo retornamos. Deixe sua mensagem!",
    },
  });

  async function onSubmit(data: FormData) {
    if (existingBusiness) {
      toast.error("Sua conta já possui um negócio cadastrado.");
      router.replace(`/businesses/${existingBusiness.id}/settings`);
      return;
    }
    try {
      const workingHours: Record<string, [string, string] | null> = {};
      DAY_KEYS.forEach((d) => { workingHours[d] = d === "sun" ? null : ["09:00", "18:00"]; });

      const business = await businessApi.create({
        ...data,
        typeLabel: data.type === "OTHER" ? data.typeLabel?.trim() : undefined,
        workingHours,
      });
      await queryClient.invalidateQueries({ queryKey: ["businesses", uid] });
      toast.success("Negócio criado com sucesso!");
      router.push(`/businesses/${business.id}/whatsapp`);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Erro ao criar negócio");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
      {checkingBusiness ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : existingBusiness ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Negócio já cadastrado</h2>
          <p className="text-sm text-gray-500 mb-4">Sua conta permite apenas um negócio. Você pode editar os dados existentes.</p>
          <Link href={`/businesses/${existingBusiness.id}/settings`} className={buttonVariants()}>
            Ir para configurações
          </Link>
        </Card>
      ) : (
        <>
      <div className="flex items-center gap-4 mb-10">
        {!setupRequired && (
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {setupRequired ? "Crie seu negócio" : "Novo negócio"}
          </h1>
          <p className="text-gray-500 mt-1">
            {setupRequired
              ? "Último passo para começar: cadastre seu negócio e conecte o WhatsApp."
              : "Configure seu negócio para usar o atendimento automático"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Informações básicas</h2>
            <p className="text-sm text-gray-500 mt-0.5">Dados principais do seu negócio</p>
          </div>

          <div className="space-y-1.5">
            <Label>Nome do negócio *</Label>
            <Input type="text" placeholder="Barbearia do João" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Tipo de negócio *</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Controller
                  name="typeLabel"
                  control={control}
                  render={({ field: labelField }) => (
                    <BusinessTypePicker
                      value={field.value}
                      onChange={field.onChange}
                      typeLabel={labelField.value ?? ""}
                      onTypeLabelChange={labelField.onChange}
                      typeLabelError={errors.typeLabel?.message}
                      error={errors.type?.message}
                    />
                  )}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Número do WhatsApp Business *</Label>
              <Input type="text" placeholder="+55 11 99999-9999" {...register("phone")} />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input type="text" placeholder="Rua das Flores, 123 - São Paulo/SP" {...register("address")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea className="min-h-24 resize-none" placeholder="Breve descrição do seu negócio..." {...register("description")} />
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Mensagens automáticas</h2>
            <p className="text-sm text-gray-500 mt-0.5">Use {`{nome}`} e {`{negocio}`} como variáveis dinâmicas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Mensagem de boas-vindas</Label>
              <Textarea className="min-h-28 resize-none" {...register("greetingMsg")} />
            </div>

            <div className="space-y-1.5">
              <Label>Mensagem fora do horário</Label>
              <Textarea className="min-h-28 resize-none" {...register("awayMsg")} />
            </div>
          </div>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {setupRequired ? "Criar meu negócio e continuar" : "Criar negócio e conectar WhatsApp"}
        </Button>
      </form>
        </>
      )}
      </div>
    </div>
  );
}
