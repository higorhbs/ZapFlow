"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, MessageSquare, Server, QrCode, Smartphone, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type WhatsAppRunnerPhase =
  | "idle"
  | "checking"
  | "linking"
  | "qr"
  | "scan"
  | "connected";

const STEPS: { phase: WhatsAppRunnerPhase; icon: typeof Server; label: string }[] = [
  { phase: "checking", icon: Server, label: "Servidor" },
  { phase: "linking", icon: Zap, label: "Sessão" },
  { phase: "qr", icon: QrCode, label: "QR Code" },
  { phase: "scan", icon: Smartphone, label: "Celular" },
  { phase: "connected", icon: Check, label: "Online" },
];

const PHASE_PROGRESS: Record<WhatsAppRunnerPhase, number> = {
  idle: 0,
  checking: 0.12,
  linking: 0.38,
  qr: 0.58,
  scan: 0.78,
  connected: 1,
};

const PHASE_CAPTION: Record<WhatsAppRunnerPhase, string> = {
  idle: "Pronto para conectar",
  checking: "Alcançando o agente WhatsApp",
  linking: "Abrindo canal seguro",
  qr: "Gerando QR Code…",
  scan: "Confirmando pareamento",
  connected: "Atendimento automático ativo",
};

function phaseIndex(phase: WhatsAppRunnerPhase) {
  if (phase === "idle") return -1;
  return STEPS.findIndex((s) => s.phase === phase);
}

export function resolveWhatsAppRunnerPhase(opts: {
  connected: boolean;
  reconnecting: boolean;
  waitingQr: boolean;
  hasQr: boolean;
}): WhatsAppRunnerPhase {
  if (opts.connected) return "connected";
  if (opts.hasQr) return "scan";
  if (opts.waitingQr || opts.reconnecting) return "qr";
  return "idle";
}

type Props = {
  phase: WhatsAppRunnerPhase;
  compact?: boolean;
};

export function WhatsAppConnectionRunner({ phase, compact }: Props) {
  const reduced = useReducedMotion();
  const progress = PHASE_PROGRESS[phase];
  const activeIdx = phaseIndex(phase);
  const running = phase !== "idle" && phase !== "connected";
  const caption = PHASE_CAPTION[phase];

  const runnerLeft = useMemo(() => `calc(${Math.max(4, progress * 100)}% - 1.25rem)`, [progress]);

  return (
    <div
      className={cn("w-full select-none", compact ? "py-2" : "py-4")}
      role="status"
      aria-live="polite"
      aria-label={caption}
    >
      <div className="relative mx-auto max-w-sm px-2">
        <div className="relative h-16 overflow-hidden rounded-2xl bg-gradient-to-b from-brand-50 to-brand-100/80 border border-brand-200/60">
          <div
            className={cn(
              "absolute inset-x-0 bottom-3 h-px border-t border-dashed border-brand-300/70",
              running && !reduced && "wa-runner-ground",
            )}
          />
          <div className="absolute inset-x-0 bottom-0 h-3 bg-brand-200/40 rounded-b-2xl" />

          {STEPS.map((step, i) => {
            const left = `${8 + (i / (STEPS.length - 1)) * 84}%`;
            const done = activeIdx >= i;
            const current = activeIdx === i;
            const Icon = step.icon;
            return (
              <div
                key={step.phase}
                className="absolute bottom-4 flex flex-col items-center -translate-x-1/2"
                style={{ left }}
              >
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border-2 transition-colors duration-500",
                    done
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-brand-200 bg-white text-brand-300",
                    current && running && "ring-2 ring-brand-400/50 ring-offset-1",
                  )}
                >
                  <Icon className="size-3" aria-hidden />
                </div>
                {!compact && (
                  <span
                    className={cn(
                      "mt-1 text-[9px] font-medium uppercase tracking-wide",
                      done ? "text-brand-700" : "text-brand-300",
                    )}
                  >
                    {step.label}
                  </span>
                )}
              </div>
            );
          })}

          <motion.div
            className="absolute bottom-5 z-10 flex size-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30"
            style={{ left: runnerLeft }}
            animate={
              reduced
                ? { y: 0 }
                : phase === "connected"
                  ? { y: 0, scale: [1, 1.08, 1] }
                  : running
                    ? { y: [0, -5, 0, -3, 0] }
                    : { y: 0 }
            }
            transition={
              phase === "connected"
                ? { duration: 0.5 }
                : running
                  ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.3 }
            }
          >
            {phase === "connected" ? (
              <Check className="size-5" strokeWidth={2.5} aria-hidden />
            ) : (
              <MessageSquare className="size-5" aria-hidden />
            )}
          </motion.div>
        </div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-3 text-center"
        >
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              phase === "connected"
                ? "bg-green-100 text-green-800"
                : running
                  ? "bg-brand-100 text-brand-800"
                  : "bg-gray-100 text-gray-600",
            )}
          >
            {running && !reduced && (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-500" />
              </span>
            )}
            {caption}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
