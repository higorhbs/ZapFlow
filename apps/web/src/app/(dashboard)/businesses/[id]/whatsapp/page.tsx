"use client";

import { useEffect, useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { whatsappApi } from "@/lib/api";
import { useBusinessId } from "@/lib/use-business-id";
import { markWhatsAppConnected, useSyncWhatsAppBusiness } from "@/lib/use-sync-wa-business";
import { toast } from "sonner";
import { Smartphone, Wifi, WifiOff, QrCode, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ConnectResponse = {
  status: string;
  qr?: string;
  message?: string;
};

export default function WhatsAppPage() {
  const id = useBusinessId();
  const queryClient = useQueryClient();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const lastSyncedConnected = useRef<boolean | null>(null);
  const wasConnected = useRef(false);
  const connectStarted = useRef(false);
  const silentConnect = useRef(false);

  const { data: status, isLoading } = useSyncWhatsAppBusiness(id);

  useEffect(() => {
    connectStarted.current = false;
  }, [id]);

  useEffect(() => {
    if (status?.connected && !wasConnected.current) {
      wasConnected.current = true;
      setQrCode(null);
      toast.success("WhatsApp conectado!");
    }
    if (!status?.connected) {
      wasConnected.current = false;
      if (status?.qr) setQrCode(status.qr);
    }
  }, [status?.connected, status?.qr]);

  const waUnavailable = status?.status === "unavailable";

  const connectMutation = useMutation({
    mutationFn: (force?: boolean) => whatsappApi.connect(id, force) as Promise<ConnectResponse>,
    onSuccess: (data) => {
      const silent = silentConnect.current;
      silentConnect.current = false;
      setConnectError(null);
      if (data.status === "qr" && data.qr) {
        setQrCode(data.qr);
        if (!silent) toast.info("QR Code gerado! Escaneie com seu WhatsApp.");
      } else if (data.status === "already_connected" || data.status === "connected") {
        setQrCode(null);
        void queryClient.invalidateQueries({ queryKey: ["wa-status", id] });
      } else if (data.status === "connecting" || data.status === "pending") {
        if (!silent) toast.info(data.message ?? "Gerando QR Code… aguarde nesta tela.");
        void queryClient.invalidateQueries({ queryKey: ["wa-status", id] });
      } else if (data.status === "timeout") {
        toast.error(data.message ?? "QR expirou. Gere outro código.");
      } else if (data.status === "error") {
        toast.error(data.message ?? "Erro ao conectar");
      } else if (!silent) {
        toast.error(data.message ?? "Resposta inesperada da API");
      }
    },
    onError: (err: Error) => {
      const silent = silentConnect.current;
      silentConnect.current = false;
      connectStarted.current = false;
      const msg = err.message ?? "Erro ao iniciar conexão";
      setConnectError(msg);
      if (!silent) toast.error(msg);
    },
  });

  const { mutate: startConnect, isPending: isConnectPending } = connectMutation;

  useEffect(() => {
    if (isLoading || waUnavailable || status?.connected || qrCode || status?.qr) return;
    if (connectStarted.current || isConnectPending) return;
    const t = setTimeout(() => {
      if (connectStarted.current) return;
      connectStarted.current = true;
      silentConnect.current = true;
      startConnect(false);
    }, 400);
    return () => clearTimeout(t);
  }, [isLoading, waUnavailable, status?.connected, status?.qr, qrCode, isConnectPending, startConnect]);

  useEffect(() => {
    if (qrCode || status?.qr || status?.connected || waUnavailable) return;
    const t = setTimeout(() => {
      if (qrCode || status?.qr || connectStarted.current) return;
      connectStarted.current = true;
      silentConnect.current = true;
      startConnect(true);
    }, 40_000);
    return () => clearTimeout(t);
  }, [qrCode, status?.qr, status?.connected, waUnavailable, startConnect]);

  const isConnected = status?.connected;

  const disconnectMutation = useMutation({
    mutationFn: () => whatsappApi.disconnect(id),
    onSuccess: () => {
      setQrCode(null);
      connectStarted.current = false;
      void markWhatsAppConnected(queryClient, id, false, lastSyncedConnected);
      toast.success("WhatsApp desconectado");
      silentConnect.current = true;
      connectStarted.current = true;
      startConnect(false);
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao desconectar"),
  });

  const isGeneratingQr =
    !isConnected &&
    !waUnavailable &&
    !qrCode &&
    (isConnectPending || status?.status === "connecting" || status?.status === "qr");

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Conexão WhatsApp</h1>
        <p className="text-gray-500 mt-1">Conecte seu número para ativar o atendimento automático</p>
      </div>

      {waUnavailable && (
        <Card className="mb-6 flex gap-3 border-amber-200 bg-amber-50 text-sm text-amber-900">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">WhatsApp indisponível neste ambiente</p>
            <p className="mt-1 text-amber-800">
              Rode <strong>pnpm dev</strong> e acesse <strong>http://localhost:3000</strong> (API na
              porta 3001 com <code className="text-xs">ENABLE_WORKERS=true</code>).
            </p>
          </div>
        </Card>
      )}

      <Card className="text-center">
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
            : isGeneratingQr
              ? "Gerando QR Code… aguarde nesta tela."
              : "Escaneie o QR Code para ativar o atendimento."}
        </p>

        {connectError && !isConnected && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 text-left">
            <p>{connectError}</p>
            <p className="mt-1 text-amber-800">Se persistir, confira na VM: docker compose -f docker-compose.prod.yml ps && docker compose -f docker-compose.prod.yml logs --tail=80 api</p>
          </div>
        )}

        {isGeneratingQr && (
          <div className="mb-8 flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
            <p className="text-sm text-gray-500">Preparando conexão com WhatsApp…</p>
          </div>
        )}

        {qrCode && !isConnected && (
          <div className="mb-8">
            <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm">
              <img src={qrCode} alt="QR Code WhatsApp" width={250} height={250} className="mx-auto" />
            </div>
            <div className="mt-4 text-sm text-gray-500 space-y-1">
              <p>1. Abra o WhatsApp no celular</p>
              <p>2. Toque em <strong>Dispositivos conectados</strong></p>
              <p>3. Toque em <strong>Conectar dispositivo</strong></p>
              <p>4. Aponte a câmera para o QR Code</p>
              <p className="text-brand-600 pt-2">Após escanear, aguarde alguns segundos nesta tela.</p>
            </div>
          </div>
        )}

        {isConnected ? (
          <Button
            type="button"
            variant="destructiveSolid"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending || waUnavailable}
          >
            {disconnectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <WifiOff className="w-4 h-4" />}
            Desconectar
          </Button>
        ) : isGeneratingQr ? null : (
          <Button
            onClick={() => connectMutation.mutate(!!qrCode)}
            disabled={connectMutation.isPending || waUnavailable}
          >
            {connectMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : qrCode ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <QrCode className="w-4 h-4" />
            )}
            {qrCode ? "Novo QR Code" : "Gerar QR Code"}
          </Button>
        )}
      </Card>

      {!isConnected && !qrCode && !waUnavailable && !isGeneratingQr && (
        <Card className="mt-6 border-brand-100 bg-brand-50">
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
        </Card>
      )}
    </div>
  );
}
