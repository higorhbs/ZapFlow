"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { whatsappApi } from "@/lib/api";
import { useBusinessId } from "@/lib/use-business-id";
import {
  markWhatsAppConnected,
  patchWhatsAppStatus,
  useSyncWhatsAppBusiness,
} from "@/lib/use-sync-wa-business";
import {
  WhatsAppConnectionRunner,
  resolveWhatsAppRunnerPhase,
} from "@/components/whatsapp/WhatsAppConnectionRunner";
import { toast } from "sonner";
import { Smartphone, Wifi, WifiOff, QrCode, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ConnectResponse = {
  status: string;
  qr?: string;
  message?: string;
};

function applyQr(
  queryClient: ReturnType<typeof useQueryClient>,
  businessId: string,
  qr: string,
  setQrCode: (v: string) => void
) {
  setQrCode(qr);
  patchWhatsAppStatus(queryClient, businessId, { connected: false, status: "qr", qr });
}

export default function WhatsAppPage() {
  const id = useBusinessId();
  const queryClient = useQueryClient();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const lastSyncedConnected = useRef<boolean | null>(null);
  const wasConnected = useRef(false);
  const connectStarted = useRef(false);
  const silentConnect = useRef(false);

  const {
    data: status,
    isInitialLoading,
    isError: statusError,
    failureReason: statusFailure,
    connected: isConnected,
    refetch: refetchStatus,
  } = useSyncWhatsAppBusiness(id);

  const displayQr = qrCode || (!isConnected ? status?.qr : null) || null;
  const hasQr = Boolean(displayQr);
  const waUnavailable = status?.status === "unavailable";
  const waitingQr =
    !isConnected &&
    !hasQr &&
    (status?.status === "connecting" || status?.status === "qr");

  const connectMutation = useMutation({
    mutationFn: (force?: boolean) => whatsappApi.connect(id, force) as Promise<ConnectResponse>,
    onMutate: () => setConnectError(null),
    onSuccess: (data) => {
      const silent = silentConnect.current;
      silentConnect.current = false;

      if (data.status === "qr" && data.qr) {
        applyQr(queryClient, id, data.qr, setQrCode);
        if (!silent) toast.info("QR Code gerado! Escaneie com seu WhatsApp.");
        return;
      }

      if (data.status === "already_connected" || data.status === "connected") {
        setQrCode(null);
        patchWhatsAppStatus(queryClient, id, { connected: true, status: "open" });
        return;
      }

      if (data.status === "connecting" || data.status === "pending") {
        patchWhatsAppStatus(queryClient, id, { connected: false, status: "connecting" });
        void queryClient.invalidateQueries({ queryKey: ["wa-status", id] });
        return;
      }

      if (data.status === "timeout") {
        toast.error(data.message ?? "QR expirou. Gere outro código.");
        return;
      }

      if (data.status === "error") {
        toast.error(data.message ?? "Erro ao conectar");
        return;
      }

      if (!silent) toast.error(data.message ?? "Resposta inesperada da API");
    },
    onError: (err: Error & { code?: string }) => {
      const silent = silentConnect.current;
      silentConnect.current = false;
      if (err.code === "ECONNABORTED") {
        connectStarted.current = true;
        patchWhatsAppStatus(queryClient, id, { connected: false, status: "connecting" });
        void queryClient.invalidateQueries({ queryKey: ["wa-status", id] });
        return;
      }
      connectStarted.current = false;
      if (silent) return;
      const msg = err.message ?? "Erro ao iniciar conexão";
      setConnectError(msg);
      toast.error(msg);
    },
  });

  const { mutate: startConnect, isPending: isConnectPending } = connectMutation;

  useEffect(() => {
    if (isConnected) setQrCode(null);
  }, [isConnected]);

  useEffect(() => {
    if (status?.qr && !isConnected) {
      setQrCode(status.qr);
    }
  }, [status?.qr, isConnected]);

  const runnerPhase = useMemo(
    () =>
      resolveWhatsAppRunnerPhase({
        connected: isConnected,
        reconnecting: isConnectPending,
        waitingQr,
        hasQr,
      }),
    [isConnected, isConnectPending, waitingQr, hasQr],
  );

  const showRunner =
    !isConnected && (isConnectPending || waitingQr || hasQr);

  useEffect(() => {
    connectStarted.current = false;
    setQrCode(null);
  }, [id]);

  useEffect(() => {
    if (isConnected || status?.qr) setConnectError(null);
  }, [isConnected, status?.qr]);

  useEffect(() => {
    if (isConnected && !wasConnected.current) {
      wasConnected.current = true;
      setQrCode(null);
      toast.success("WhatsApp conectado!");
    }
    if (!isConnected) wasConnected.current = false;
  }, [isConnected]);

  useEffect(() => {
    if (isInitialLoading || waUnavailable || isConnected || hasQr) return;
    if (connectStarted.current || isConnectPending) return;
    const t = setTimeout(() => {
      if (connectStarted.current) return;
      connectStarted.current = true;
      silentConnect.current = true;
      startConnect(false);
    }, 400);
    return () => clearTimeout(t);
  }, [isInitialLoading, waUnavailable, isConnected, hasQr, isConnectPending, startConnect]);

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

  if (isInitialLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-label="Carregando" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Conexão WhatsApp</h1>
        <p className="text-gray-500 mt-1">Conecte seu número para ativar o atendimento automático</p>
      </div>

      {waUnavailable && (
        <Card className="mb-6 flex gap-3 px-4 border-amber-200 bg-amber-50 text-sm text-amber-900">
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

      <Card className="text-center overflow-hidden">
        {showRunner && (
          <div className="border-b border-gray-100 bg-gradient-to-b from-white to-brand-50/30 px-2 pt-4 pb-2">
            <WhatsAppConnectionRunner phase={runnerPhase} />
          </div>
        )}

        <div className="p-6 pt-5">
          <div className="flex items-center justify-center mb-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-500 ${
                isConnected ? "bg-green-50 ring-2 ring-green-200" : "bg-gray-100"
              }`}
            >
              {isConnected ? (
                <Wifi className="w-8 h-8 text-green-500" />
              ) : (
                <WifiOff className="w-8 h-8 text-gray-400" />
              )}
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {isConnected ? "Conectado!" : displayQr ? "Escaneie o QR Code" : "Desconectado"}
          </h2>

          {(connectError || statusError) && !isConnected && !isConnectPending && !waitingQr && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 text-left">
              <p>
                {statusError
                  ? statusFailure instanceof Error
                    ? statusFailure.message
                    : "Não foi possível consultar o status do WhatsApp."
                  : connectError}
              </p>
            </div>
          )}

          {displayQr && !isConnected && (
            <div className="mb-6">
              <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm">
                <img src={displayQr} alt="QR Code WhatsApp" width={250} height={250} className="mx-auto" />
              </div>
              <div className="mt-4 text-sm text-gray-500 space-y-1">
                <p>1. Abra o WhatsApp no celular</p>
                <p>2. Toque em <strong>Dispositivos conectados</strong></p>
                <p>3. Toque em <strong>Conectar dispositivo</strong></p>
                <p>4. Aponte a câmera para o QR Code</p>
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
              {disconnectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              Desconectar
            </Button>
          ) : (
            <Button
              onClick={() => {
                silentConnect.current = false;
                connectStarted.current = true;
                connectMutation.mutate(!!displayQr);
              }}
              disabled={connectMutation.isPending || waUnavailable}
            >
              {connectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : displayQr ? (
                <RefreshCw className="w-4 h-4" />
              ) : (
                <QrCode className="w-4 h-4" />
              )}
              {displayQr ? "Novo QR Code" : "Gerar QR Code"}
            </Button>
          )}
        </div>
      </Card>

      {!isConnected && !hasQr && !waUnavailable && !isConnectPending && !waitingQr && (
        <Card className="mt-6 px-6 border-brand-100 bg-brand-50">
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
