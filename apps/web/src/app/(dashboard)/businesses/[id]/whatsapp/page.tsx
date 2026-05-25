"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { whatsappApi } from "@/lib/api";
import { toast } from "sonner";
import { Smartphone, Wifi, WifiOff, QrCode, RefreshCw, Loader2 } from "lucide-react";
import Image from "next/image";

export default function WhatsAppPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const queryClient = useQueryClient();
  const [qrCode, setQrCode] = useState<string | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ["wa-status", id],
    queryFn: () => whatsappApi.status(id),
    refetchInterval: 5000,
  });

  const connectMutation = useMutation({
    mutationFn: () => whatsappApi.connect(id),
    onSuccess: (data) => {
      if (data.status === "qr") {
        setQrCode(data.qr);
        toast.info("QR Code gerado! Escaneie com seu WhatsApp.");
      } else if (data.status === "already_connected" || data.status === "connected") {
        toast.success("WhatsApp conectado!");
        queryClient.invalidateQueries({ queryKey: ["wa-status", id] });
      } else {
        toast.error(data.message ?? "Erro ao conectar");
      }
    },
    onError: () => toast.error("Erro ao iniciar conexão"),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => whatsappApi.disconnect(id),
    onSuccess: () => {
      setQrCode(null);
      queryClient.invalidateQueries({ queryKey: ["wa-status", id] });
      toast.success("WhatsApp desconectado");
    },
  });

  const isConnected = status?.connected;

  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Conexão WhatsApp</h1>
        <p className="text-gray-500 mt-1">Conecte seu número para ativar o atendimento automático</p>
      </div>

      <div className="card text-center">
        {/* Status indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isConnected ? "bg-green-50" : "bg-gray-100"}`}>
            {isConnected ? (
              <Wifi className="w-10 h-10 text-green-500" />
            ) : (
              <WifiOff className="w-10 h-10 text-gray-400" />
            )}
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {isLoading ? "Verificando..." : isConnected ? "Conectado!" : "Desconectado"}
        </h2>
        <p className="text-gray-500 text-sm mb-8">
          {isConnected
            ? "Seu WhatsApp está ativo e respondendo automaticamente."
            : "Escaneie o QR Code para ativar o atendimento."}
        </p>

        {/* QR Code */}
        {qrCode && !isConnected && (
          <div className="mb-8">
            <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm">
              <Image src={qrCode} alt="QR Code WhatsApp" width={250} height={250} />
            </div>
            <div className="mt-4 text-sm text-gray-500 space-y-1">
              <p>1. Abra o WhatsApp no celular</p>
              <p>2. Toque em <strong>Dispositivos conectados</strong></p>
              <p>3. Toque em <strong>Conectar dispositivo</strong></p>
              <p>4. Aponte a câmera para o QR Code</p>
            </div>
          </div>
        )}

        {/* Actions */}
        {isConnected ? (
          <button
            className="btn-danger"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
          >
            {disconnectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <WifiOff className="w-4 h-4" />}
            Desconectar
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
          >
            {connectMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : qrCode ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <QrCode className="w-4 h-4" />
            )}
            {qrCode ? "Novo QR Code" : "Gerar QR Code"}
          </button>
        )}
      </div>

      {/* Instructions */}
      {!isConnected && !qrCode && (
        <div className="mt-6 card bg-brand-50 border-brand-100">
          <h3 className="font-medium text-brand-900 mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Como funciona
          </h3>
          <ul className="text-sm text-brand-800 space-y-2">
            <li>• Usamos o WhatsApp Web Protocol para conectar seu número</li>
            <li>• A sessão fica salva — não precisa escanear toda vez</li>
            <li>• Se deslogar no celular, basta reconectar aqui</li>
            <li>• Recomendamos usar o WhatsApp Business</li>
          </ul>
        </div>
      )}
    </div>
  );
}
