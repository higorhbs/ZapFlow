"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appointmentApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusinessId } from "@/lib/use-business-id";
import { useBusinessVocabulary } from "@/lib/use-business-vocabulary";
import { getBookingStatusLabel } from "@zapflow/shared";
import { toast } from "sonner";
import { VocabLabel } from "@/components/layout/VocabLabel";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-orange-100 border-orange-300 text-orange-900",
  CONFIRMED: "bg-green-100 border-green-200 text-green-800",
  CANCELLED: "bg-red-100 border-red-200 text-red-700",
  COMPLETED: "bg-purple-100 border-purple-200 text-purple-800",
  NO_SHOW: "bg-red-50 border-red-100 text-red-600",
};

type Apt = {
  id: string;
  customerName?: string;
  customerPhone: string;
  serviceName: string;
  scheduledAt: string;
  status: string;
};

export default function AppointmentsPage() {
  const businessId = useBusinessId();
  const v = useBusinessVocabulary();
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", businessId, weekOffset],
    queryFn: () =>
      appointmentApi.list(businessId, {
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
      }),
  });

  const { data: allPending = [] } = useQuery({
    queryKey: ["appointments-pending", businessId],
    queryFn: () => appointmentApi.list(businessId, { status: "PENDING" }),
    enabled: v.bookingRequiresApproval,
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentApi.patch(businessId, id, { status }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["appointments", businessId] });
      queryClient.invalidateQueries({ queryKey: ["appointments-pending", businessId] });
      if (vars.status === "CONFIRMED") toast.success(v.bookingStatusConfirmed);
      else if (vars.status === "CANCELLED") toast.success("Recusado");
      else toast.success(`${v.bookingSingular} atualizado`);
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const pending = v.bookingRequiresApproval
    ? (allPending as Apt[])
    : (appointments as Apt[]).filter((a) => a.status === "PENDING");
  const bizType = v.businessType;

  function appointmentsForDay(day: Date) {
    return (appointments as Apt[]).filter((a) => isSameDay(new Date(a.scheduledAt), day));
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            <VocabLabel ready={v.vocabReady} width="8rem" block>
              {v.bookingsPageTitle}
            </VocabLabel>
          </h1>
          <p className="text-gray-500 mt-1">
            {v.vocabReady ? (
              <>Gerencie os {v.bookingsPlural.toLowerCase()} feitos pelo WhatsApp</>
            ) : (
              <VocabLabel ready={false} width="18rem" block />
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-gray-700">
            {format(weekStart, "d MMM", { locale: ptBR })} — {format(weekEnd, "d MMM yyyy", { locale: ptBR })}
          </span>
          <Button type="button" variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button type="button" variant="outline" size="xs" onClick={() => setWeekOffset(0)}>Hoje</Button>
        </div>
      </div>

      {v.bookingRequiresApproval && pending.length > 0 && (
        <div className="mb-8 rounded-2xl border-2 border-orange-200 bg-orange-50/80 p-4 md:p-5">
          <h2 className="text-sm font-semibold text-orange-900 mb-3">{v.bookingPendingSectionTitle}</h2>
          <div className="space-y-3">
            {pending.map((apt) => {
              const when = new Date(apt.scheduledAt);
              return (
                <div
                  key={apt.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-white border border-orange-200 p-4 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{apt.customerName ?? apt.customerPhone}</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {format(when, "dd/MM/yyyy", { locale: ptBR })} às {format(when, "HH:mm")} · {apt.serviceName}
                    </p>
                    <span className="inline-block mt-2 text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                      {getBookingStatusLabel(bizType, apt.status)}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 bg-green-600 hover:bg-green-700"
                      disabled={patchMutation.isPending}
                      onClick={() => patchMutation.mutate({ id: apt.id, status: "CONFIRMED" })}
                    >
                      <Check className="w-4 h-4" />
                      {v.bookingAcceptLabel}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-red-700 border-red-200 hover:bg-red-50"
                      disabled={patchMutation.isPending}
                      onClick={() => patchMutation.mutate({ id: apt.id, status: "CANCELLED" })}
                    >
                      <X className="w-4 h-4" />
                      {v.bookingRejectLabel}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {days.map((day) => {
            const dayAppointments = appointmentsForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className="min-h-[200px]">
                <div className={cn("text-center mb-2 py-2 rounded-lg", isToday ? "bg-brand-600 text-white" : "")}>
                  <p className={cn("text-xs font-medium", isToday ? "text-brand-100" : "text-gray-400")}>
                    {format(day, "EEE", { locale: ptBR }).toUpperCase()}
                  </p>
                  <p className={cn("text-lg font-bold", isToday ? "text-white" : "text-gray-900")}>
                    {format(day, "d")}
                  </p>
                </div>

                <div className="space-y-1.5">
                  {dayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className={cn("border rounded-lg p-2 text-xs", STATUS_COLORS[apt.status] ?? "bg-gray-100")}
                    >
                      <p className="font-medium truncate">{apt.customerName ?? apt.customerPhone}</p>
                      <p className="opacity-75">{format(new Date(apt.scheduledAt), "HH:mm")}</p>
                      <p className="truncate opacity-75">{apt.serviceName}</p>
                      <p className="mt-1 font-medium opacity-90">{getBookingStatusLabel(bizType, apt.status)}</p>
                      {v.bookingRequiresApproval && apt.status === "PENDING" && (
                        <div className="flex gap-1 mt-2">
                          <button
                            type="button"
                            className="flex-1 rounded-md bg-green-600 text-white py-1 text-[10px] font-semibold hover:bg-green-700 disabled:opacity-50"
                            disabled={patchMutation.isPending}
                            onClick={() => patchMutation.mutate({ id: apt.id, status: "CONFIRMED" })}
                          >
                            Aceitar
                          </button>
                          <button
                            type="button"
                            className="flex-1 rounded-md border border-red-300 text-red-700 py-1 text-[10px] font-semibold hover:bg-red-50 disabled:opacity-50"
                            disabled={patchMutation.isPending}
                            onClick={() => patchMutation.mutate({ id: apt.id, status: "CANCELLED" })}
                          >
                            Recusar
                          </button>
                        </div>
                      )}
                      {apt.status !== "PENDING" && (
                        <select
                          className="mt-1 w-full text-xs bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
                          value={apt.status}
                          onChange={(e) => patchMutation.mutate({ id: apt.id, status: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => (
                            <option key={s} value={s}>{getBookingStatusLabel(bizType, s)}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}

                  {dayAppointments.length === 0 && (
                    <div className="text-center py-4 text-gray-300 text-xs">
                      <Calendar className="w-4 h-4 mx-auto mb-1 opacity-50" />
                      Livre
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
