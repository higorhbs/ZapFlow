"use client";

import { useQuery } from "@tanstack/react-query";
import { businessApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { BUSINESS_TYPE_LABELS, cn } from "@/lib/utils";
import Link from "next/link";
import { Plus, ArrowRight, Wifi, WifiOff, Store } from "lucide-react";

export default function BusinessesPage() {
  const { uid, ready } = useAuth();
  const { data: businesses, isLoading, isError, error } = useQuery({
    queryKey: ["businesses", uid],
    queryFn: businessApi.list,
    enabled: ready && !!uid,
  });
  const list = businesses ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Negócios</h1>
          <p className="text-gray-500 mt-1">Gerencie todos os seus negócios em um só lugar</p>
        </div>
        <Link href="/businesses/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo negócio
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="card animate-pulse h-48 bg-gray-100" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-20">
          <p className="text-red-600 mb-2">{(error as Error)?.message ?? "Erro ao carregar negócios"}</p>
          <p className="text-sm text-gray-500">Confira o login e as regras do Firestore (coleção businesses).</p>
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Nenhum negócio cadastrado</h2>
          <p className="text-gray-500 mb-6">Cadastre seu primeiro negócio para começar</p>
          <Link href="/businesses/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Cadastrar meu negócio
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((b: any) => (
            <Link key={b.id} href={`/businesses/${b.id}/conversations`} className="card hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
                  <Store className="w-6 h-6 text-brand-600" />
                </div>
                <span className={cn("badge", b.isConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                  {b.isConnected ? <><Wifi className="w-3 h-3 inline mr-1" />Conectado</> : <><WifiOff className="w-3 h-3 inline mr-1" />Desconectado</>}
                </span>
              </div>
              <h2 className="font-semibold text-gray-900 mb-1">{b.name}</h2>
              <p className="text-sm text-gray-500 mb-1">{BUSINESS_TYPE_LABELS[b.type]}</p>
              <p className="text-xs text-gray-400">{b.phone}</p>
              <div className="flex items-center justify-end mt-4 text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-medium">Abrir painel</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </Link>
          ))}

          <Link
            href="/businesses/new"
            className="card border-dashed border-gray-200 flex flex-col items-center justify-center min-h-48 text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors"
          >
            <Plus className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Adicionar negócio</span>
          </Link>
        </div>
      )}
    </div>
  );
}
