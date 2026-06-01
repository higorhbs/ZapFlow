"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const DAYS: Record<string, { short: string; weekday: boolean }> = {
  mon: { short: "Seg", weekday: true },
  tue: { short: "Ter", weekday: true },
  wed: { short: "Qua", weekday: true },
  thu: { short: "Qui", weekday: true },
  fri: { short: "Sex", weekday: true },
  sat: { short: "Sáb", weekday: false },
  sun: { short: "Dom", weekday: false },
};

const pad = (n: number) => String(n).padStart(2, "0");

const ITEM_H = 32;
const COL_H  = 96;
const SPACER = (COL_H - ITEM_H) / 2;

export type WorkingHoursValue = Record<string, [string, string] | null>;

export function defaultWorkingHours(): WorkingHoursValue {
  const h: WorkingHoursValue = {};
  DAY_KEYS.forEach((d) => { h[d] = d === "sun" ? null : ["09:00", "18:00"]; });
  return h;
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 ease-in-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        checked ? "bg-brand-600" : "bg-gray-200"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ── TimePicker ────────────────────────────────────────────────────────────────
function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value.split(":");
  const hh = parseInt(parts[0] ?? "09", 10);
  const mm = parseInt(parts[1] ?? "00", 10);

  const hourRef = useRef<HTMLDivElement>(null);
  const minRef  = useRef<HTMLDivElement>(null);
  const hDrag    = useRef<{ startY: number; startTop: number } | null>(null);
  const hDragged = useRef(false);
  const mDrag    = useRef<{ startY: number; startTop: number } | null>(null);
  const mDragged = useRef(false);

  useEffect(() => {
    if (hourRef.current) hourRef.current.scrollTop = hh * ITEM_H;
    if (minRef.current)  minRef.current.scrollTop  = mm * ITEM_H;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onHourDown(e: React.PointerEvent<HTMLDivElement>) {
    hDragged.current = false;
    hDrag.current = { startY: e.clientY, startTop: hourRef.current?.scrollTop ?? 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onHourMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!hDrag.current || !hourRef.current) return;
    const dy = e.clientY - hDrag.current.startY;
    if (Math.abs(dy) > 3) hDragged.current = true;
    hourRef.current.scrollTop = hDrag.current.startTop - dy;
  }
  function onHourUp() {
    if (!hDrag.current || !hourRef.current) return;
    hDrag.current = null;
    if (!hDragged.current) return;
    const h = Math.max(0, Math.min(23, Math.round(hourRef.current.scrollTop / ITEM_H)));
    onChange(`${pad(h)}:${pad(mm)}`);
    hourRef.current.scrollTo({ top: h * ITEM_H, behavior: "smooth" });
  }

  function onMinDown(e: React.PointerEvent<HTMLDivElement>) {
    mDragged.current = false;
    mDrag.current = { startY: e.clientY, startTop: minRef.current?.scrollTop ?? 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onMinMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!mDrag.current || !minRef.current) return;
    const dy = e.clientY - mDrag.current.startY;
    if (Math.abs(dy) > 3) mDragged.current = true;
    minRef.current.scrollTop = mDrag.current.startTop - dy;
  }
  function onMinUp() {
    if (!mDrag.current || !minRef.current) return;
    mDrag.current = null;
    if (!mDragged.current) return;
    const m = Math.max(0, Math.min(59, Math.round(minRef.current.scrollTop / ITEM_H)));
    onChange(`${pad(hh)}:${pad(m)}`);
    minRef.current.scrollTo({ top: m * ITEM_H, behavior: "smooth" });
  }

  const colBase = "overflow-y-auto [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing select-none w-9";

  return (
    <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-brand-300 transition-colors px-1">
      {/* Hour */}
      <div className="relative">
        <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
        <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-8 bg-brand-50/70 border-y border-brand-100 pointer-events-none z-0" />
        <div
          ref={hourRef}
          className={colBase}
          style={{ height: COL_H, scrollbarWidth: "none" }}
          onPointerDown={onHourDown}
          onPointerMove={onHourMove}
          onPointerUp={onHourUp}
          onPointerCancel={onHourUp}
        >
          <div style={{ height: SPACER }} />
          {Array.from({ length: 24 }, (_, h) => (
            <button key={h} type="button" style={{ height: ITEM_H }}
              onClick={() => {
                if (hDragged.current) return;
                onChange(`${pad(h)}:${pad(mm)}`);
                hourRef.current?.scrollTo({ top: h * ITEM_H, behavior: "smooth" });
              }}
              className={cn(
                "relative z-10 w-full flex items-center justify-center font-mono font-semibold transition-all rounded-lg",
                h === hh ? "text-brand-700 text-xs" : "text-[11px] text-gray-400 hover:text-gray-700",
              )}
            >{pad(h)}</button>
          ))}
          <div style={{ height: SPACER }} />
        </div>
      </div>

      <span className="text-gray-300 text-xs font-bold select-none mx-0.5">:</span>

      {/* Minute */}
      <div className="relative">
        <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
        <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-8 bg-brand-50/70 border-y border-brand-100 pointer-events-none z-0" />
        <div
          ref={minRef}
          className={colBase}
          style={{ height: COL_H, scrollbarWidth: "none" }}
          onPointerDown={onMinDown}
          onPointerMove={onMinMove}
          onPointerUp={onMinUp}
          onPointerCancel={onMinUp}
        >
          <div style={{ height: SPACER }} />
          {Array.from({ length: 60 }, (_, m) => (
            <button key={m} type="button" style={{ height: ITEM_H }}
              onClick={() => {
                if (mDragged.current) return;
                onChange(`${pad(hh)}:${pad(m)}`);
                minRef.current?.scrollTo({ top: m * ITEM_H, behavior: "smooth" });
              }}
              className={cn(
                "relative z-10 w-full flex items-center justify-center font-mono font-semibold transition-all rounded-lg",
                m === mm ? "text-brand-700 text-xs" : "text-[11px] text-gray-400 hover:text-gray-700",
              )}
            >{pad(m)}</button>
          ))}
          <div style={{ height: SPACER }} />
        </div>
      </div>
    </div>
  );
}

// ── WorkingHoursEditor ────────────────────────────────────────────────────────
type Props = { value: WorkingHoursValue; onChange: (value: WorkingHoursValue) => void };

export function WorkingHoursEditor({ value, onChange }: Props) {
  const [editingDay, setEditingDay] = useState<string | null>(null);

  function setDay(day: string, slot: [string, string] | null) {
    onChange({ ...value, [day]: slot });
  }

  function applyToWeekdays(template: [string, string]) {
    const next = { ...value };
    DAY_KEYS.filter((d) => DAYS[d].weekday).forEach((d) => { next[d] = [...template]; });
    onChange(next);
  }

  function applyToAll(template: [string, string]) {
    const next: WorkingHoursValue = {};
    DAY_KEYS.forEach((d) => { next[d] = [...template]; });
    onChange(next);
  }

  const openCount = DAY_KEYS.filter((d) => value[d] !== null && value[d] !== undefined).length;

  return (
    <div className="space-y-3">
      {/* Day chip summary */}
      <div className="flex items-center gap-2 flex-wrap">
        {DAY_KEYS.map((day) => {
          const open = value[day] !== null && value[day] !== undefined;
          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                const nowOpen = !open;
                setDay(day, nowOpen ? ["09:00", "18:00"] : null);
                setEditingDay(nowOpen ? day : (editingDay === day ? null : editingDay));
              }}
              className={cn(
                "w-10 h-10 rounded-xl text-xs font-bold transition-all",
                open ? "bg-brand-600 text-white shadow-sm" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              )}
            >
              {DAYS[day].short}
            </button>
          );
        })}
        <span className="text-xs text-gray-400 ml-1">
          {openCount === 0
            ? "Nenhum dia ativo"
            : `${openCount} dia${openCount > 1 ? "s" : ""} aberto${openCount > 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Rows */}
      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {DAY_KEYS.map((day) => {
          const open = value[day] !== null && value[day] !== undefined;
          const slot = value[day] ?? ["09:00", "18:00"];
          const isEditing = editingDay === day;

          return (
            <div
              key={day}
              className={cn(
                "flex items-center gap-3 px-4 transition-colors",
                isEditing ? "py-3" : "py-2.5",
                open ? "bg-white" : "bg-gray-50/70"
              )}
            >
              {/* Day badge */}
              <span
                className={cn(
                  "w-9 text-center text-xs font-bold py-1.5 rounded-lg flex-shrink-0",
                  open ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-400"
                )}
              >
                {DAYS[day].short}
              </span>

              {/* Toggle */}
              <Toggle
                checked={open}
                onChange={(v) => {
                  setDay(day, v ? ["09:00", "18:00"] : null);
                  if (v) setEditingDay(day);
                  else if (editingDay === day) setEditingDay(null);
                }}
              />

              {open ? (
                isEditing ? (
                  /* ── Edit mode ─────────────────────────────── */
                  <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                    <TimePicker value={slot[0]} onChange={(t) => setDay(day, [t, slot[1]])} />
                    <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                    <TimePicker value={slot[1]} onChange={(t) => setDay(day, [slot[0], t])} />

                    <div className="flex items-center gap-3 ml-auto flex-shrink-0">
                      {DAYS[day].weekday && (
                        <button
                          type="button"
                          onClick={() => applyToWeekdays(slot as [string, string])}
                          className="text-[11px] text-gray-400 hover:text-brand-600 transition-colors whitespace-nowrap hidden lg:block"
                        >
                          Aplicar a dias úteis
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingDay(null)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Display mode ───────────────────────────── */
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-mono font-semibold text-gray-700">{slot[0]}</span>
                    <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                    <span className="text-sm font-mono font-semibold text-gray-700">{slot[1]}</span>
                    <button
                      type="button"
                      onClick={() => setEditingDay(day)}
                      className="ml-auto inline-flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600 transition-colors flex-shrink-0"
                    >
                      <Pencil className="w-3 h-3" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                  </div>
                )
              ) : (
                <span className="flex-1 text-xs text-gray-400">Fechado</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap pt-0.5">
        {[
          { label: "Dias úteis 09h–18h", action: () => { applyToWeekdays(["09:00", "18:00"]); setEditingDay(null); } },
          { label: "Todos os dias 09h–18h", action: () => { applyToAll(["09:00", "18:00"]); setEditingDay(null); } },
          { label: "Restaurar padrão", action: () => { onChange(defaultWorkingHours()); setEditingDay(null); } },
        ].map(({ label, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className="text-xs text-gray-500 hover:text-brand-600 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
