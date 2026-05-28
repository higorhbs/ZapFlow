"use client";

import { useQuery } from "@tanstack/react-query";
import { businessApi, analyticsApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency } from "@/lib/utils";
import { MessageSquare, Calendar, DollarSign, TrendingUp, Store, ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { uid, ready } = useAuth();
  const { data: businesses, isLoading, isError, error } = useQuery({
    queryKey: ["businesses", uid],
    queryFn: businessApi.list,
    enabled: ready && !!uid,
  });
  const business = businesses?.[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-8">
        <p className="text-red-600">{(error as Error)?.message ?? "Erro ao carregar negócios"}</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-8">
        <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
          <Store className="w-8 h-8 text-brand-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Nenhum negócio cadastrado</h2>
        <p className="text-gray-500 text-center mb-6 max-w-sm">Cadastre seu negócio para começar a usar o atendimento automático no WhatsApp.</p>
        <Link href="/businesses/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Cadastrar meu negócio
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visão geral do seu negócio</p>
      </div>

      <div className="space-y-6">
        <BusinessCard business={business} />
      </div>
    </div>
  );
}

function BusinessCard({ business }: { business: any }) {
  const { data: analytics } = useQuery({
    queryKey: ["analytics", business.id],
    queryFn: () => analyticsApi.get(business.id),
    enabled: !!business.id,
  });

  const stats = [
    {
      label: "Conversas este mês",
      value: analytics?.conversations.thisMonth ?? "—",
      icon: MessageSquare,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Agendamentos",
      value: analytics?.appointments.pending ?? "—",
      icon: Calendar,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Receita este mês",
      value: analytics ? formatCurrency(analytics.payments.revenueThisMonth) : "—",
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Crescimento",
      value: analytics ? `${analytics.conversations.growth > 0 ? "+" : ""}${analytics.conversations.growth}%` : "—",
      icon: TrendingUp,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{business.name}</h2>
            <Link
              href={`/businesses/${business.id}/whatsapp`}
              className={cn(
                "badge hover:opacity-80 transition-opacity",
                business.isConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              )}
            >
              {business.isConnected ? "● Conectado" : "○ Desconectado"}
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{business.phone}</p>
        </div>
        <Link
          href={`/businesses/${business.id}/conversations`}
          className="btn-secondary text-xs"
        >
          Abrir painel
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl p-4 bg-gray-50">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", bg)}>
              <Icon className={cn("w-4 h-4", color)} />
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
