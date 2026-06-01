"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ScheduledStatus } from "@/lib/api";
import { scheduledStatusApi } from "@/lib/api";
import { StatusMultiDayPicker } from "@/components/status/StatusMultiDayPicker";
import { dateDayKey } from "@flowdesk/firebase/client";

function defaultSchedule() {
  const d = new Date(Date.now() + 15 * 60_000);
  d.setSeconds(0, 0);
  return d;
}

type Props = {
  businessId: string;
  row: ScheduledStatus;
  onClose: () => void;
  onScheduled: () => void;
};

export function RepostStatusModal({ businessId, row, onClose, onScheduled }: Props) {
  const initial = useMemo(() => {
    const fromRow = new Date(row.scheduledAt);
    return Number.isFinite(fromRow.getTime()) && fromRow.getTime() > Date.now() + 60_000
      ? fromRow
      : defaultSchedule();
  }, [row.scheduledAt]);

  const [selectedDayKeys, setSelectedDayKeys] = useState<string[]>(() => [dateDayKey(initial)]);
  const [selectedHour, setSelectedHour] = useState(initial.getHours());
  const [selectedMinute, setSelectedMinute] = useState(initial.getMinutes());
  const mountedAt = useMemo(() => new Date(), []);

  const repostMutation = useMutation({
    mutationFn: () => {
      if (selectedDayKeys.length === 0) throw new Error("Selecione pelo menos um dia no calendário.");
      return scheduledStatusApi.repost(businessId, row.id, {
        scheduledDays: selectedDayKeys,
        hour: selectedHour,
        minute: selectedMinute,
      });
    },
    onSuccess: (rows) => {
      toast.success(
        rows.length > 1 ? `${rows.length} republicações agendadas!` : "Story reagendado!",
      );
      onScheduled();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao reagendar"),
  });

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
      onClick={() => !repostMutation.isPending && onClose()}
      role="presentation"
    >
      <Card
        className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="repost-status-title"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="repost-status-title" className="text-lg font-semibold text-gray-900">
              Reagendar story
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Mesma arte{row.caption ? " e legenda" : ""} nos dias que você marcar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={repostMutation.isPending}
            className="p-1 text-gray-400 hover:text-gray-700"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-3 mb-5 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
            {row.mediaType === "video" ? (
              <video src={row.mediaUrl} className="w-full h-full object-cover" muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.mediaUrl} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {row.caption && <p className="text-sm text-gray-800 line-clamp-2">{row.caption}</p>}
            <p className="text-xs text-gray-500 mt-1 capitalize">
              Original:{" "}
              {new Date(row.publishedAt ?? row.scheduledAt).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <StatusMultiDayPicker
            selectedDayKeys={selectedDayKeys}
            onSelectedDayKeysChange={setSelectedDayKeys}
            selectedHour={selectedHour}
            selectedMinute={selectedMinute}
            onHourChange={setSelectedHour}
            onMinuteChange={setSelectedMinute}
            mountedAt={mountedAt}
          />
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={repostMutation.isPending}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={repostMutation.isPending || selectedDayKeys.length === 0}
            onClick={() => repostMutation.mutate()}
          >
            {repostMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Agendar
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
