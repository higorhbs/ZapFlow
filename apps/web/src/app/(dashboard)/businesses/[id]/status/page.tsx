"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MINUTES = [0, 15, 30, 45];

const pad = (n: number) => String(n).padStart(2, "0");

function defaultSchedule(): Date {
  const d = new Date(Date.now() + 15 * 60_000);
  d.setSeconds(0, 0);
  const m = Math.ceil(d.getMinutes() / 15) * 15;
  if (m >= 60) {
    d.setHours(d.getHours() + 1, 0, 0, 0);
  } else {
    d.setMinutes(m, 0, 0);
  }
  return d;
}

export default function StatusSchedulePage() {
  const businessId = useBusinessId();
  const { ready, uid } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; startScrollTop: number } | null>(null);
  const didDragRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  const [selectedDate, setSelectedDate] = useState<Date>(() => defaultSchedule());
  const [selectedHour, setSelectedHour] = useState<number>(() => defaultSchedule().getHours());
  const [selectedMinute, setSelectedMinute] = useState<number>(() => defaultSchedule().getMinutes());
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>(() => {
    const d = defaultSchedule();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Snapshot of "now" at mount — used for past-time disabling
  const mountedAt = useMemo(() => new Date(), []);

  // Scroll hour column to center the initially selected hour
  useEffect(() => {
    if (!hourRef.current) return;
    hourRef.current.scrollTop = selectedHour * 40;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      const dateStr = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}T${pad(selectedHour)}:${pad(selectedMinute)}`;
      const scheduledAt = new Date(dateStr).toISOString();
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
      const next = defaultSchedule();
      setSelectedDate(next);
      setSelectedHour(next.getHours());
      setSelectedMinute(next.getMinutes());
      setViewMonth({ year: next.getFullYear(), month: next.getMonth() });
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
  const history = useMemo(() => items.filter((i) => i.status !== "scheduled"), [items]);

  function onPickFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    if (!f) { setPreview(null); return; }
    setPreview(URL.createObjectURL(f));
  }

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isSelectedToday = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }, [selectedDate, today]);

  function handleDateSelect(date: Date) {
    setSelectedDate(date);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) {
      const nowH = mountedAt.getHours();
      const nowM = mountedAt.getMinutes();
      if (selectedHour < nowH || (selectedHour === nowH && selectedMinute < nowM)) {
        const m15 = Math.ceil(nowM / 15) * 15;
        if (m15 >= 60) {
          setSelectedHour(Math.min(nowH + 1, 23));
          setSelectedMinute(0);
        } else {
          setSelectedHour(nowH);
          setSelectedMinute(m15);
        }
      }
    }
  }

  const summary = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    const t = `${pad(selectedHour)}:${pad(selectedMinute)}`;
    if (diff === 0) return `Hoje às ${t}`;
    if (diff === 1) return `Amanhã às ${t}`;
    return `${format(selectedDate, "EEE, dd 'de' MMMM", { locale: ptBR })} às ${t}`;
  }, [selectedDate, selectedHour, selectedMinute, today]);

  function onHourPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    didDragRef.current = false;
    dragState.current = { startY: e.clientY, startScrollTop: hourRef.current?.scrollTop ?? 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onHourPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current || !hourRef.current) return;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dy) > 4) didDragRef.current = true;
    hourRef.current.scrollTop = dragState.current.startScrollTop - dy;
  }

  function onHourPointerUp() {
    if (!dragState.current || !hourRef.current) return;
    dragState.current = null;
    if (!didDragRef.current) return;
    const nearest = Math.max(0, Math.min(23, Math.round(hourRef.current.scrollTop / 40)));
    setSelectedHour(nearest);
    hourRef.current.scrollTo({ top: nearest * 40, behavior: "smooth" });
  }

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewMonth.year, viewMonth.month, 1);
    const startDow = firstDay.getDay();
    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewMonth.year, viewMonth.month, d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth]);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-brand-500 to-teal-500 p-6 mb-8 shadow-lg">
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <CircleDot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Stories do WhatsApp</h1>
            <p className="text-white/75 text-sm mt-0.5">
              Agende imagens e vídeos para publicar no status do WhatsApp
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

      {/* Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-8 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-5">Novo agendamento</h2>
        <div className="space-y-5">

          {/* File picker */}
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

          {/* Caption */}
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

          {/* Date/Time picker */}
          <div>
            <Label className="block mb-3">Publicar em</Label>

            {/* Summary pill */}
            <div className="flex items-center gap-2.5 mb-4 px-4 py-2.5 rounded-xl bg-brand-50 border border-brand-100">
              <CalendarClock className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-brand-800 capitalize">{summary}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* Calendar */}
              <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40">
                {/* Month nav */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() =>
                      setViewMonth((v) =>
                        v.month === 0
                          ? { year: v.year - 1, month: 11 }
                          : { year: v.year, month: v.month - 1 }
                      )
                    }
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-500" />
                  </button>
                  <span className="text-sm font-semibold text-gray-800">
                    {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setViewMonth((v) =>
                        v.month === 11
                          ? { year: v.year + 1, month: 0 }
                          : { year: v.year, month: v.month + 1 }
                      )
                    }
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-1">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                    <div key={i} className="text-center text-[11px] text-gray-400 font-medium py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {calendarCells.map((date, i) => {
                    if (!date) return <div key={i} />;
                    const isPast = date < today;
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    const isTodayCell = date.toDateString() === today.toDateString();
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={isPast}
                        onClick={() => handleDateSelect(date)}
                        className={cn(
                          "aspect-square text-xs rounded-lg flex items-center justify-center transition-all font-medium",
                          isPast && "text-gray-300 cursor-not-allowed",
                          !isPast && !isSelected && "text-gray-700 hover:bg-brand-100 hover:text-brand-800",
                          isTodayCell && !isSelected && "text-brand-600 font-bold ring-1 ring-brand-300",
                          isSelected && "bg-brand-600 text-white shadow-md scale-105",
                        )}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time picker */}
              <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40 flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Horário</span>
                </div>

                <div className="grid grid-cols-2 gap-3">

                  {/* Hours — scrollable column */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-center text-[11px] text-gray-400 font-medium tracking-wide">Hora</p>
                    <div className="relative">
                      {/* Fade top */}
                      <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none z-10 rounded-t-xl" />
                      {/* Fade bottom */}
                      <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none z-10 rounded-b-xl" />
                      {/* Highlight band */}
                      <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-10 bg-brand-50/60 border-y border-brand-100 pointer-events-none z-0" />
                      <div
                        ref={hourRef}
                        className="h-40 overflow-y-auto [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing select-none"
                        style={{ scrollbarWidth: "none" }}
                        onPointerDown={onHourPointerDown}
                        onPointerMove={onHourPointerMove}
                        onPointerUp={onHourPointerUp}
                        onPointerCancel={onHourPointerUp}
                      >
                        {/* Top spacer so first item can center */}
                        <div className="h-[60px]" />
                        {Array.from({ length: 24 }, (_, h) => {
                          const isDisabled = isSelectedToday && h < mountedAt.getHours();
                          const isSelected = h === selectedHour;
                          return (
                            <button
                              key={h}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => {
                                if (didDragRef.current) return;
                                setSelectedHour(h);
                                hourRef.current?.scrollTo({ top: h * 40, behavior: "smooth" });
                              }}
                              className={cn(
                                "relative z-10 w-full h-10 flex items-center justify-center text-sm rounded-xl transition-all font-semibold",
                                isDisabled && "text-gray-200 cursor-not-allowed",
                                !isDisabled && !isSelected && "text-gray-400 hover:text-gray-700",
                                isSelected && "text-brand-700 text-base",
                              )}
                            >
                              {pad(h)}
                            </button>
                          );
                        })}
                        {/* Bottom spacer */}
                        <div className="h-[60px]" />
                      </div>
                    </div>
                  </div>

                  {/* Minutes — tall buttons filling same height */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-center text-[11px] text-gray-400 font-medium tracking-wide">Minuto</p>
                    <div className="flex flex-col gap-2 h-40">
                      {MINUTES.map((m) => {
                        const isDisabled =
                          isSelectedToday &&
                          selectedHour === mountedAt.getHours() &&
                          m < mountedAt.getMinutes();
                        const isSelected = m === selectedMinute;
                        return (
                          <button
                            key={m}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => setSelectedMinute(m)}
                            className={cn(
                              "flex-1 flex items-center justify-center rounded-xl text-sm font-semibold transition-all",
                              isDisabled && "text-gray-200 cursor-not-allowed",
                              !isDisabled && !isSelected && "bg-white text-gray-500 border border-gray-100 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200",
                              isSelected && "bg-brand-600 text-white shadow-sm",
                            )}
                          >
                            :{pad(m)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            O status será visível para contatos que já conversaram com você no FlowDesk. Mantenha o
            agente WhatsApp online no horário agendado.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
            Para conferir a arte: use &quot;Abrir prévia da arte&quot; no histórico após publicar,
            ou no celular abra a aba <strong className="font-medium text-gray-700">Atualizações</strong>{" "}
            (não só o círculo do perfil). Às vezes o app mostra &quot;aguardando atualização&quot; por
            alguns minutos mesmo com o status no ar — isso é normal ao publicar pela API.
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

      {/* Pending queue */}
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
        {row.status === "published" && row.mediaUrl && (
          <a
            href={row.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-600 hover:underline mt-1 inline-block"
          >
            Abrir prévia da arte
          </a>
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
