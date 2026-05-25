"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { businessApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BUSINESS_TYPE_LABELS } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  type: z.enum(["BARBERSHOP", "SALON", "RESTAURANT", "DENTAL", "STORE", "OTHER"]),
  phone: z.string().min(10, "Telefone inválido"),
  address: z.string().optional(),
  description: z.string().optional(),
  greetingMsg: z.string().optional(),
  awayMsg: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_PT = { mon: "Seg", tue: "Ter", wed: "Qua", thu: "Qui", fri: "Sex", sat: "Sáb", sun: "Dom" };

export default function NewBusinessPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "BARBERSHOP",
      greetingMsg: "Olá {nome}! Bem-vindo ao {negocio} 😊 Como posso ajudar?",
      awayMsg: "Olá! No momento estamos fechados, mas logo retornamos. Deixe sua mensagem!",
    },
  });

  async function onSubmit(data: FormData) {
    try {
      const workingHours: Record<string, [string, string] | null> = {};
      DAY_KEYS.forEach((d) => { workingHours[d] = d === "sun" ? null : ["09:00", "18:00"]; });

      const business = await businessApi.create({ ...data, workingHours });
      toast.success("Negócio criado com sucesso!");
      router.push(`/businesses/${business.id}/whatsapp`);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Erro ao criar negócio");
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo negócio</h1>
          <p className="text-gray-500 text-sm mt-0.5">Configure seu negócio para usar o atendimento automático</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Informações básicas</h2>

          <div>
            <label className="label">Nome do negócio *</label>
            <input type="text" className="input" placeholder="Barbearia do João" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Tipo de negócio *</label>
            <select className="input" {...register("type")}>
              {Object.entries(BUSINESS_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Número do WhatsApp Business *</label>
            <input type="text" className="input" placeholder="+55 11 99999-9999" {...register("phone")} />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="label">Endereço</label>
            <input type="text" className="input" placeholder="Rua das Flores, 123 - São Paulo/SP" {...register("address")} />
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea className="input h-20 resize-none" placeholder="Breve descrição do seu negócio..." {...register("description")} />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Mensagens automáticas</h2>
          <p className="text-sm text-gray-500">Use {`{nome}`} e {`{negocio}`} como variáveis dinâmicas.</p>

          <div>
            <label className="label">Mensagem de boas-vindas</label>
            <textarea className="input h-24 resize-none" {...register("greetingMsg")} />
          </div>

          <div>
            <label className="label">Mensagem fora do horário</label>
            <textarea className="input h-24 resize-none" {...register("awayMsg")} />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Criar negócio e conectar WhatsApp
        </button>
      </form>
    </div>
  );
}
