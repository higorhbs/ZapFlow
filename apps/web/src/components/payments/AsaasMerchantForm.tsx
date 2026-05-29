"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { asaasApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, CheckCircle2, Trash2, Wallet, Link2 } from "lucide-react";
import { AsaasSetupGuide } from "./AsaasSetupGuide";

type AsaasStatus = {
  configured: boolean;
  sandbox: boolean;
  keyPreview: string | null;
  webhookTokenConfigured: boolean;
  webhookUrl: string;
  balanceBrl: number | null;
  accountStatus?: string | null;
};

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="xs"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        toast.success("Copiado!");
        setTimeout(() => setDone(false), 2000);
      }}
    >
      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      Copiar
    </Button>
  );
}

export function AsaasMerchantForm({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [sandbox, setSandbox] = useState(true);

  const { data: asaas, isLoading } = useQuery({
    queryKey: ["asaas", businessId],
    queryFn: () => asaasApi.get(businessId) as Promise<AsaasStatus>,
    enabled: !!businessId,
  });

  useEffect(() => {
    if (asaas) setSandbox(asaas.sandbox);
  }, [asaas]);

  const save = useMutation({
    mutationFn: () =>
      asaasApi.save(businessId, {
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        sandbox,
        ...(webhookToken.trim() ? { webhookToken: webhookToken.trim() } : {}),
      }),
    onSuccess: () => {
      toast.success("Integração Asaas salva!");
      setApiKey("");
      setWebhookToken("");
      queryClient.invalidateQueries({ queryKey: ["asaas", businessId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSave =
    (!asaas?.configured && apiKey.trim().length >= 20) ||
    (asaas?.configured && apiKey.trim().length >= 20) ||
    (asaas?.configured && webhookToken.trim().length >= 8);

  const remove = useMutation({
    mutationFn: () => asaasApi.remove(businessId),
    onSuccess: () => {
      toast.success("Integração removida");
      queryClient.invalidateQueries({ queryKey: ["asaas", businessId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AsaasSetupGuide />

      {asaas?.configured && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-xs text-emerald-800 font-medium mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Conta conectada
            </p>
            <p className="text-sm text-gray-700">
              Chave {asaas.keyPreview} · {asaas.sandbox ? "Sandbox" : "Produção"}
            </p>
            {asaas.webhookTokenConfigured && (
              <p className="text-xs text-gray-500 mt-1">Webhook com token configurado</p>
            )}
          </div>
          {asaas.balanceBrl != null && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> Saldo na Asaas
              </p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(asaas.balanceBrl)}</p>
            </div>
          )}
        </div>
      )}

      <div className="card space-y-5">
        <p className="font-semibold text-gray-900 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-brand-600" />
          Dados de pagamento do seu negócio
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="asaas-key">Chave API Asaas *</Label>
            <Input
              id="asaas-key"
              type="password"
              autoComplete="off"
              placeholder={asaas?.configured ? "Deixe em branco para manter a atual" : "$aact_..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Integrações → API no painel Asaas</p>
          </div>

          <div>
            <Label>Ambiente</Label>
            <div className="mt-2 flex gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="asaas-env"
                  checked={sandbox}
                  onChange={() => setSandbox(true)}
                  className="text-brand-600"
                />
                Sandbox (testes)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="asaas-env"
                  checked={!sandbox}
                  onChange={() => setSandbox(false)}
                  className="text-brand-600"
                />
                Produção (PIX real)
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="asaas-webhook-token">Token do webhook (recomendado)</Label>
            <Input
              id="asaas-webhook-token"
              type="password"
              autoComplete="off"
              placeholder={asaas?.webhookTokenConfigured ? "Novo token (opcional)" : "Mesmo token definido no Asaas"}
              value={webhookToken}
              onChange={(e) => setWebhookToken(e.target.value)}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ao criar o webhook no Asaas, defina um token e cole aqui para validar notificações.
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-2">
            <Label className="text-xs text-gray-600">URL do webhook (cole no Asaas)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-[11px] break-all flex-1 text-gray-800">{asaas?.webhookUrl ?? "—"}</code>
              {asaas?.webhookUrl && <CopyButton text={asaas.webhookUrl} />}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || !canSave}
          >
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar integração"}
          </Button>
          {asaas?.configured && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              {remove.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Desconectar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
