"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  MAX_SCHEDULE_DAYS,
  dateDayKey,
  parseDayKey,
} from "@flowdesk/firebase/client";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const pad = (n: number) => String(n).padStart(2, "0");

type Props = {
  selectedDayKeys: string[];
  onSelectedDayKeysChange: (keys: string[]) => void;
  selectedHour: number;
  selectedMinute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  mountedAt?: Date;
};

export function StatusMultiDayPicker({
  selectedDayKeys,
  onSelectedDayKeysChange,
  selectedHour,
  selectedMinute,
  onHourChange,
  onMinuteChange,
  mountedAt: mountedAtProp,
}: Props) {
  const fallbackMounted = useMemo(() => new Date(), []);
  const mountedAt = mountedAtProp ?? fallbackMounted;
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; startScrollTop: number } | null>(null);
  const didDragRef = useRef(false);
  const minuteDragState = useRef<{ startY: number; startScrollTop: number } | null>(null);
  const minuteDidDragRef = useRef(false);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const calendarDragRef = useRef<{
    mode: "select" | "deselect";
    snapshot: string[];
    visited: Set<string>;
    moved: boolean;
    startDate: Date;
    startKey: string;
    lastKey: string;
  } | null>(null);
  const maxDaysToastRef = useRef(false);
  const [dragVisited, setDragVisited] = useState<string[]>([]);

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    if (hourRef.current) hourRef.current.scrollTop = selectedHour * 40;
    if (minuteRef.current) minuteRef.current.scrollTop = selectedMinute * 40;
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const hasTodaySelected = useMemo(
    () =>
      selectedDayKeys.some((key) => {
        const d = parseDayKey(key);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      }),
    [selectedDayKeys, today]
  );

  const summary = useMemo(() => {
    const t = `${pad(selectedHour)}:${pad(selectedMinute)}`;
    const n = selectedDayKeys.length;
    if (n === 0) return `Selecione os dias · ${t}`;
    if (n === 1) {
      const d = parseDayKey(selectedDayKeys[0]!);
      const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
      if (diff === 0) return `Hoje às ${t}`;
      if (diff === 1) return `Amanhã às ${t}`;
      return `${format(d, "EEE, dd 'de' MMM", { locale: ptBR })} às ${t}`;
    }
    return `${n} dias às ${t}`;
  }, [selectedDayKeys, selectedHour, selectedMinute, today]);

  const selectedPreview = useMemo(() => {
    if (selectedDayKeys.length <= 1) return null;
    return [...selectedDayKeys]
      .sort()
      .slice(0, 4)
      .map((key) => format(parseDayKey(key), "dd/MM (EEE)", { locale: ptBR }));
  }, [selectedDayKeys]);

  function fixTodayTimeIfNeeded(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() !== today.getTime()) return;
    const nowH = mountedAt.getHours();
    const nowM = mountedAt.getMinutes();
    if (selectedHour < nowH || (selectedHour === nowH && selectedMinute < nowM)) {
      const newM = nowM + 1 >= 60 ? 0 : nowM + 1;
      const newH = nowM + 1 >= 60 ? Math.min(nowH + 1, 23) : nowH;
      onHourChange(newH);
      onMinuteChange(newM);
      hourRef.current?.scrollTo({ top: newH * 40, behavior: "smooth" });
      minuteRef.current?.scrollTo({ top: newM * 40, behavior: "smooth" });
    }
  }

  function toggleDay(date: Date) {
    const key = dateDayKey(date);
    if (selectedDayKeys.includes(key)) {
      onSelectedDayKeysChange(selectedDayKeys.filter((k) => k !== key));
      return;
    }
    if (selectedDayKeys.length >= MAX_SCHEDULE_DAYS) {
      toast.error(`Máximo ${MAX_SCHEDULE_DAYS} dias por vez.`);
      return;
    }
    onSelectedDayKeysChange([...selectedDayKeys, key].sort());
    fixTodayTimeIfNeeded(date);
  }

  function syncCalendarDragSelection() {
    const drag = calendarDragRef.current;
    if (!drag) return;
    const next = new Set(drag.snapshot);
    for (const key of drag.visited) {
      if (drag.mode === "select") next.add(key);
      else next.delete(key);
    }
    const arr = [...next].sort();
    if (arr.length > MAX_SCHEDULE_DAYS) {
      if (!maxDaysToastRef.current) {
        maxDaysToastRef.current = true;
        toast.error(`Máximo ${MAX_SCHEDULE_DAYS} dias por vez.`);
      }
      onSelectedDayKeysChange(arr.slice(0, MAX_SCHEDULE_DAYS));
      return;
    }
    maxDaysToastRef.current = false;
    onSelectedDayKeysChange(arr);
    setDragVisited([...drag.visited]);
    if (drag.mode === "select") {
      for (const key of drag.visited) {
        if (parseDayKey(key).toDateString() === today.toDateString()) {
          fixTodayTimeIfNeeded(today);
          break;
        }
      }
    }
  }

  function addDayRangeToVisited(visited: Set<string>, fromKey: string, toKey: string) {
    const a = parseDayKey(fromKey);
    const b = parseDayKey(toKey);
    const lo = a.getTime() <= b.getTime() ? a : b;
    const hi = a.getTime() <= b.getTime() ? b : a;
    const cur = new Date(lo);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(hi);
    end.setHours(0, 0, 0, 0);
    while (cur.getTime() <= end.getTime()) {
      if (cur >= today) visited.add(dateDayKey(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }

  function dayKeyFromPointer(e: React.PointerEvent): string | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const btn = el?.closest<HTMLElement>("[data-day-key]");
    const key = btn?.dataset.dayKey;
    if (!key) return null;
    const d = parseDayKey(key);
    d.setHours(0, 0, 0, 0);
    if (d < today) return null;
    return key;
  }

  function onCalendarGridPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const key = dayKeyFromPointer(e);
    if (!key) return;
    const date = parseDayKey(key);
    e.preventDefault();
    calendarDragRef.current = {
      mode: selectedDayKeys.includes(key) ? "deselect" : "select",
      snapshot: [...selectedDayKeys],
      visited: new Set([key]),
      moved: false,
      startDate: date,
      startKey: key,
      lastKey: key,
    };
    setDragVisited([key]);
    calendarGridRef.current?.setPointerCapture(e.pointerId);
  }

  function onCalendarGridPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = calendarDragRef.current;
    if (!drag) return;
    const key = dayKeyFromPointer(e);
    if (!key || key === drag.lastKey) return;
    addDayRangeToVisited(drag.visited, drag.lastKey, key);
    drag.lastKey = key;
    drag.moved = true;
    syncCalendarDragSelection();
  }

  function onCalendarGridPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const drag = calendarDragRef.current;
    if (!drag) return;
    try {
      calendarGridRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!drag.moved) toggleDay(drag.startDate);
    else syncCalendarDragSelection();
    calendarDragRef.current = null;
    setDragVisited([]);
    maxDaysToastRef.current = false;
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
    onHourChange(nearest);
    hourRef.current.scrollTo({ top: nearest * 40, behavior: "smooth" });
  }

  function onMinutePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    minuteDidDragRef.current = false;
    minuteDragState.current = { startY: e.clientY, startScrollTop: minuteRef.current?.scrollTop ?? 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onMinutePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!minuteDragState.current || !minuteRef.current) return;
    const dy = e.clientY - minuteDragState.current.startY;
    if (Math.abs(dy) > 4) minuteDidDragRef.current = true;
    minuteRef.current.scrollTop = minuteDragState.current.startScrollTop - dy;
  }

  function onMinutePointerUp() {
    if (!minuteDragState.current || !minuteRef.current) return;
    minuteDragState.current = null;
    if (!minuteDidDragRef.current) return;
    const nearest = Math.max(0, Math.min(59, Math.round(minuteRef.current.scrollTop / 40)));
    onMinuteChange(nearest);
    minuteRef.current.scrollTo({ top: nearest * 40, behavior: "smooth" });
  }

  return (
    <div>
      <Label className="block mb-1">Dias e horário</Label>
      <p className="text-xs text-gray-500 mb-3">
        Clique ou arraste no calendário para marcar vários dias. O mesmo horário vale para todos.
      </p>

      <div className="flex items-center gap-2.5 mb-4 px-4 py-2.5 rounded-xl bg-brand-50 border border-brand-100">
        <CalendarClock className="w-4 h-4 text-brand-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-brand-800 capitalize">{summary}</span>
      </div>

      {selectedPreview && (
        <p className="text-xs text-gray-600 mb-3 capitalize">
          {selectedPreview.join(" · ")}
          {selectedDayKeys.length > 4 ? ` · +${selectedDayKeys.length - 4}` : ""}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() =>
                setViewMonth((v) =>
                  v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }
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
                  v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }
                )
              }
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <div key={i} className="text-center text-[11px] text-gray-400 font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          <div
            ref={calendarGridRef}
            className="grid grid-cols-7 gap-0.5 select-none touch-none"
            onPointerDownCapture={onCalendarGridPointerDown}
            onPointerMove={onCalendarGridPointerMove}
            onPointerUp={onCalendarGridPointerUp}
            onPointerCancel={onCalendarGridPointerUp}
          >
            {calendarCells.map((date, i) => {
              if (!date) return <div key={i} />;
              const key = dateDayKey(date);
              const isPast = date < today;
              const isMarked = selectedDayKeys.includes(key);
              const isDragPaint = dragVisited.includes(key);
              const isTodayCell = date.toDateString() === today.toDateString();
              return (
                <button
                  key={i}
                  type="button"
                  data-day-key={key}
                  disabled={isPast}
                  tabIndex={-1}
                  className={cn(
                    "aspect-square text-xs rounded-lg flex items-center justify-center transition-colors font-medium",
                    isPast && "text-gray-300 cursor-not-allowed",
                    !isPast && !isMarked && !isDragPaint && "text-gray-700 hover:bg-brand-100 hover:text-brand-800 cursor-cell",
                    isTodayCell && !isMarked && !isDragPaint && "text-brand-600 font-bold ring-1 ring-brand-300",
                    (isMarked || (isDragPaint && calendarDragRef.current?.mode === "select")) &&
                      "bg-brand-600 text-white shadow-md scale-105",
                    isDragPaint &&
                      calendarDragRef.current?.mode === "deselect" &&
                      !isMarked &&
                      "bg-brand-100 text-brand-800 ring-2 ring-brand-400",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40 flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Horário</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-center text-[11px] text-gray-400 font-medium tracking-wide">Hora</p>
              <div className="relative">
                <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none z-10 rounded-t-xl" />
                <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none z-10 rounded-b-xl" />
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
                  <div className="h-[60px]" />
                  {Array.from({ length: 24 }, (_, h) => {
                    const isDisabled = hasTodaySelected && h < mountedAt.getHours();
                    const isSelected = h === selectedHour;
                    return (
                      <button
                        key={h}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (didDragRef.current) return;
                          onHourChange(h);
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
                  <div className="h-[60px]" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-center text-[11px] text-gray-400 font-medium tracking-wide">Minuto</p>
              <div className="relative">
                <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none z-10 rounded-t-xl" />
                <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none z-10 rounded-b-xl" />
                <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-10 bg-brand-50/60 border-y border-brand-100 pointer-events-none z-0" />
                <div
                  ref={minuteRef}
                  className="h-40 overflow-y-auto [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing select-none"
                  style={{ scrollbarWidth: "none" }}
                  onPointerDown={onMinutePointerDown}
                  onPointerMove={onMinutePointerMove}
                  onPointerUp={onMinutePointerUp}
                  onPointerCancel={onMinutePointerUp}
                >
                  <div className="h-[60px]" />
                  {Array.from({ length: 60 }, (_, m) => {
                    const isDisabled =
                      hasTodaySelected &&
                      selectedHour === mountedAt.getHours() &&
                      m < mountedAt.getMinutes();
                    const isSelected = m === selectedMinute;
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (minuteDidDragRef.current) return;
                          onMinuteChange(m);
                          minuteRef.current?.scrollTo({ top: m * 40, behavior: "smooth" });
                        }}
                        className={cn(
                          "relative z-10 w-full h-10 flex items-center justify-center text-sm rounded-xl transition-all font-semibold",
                          isDisabled && "text-gray-200 cursor-not-allowed",
                          !isDisabled && !isSelected && "text-gray-400 hover:text-gray-700",
                          isSelected && "text-brand-700 text-base",
                        )}
                      >
                        :{pad(m)}
                      </button>
                    );
                  })}
                  <div className="h-[60px]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
