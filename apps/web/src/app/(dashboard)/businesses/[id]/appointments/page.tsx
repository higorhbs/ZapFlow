"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appointmentApi } from "@/lib/api";
import { STATUS_LABELS, cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-orange-100 border-orange-200 text-orange-800",
  CONFIRMED: "bg-green-100 border-green-200 text-green-800",
  CANCELLED: "bg-red-100 border-red-200 text-red-700",
  COMPLETED: "bg-purple-100 border-purple-200 text-purple-800",
  NO_SHOW: "bg-red-50 border-red-100 text-red-600",
};

export default function AppointmentsPage({ params }: { params: { id: string } }) {
  const { id: businessId } = params;
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

  const patchMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentApi.patch(businessId, id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", businessId] });
      toast.success("Agendamento atualizado");
    },
  });

  function appointmentsForDay(day: Date) {
    return appointments.filter((a: any) => isSameDay(new Date(a.scheduledAt), day));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-gray-500 mt-1">Gerencie os horários marcados pelo WhatsApp</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {format(weekStart, "d MMM", { locale: ptBR })} — {format(weekEnd, "d MMM yyyy", { locale: ptBR })}
          </span>
          <button className="btn-secondary" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button className="btn-secondary text-xs" onClick={() => setWeekOffset(0)}>Hoje</button>
        </div>
      </div>

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
                  {dayAppointments.map((apt: any) => (
                    <div
                      key={apt.id}
                      className={cn("border rounded-lg p-2 text-xs cursor-pointer hover:opacity-90 transition-opacity", STATUS_COLORS[apt.status] ?? "bg-gray-100")}
                    >
                      <p className="font-medium truncate">{apt.customerName ?? apt.customerPhone}</p>
                      <p className="opacity-75">{format(new Date(apt.scheduledAt), "HH:mm")}</p>
                      <p className="truncate opacity-75">{apt.serviceName}</p>
                      <select
                        className="mt-1 w-full text-xs bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
                        value={apt.status}
                        onChange={(e) => patchMutation.mutate({ id: apt.id, status: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]?.label}</option>
                        ))}
                      </select>
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
