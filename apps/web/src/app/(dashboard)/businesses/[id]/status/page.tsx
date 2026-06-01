"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { scheduledStatusApi, type ScheduledStatus } from "@/lib/api";
import { useBusinessId } from "@/lib/use-business-id";
import { useAuth } from "@/contexts/auth-context";
import { useSyncWhatsAppBusiness } from "@/lib/use-sync-wa-business";
import { toast } from "sonner";
import {
  CircleDot,
  Upload,
  Loader2,
  CalendarClock,
  Trash2,
  AlertTriangle,
  ImageIcon,
  Video,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { panelHref } from "@/lib/business-nav";

const STATUS_LABEL: Record<ScheduledStatus["status"], string> = {
  scheduled: "Agendado",
  publishing: "Publicando…",
  published: "Publicado",
  failed: "Falhou",
  cancelled: "Cancelado",
};

function defaultScheduleLocal() {
  const d = new Date(Date.now() + 15 * 60_000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function StatusSchedulePage() {
  const businessId = useBusinessId();
  const { ready, uid } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState(defaultScheduleLocal);

  const { connected } = useSyncWhatsAppBusiness(businessId);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["scheduled-status", businessId, uid],
    queryFn: () => scheduledStatusApi.list(businessId),
    enabled: ready && !!uid && !!businessId,
    refetchInterval: 20_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione uma imagem ou vídeo.");
      const { mediaUrl, mediaType } = await scheduledStatusApi.upload(businessId, file);
      const scheduledAt = new Date(scheduledLocal).toISOString();
      return scheduledStatusApi.create(businessId, {
        mediaUrl,
        mediaType,
        caption: caption.trim() || undefined,
        scheduledAt,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduled-status", businessId] });
      setFile(null);
      setPreview(null);
      setCaption("");
      setScheduledLocal(defaultScheduleLocal());
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Status agendado!");
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao agendar"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => scheduledStatusApi.cancel(businessId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduled-status", businessId] });
      toast.success("Agendamento cancelado");
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao cancelar"),
  });

  const pending = useMemo(() => items.filter((i) => i.status === "scheduled"), [items]);
  const history = useMemo(
    () => items.filter((i) => i.status !== "scheduled"),
    [items]
  );

  function onPickFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    if (!f) {
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(f));
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-brand-500 to-teal-500 p-6 mb-8 shadow-lg">
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <CircleDot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Status do WhatsApp</h1>
            <p className="text-white/75 text-sm mt-0.5">
              Envie arte ou vídeo no status na hora que escolher
            </p>
          </div>
        </div>
      </div>

      {!connected && (
        <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">WhatsApp precisa estar conectado na hora da publicação.</p>
            <Link
              href={panelHref(businessId, "whatsapp")}
              className="text-brand-700 underline mt-1 inline-block"
            >
              Ir para conexão WhatsApp
            </Link>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-8 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Novo agendamento</h2>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Arte (imagem ou vídeo MP4)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
            >
              {preview ? (
                file?.type.startsWith("video/") ? (
                  <video src={preview} className="max-h-48 rounded-lg" controls />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="max-h-48 rounded-lg object-contain" />
                )
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600">Toque para escolher arquivo</span>
                </>
              )}
            </button>
          </div>

          <div>
            <Label htmlFor="caption">Legenda (opcional)</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={700}
              rows={2}
              className="mt-1.5"
              placeholder="Texto que aparece no status"
            />
          </div>

          <div>
            <Label htmlFor="when">Publicar em</Label>
            <Input
              id="when"
              type="datetime-local"
              value={scheduledLocal}
              onChange={(e) => setScheduledLocal(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <p className="text-xs text-gray-500">
            O status será visível para contatos que já conversaram com você no FlowDesk. Mantenha o
            agente WhatsApp online no horário agendado.
          </p>

          <Button
            className="w-full"
            disabled={!file || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CalendarClock className="w-4 h-4 mr-2" />
            )}
            Agendar publicação
          </Button>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="font-semibold text-gray-900 mb-3">Na fila ({pending.length})</h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center rounded-xl bg-gray-50">
            Nenhum status agendado.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((row) => (
              <StatusRow
                key={row.id}
                row={row}
                onCancel={() => cancelMutation.mutate(row.id)}
                cancelling={cancelMutation.isPending}
              />
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 mb-3">Histórico</h2>
          <ul className="space-y-3">
            {history.map((row) => (
              <StatusRow key={row.id} row={row} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatusRow({
  row,
  onCancel,
  cancelling,
}: {
  row: ScheduledStatus;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const when = format(new Date(row.scheduledAt), "dd/MM/yyyy HH:mm", { locale: ptBR });
  const isVideo = row.mediaType === "video";

  return (
    <li className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {row.mediaUrl && !isVideo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.mediaUrl} alt="" className="w-full h-full object-cover" />
        ) : isVideo ? (
          <Video className="w-6 h-6 text-gray-500" />
        ) : (
          <ImageIcon className="w-6 h-6 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={row.status} />
          <span className="text-xs text-gray-500">{when}</span>
        </div>
        {row.caption && (
          <p className="text-sm text-gray-700 mt-1 truncate">{row.caption}</p>
        )}
        {row.error && (
          <p className="text-xs text-red-600 mt-1">{row.error}</p>
        )}
      </div>
      {onCancel && row.status === "scheduled" && (
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 text-gray-400 hover:text-red-600"
          disabled={cancelling}
          onClick={onCancel}
          aria-label="Cancelar"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: ScheduledStatus["status"] }) {
  const styles: Record<ScheduledStatus["status"], string> = {
    scheduled: "bg-blue-50 text-blue-700",
    publishing: "bg-amber-50 text-amber-700",
    published: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
  };
  const Icon =
    status === "published"
      ? CheckCircle2
      : status === "failed"
        ? XCircle
        : CircleDot;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
        styles[status]
      )}
    >
      <Icon className="w-3 h-3" />
      {STATUS_LABEL[status]}
    </span>
  );
}
