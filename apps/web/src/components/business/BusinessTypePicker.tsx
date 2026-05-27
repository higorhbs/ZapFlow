"use client";

import {
  Scissors,
  Sparkles,
  UtensilsCrossed,
  Stethoscope,
  Store,
  LayoutGrid,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const BUSINESS_TYPE_OPTIONS = [
  { value: "BARBERSHOP", label: "Barbearia", icon: Scissors, color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "SALON", label: "Salão / Manicure", icon: Sparkles, color: "bg-pink-50 text-pink-700 border-pink-200" },
  {
    value: "RESTAURANT",
    label: "Restaurante",
    icon: UtensilsCrossed,
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  { value: "DENTAL", label: "Dentista / Clínica", icon: Stethoscope, color: "bg-teal-50 text-teal-700 border-teal-200" },
  { value: "STORE", label: "Loja de bairro", icon: Store, color: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "OTHER", label: "Outro", icon: LayoutGrid, color: "bg-gray-100 text-gray-700 border-gray-200" },
] as const;

export type BusinessTypeValue = (typeof BUSINESS_TYPE_OPTIONS)[number]["value"];

type Props = {
  value: string;
  onChange: (value: BusinessTypeValue) => void;
  error?: string;
};

export function BusinessTypePicker({ value, onChange, error }: Props) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {BUSINESS_TYPE_OPTIONS.map(({ value: id, label, icon: Icon, color }) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 text-center transition-all",
                "hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                selected
                  ? "border-brand-500 bg-brand-50/80 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              {selected && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              )}
              <span
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center border",
                  color,
                  selected && "ring-2 ring-brand-400 ring-offset-1"
                )}
              >
                <Icon className="w-5 h-5" />
              </span>
              <span
                className={cn(
                  "text-xs font-medium leading-tight",
                  selected ? "text-brand-800" : "text-gray-700"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-red-500 mt-2">{error}</p> : null}
    </div>
  );
}
