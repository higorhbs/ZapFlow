"use client";

import { useQuery } from "@tanstack/react-query";
import { businessApi, analyticsApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency, cn } from "@/lib/utils";
import {
  MessageSquare, Calendar, DollarSign, TrendingUp,
  Store, ArrowRight, Plus, Settings,
  ShoppingBag, Zap,
} from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import { useState, useEffect, useRef } from "react";
import { getBusinessVocabulary } from "@/lib/use-business-vocabulary";
import { IaIcon } from "@/lib/ia-brand";

// ── Seeded deterministic data ──────────────────────────────────────────────────
function seeded(n: number) {
  const x = Math.sin(n + 1) * 10000;
  return x - Math.floor(x);
}

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function generateWeekData(monthly: number) {
  const avg = monthly / 4.3;
  return DAYS.map((day, i) => ({
    day,
    v: Math.max(2, Math.round((avg / 7) * (0.5 + seeded(i * 13 + (monthly % 97)) * 1.3))),
  }));
}

function generateSparkData(total: number, n = 8) {
  return Array.from({ length: n }, (_, i) =>
    Math.max(1, Math.round((total / n) * (0.4 + seeded(i * 7 + (total % 53)) * 1.5)))
  );
}

// ── Count-up ───────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1300, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const t = setTimeout(() => {
      let s: number | null = null;
      const tick = (ts: number) => {
        if (!s) s = ts;
        const p = Math.min((ts - s) / duration, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 4)) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return val;
}

// ── SVG Sparkline (inline, no lib) ────────────────────────────────────────────
function Sparkline({ data, color, w = 72, h = 32 }: {
  data: number[]; color: string; w?: number; h?: number;
}) {
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - 4 - ((v / max) * (h - 8)),
  }));

  const line = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = pts[i - 1]!;
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx.toFixed(1)},${prev.y.toFixed(1)} ${cx.toFixed(1)},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }, "");

  const area = `${line} L ${w},${h} L 0,${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`sg${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${color.replace("#", "")})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ── Animated SVG area chart (line draws itself + hover tooltip) ───────────────
function AnimatedAreaChart({ data }: { data: { day: string; v: number }[] }) {
  const lineRef = useRef<SVGPathElement>(null);
  const [fillVisible, setFillVisible] = useState(false);
  const [dotsVisible, setDotsVisible] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  const W = 500, H = 180;
  const padL = 8, padR = 8, padT = 12, padB = 28;
  const cW = W - padL - padR, cH = H - padT - padB;
  const max = Math.max(...data.map(d => d.v), 1);

  const pts = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * cW,
    y: padT + cH - (d.v / max) * cH,
    ...d,
  }));

  function smooth(points: { x: number; y: number }[]) {
    return points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      const prev = points[i - 1]!;
      const cx = (prev.x + p.x) / 2;
      return `${acc} C ${cx.toFixed(1)},${prev.y.toFixed(1)} ${cx.toFixed(1)},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }, "");
  }

  const linePath = smooth(pts);
  const areaPath = `${linePath} L ${pts[pts.length - 1]!.x},${padT + cH} L ${pts[0]!.x},${padT + cH} Z`;

  useEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    const t1 = setTimeout(() => {
      el.style.transition = "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)";
      el.style.strokeDashoffset = "0";
    }, 200);
    const t2 = setTimeout(() => setFillVisible(true), 900);
    const t3 = setTimeout(() => setDotsVisible(true), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const hPt = hovered !== null ? pts[hovered] : null;

  return (
    <div className="relative" style={{ height: 180 }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
            <stop offset="85%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={padL} x2={W - padR}
            y1={padT + cH * (1 - f)} y2={padT + cH * (1 - f)}
            stroke="#f1f5f9" strokeWidth="1" />
        ))}

        {/* Fill */}
        <path d={areaPath} fill="url(#areaGrad)"
          style={{ opacity: fillVisible ? 1 : 0, transition: "opacity 0.7s ease" }} />

        {/* Hover: vertical cursor line */}
        {hPt && (
          <line
            x1={hPt.x} x2={hPt.x}
            y1={padT} y2={padT + cH}
            stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.4"
          />
        )}

        {/* Animated line */}
        <path ref={lineRef} d={linePath} fill="none"
          stroke="#6366f1" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots (default) */}
        {pts.map((p, i) => (
          <g key={i} style={{ opacity: hovered === i ? 0 : dotsVisible ? 1 : 0, transition: `opacity 0.2s ease ${i * 60}ms` }}>
            <circle cx={p.x} cy={p.y} r="5" fill="#6366f1" opacity="0.15" />
            <circle cx={p.x} cy={p.y} r="3" fill="white" stroke="#6366f1" strokeWidth="2" />
          </g>
        ))}

        {/* Hover: highlighted dot */}
        {hPt && (
          <g>
            <circle cx={hPt.x} cy={hPt.y} r="8" fill="#6366f1" opacity="0.15" />
            <circle cx={hPt.x} cy={hPt.y} r="4.5" fill="white" stroke="#6366f1" strokeWidth="2.5" />
          </g>
        )}

        {/* X labels */}
        {pts.map((p, i) => (
          <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="10"
            fill={hovered === i ? "#6366f1" : "#9ca3af"}
            fontWeight={hovered === i ? "600" : "400"}>
            {p.day}
          </text>
        ))}

        {/* Invisible wide hit areas per day */}
        {pts.map((p, i) => {
          const prev = pts[i - 1];
          const next = pts[i + 1];
          const x1 = prev ? (prev.x + p.x) / 2 : padL;
          const x2 = next ? (p.x + next.x) / 2 : W - padR;
          return (
            <rect
              key={i}
              x={x1} y={padT}
              width={x2 - x1} height={cH}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>

      {/* Floating tooltip */}
      {hPt && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: `clamp(48px, ${(hPt.x / W) * 100}%, calc(100% - 48px))`,
            top: `${(hPt.y / H) * 100}%`,
            transform: "translate(-50%, -140%)",
          }}
        >
          <div className="bg-gray-900 text-white rounded-xl px-3 py-2 shadow-xl text-center whitespace-nowrap">
            <p className="text-[10px] text-gray-400 font-medium">{hPt.day}</p>
            <p className="text-base font-bold leading-tight">{hPt.v}</p>
            <p className="text-[10px] text-gray-400">conversas</p>
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0
            border-l-[5px] border-r-[5px] border-t-[5px]
            border-l-transparent border-r-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

// ── Animated bar chart ─────────────────────────────────────────────────────────
function AnimatedBars({ data }: { data: { day: string; v: number }[] }) {
  const [show, setShow] = useState(false);
  const max = Math.max(...data.map(d => d.v), 1);
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex items-end gap-1.5 h-20 px-1">
      {data.map((d, i) => {
        const pct = (d.v / max) * 100;
        const isToday = i === todayIdx;
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full flex-1 flex items-end">
              <div
                className={cn(
                  "w-full rounded-t-lg transition-all ease-out",
                  isToday ? "bg-brand-500" : "bg-brand-100"
                )}
                style={{
                  height: show ? `${Math.max(pct, 6)}%` : "0%",
                  transitionDuration: "700ms",
                  transitionDelay: `${i * 55}ms`,
                }}
              />
            </div>
            <span className={cn("text-[10px] font-medium", isToday ? "text-brand-600" : "text-gray-400")}>
              {d.day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Ring (donut) chart ─────────────────────────────────────────────────────────
function RingChart({ value, max, color, size = 72 }: {
  value: number; max: number; color: string; size?: number;
}) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const [shown, setShown] = useState(false);
  const pct = Math.min(value / Math.max(max, 1), 1);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={shown ? circ * (1 - pct) : circ}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s" }}
      />
    </svg>
  );
}

// ── Metric card ────────────────────────────────────────────────────────────────
function MetricCard({
  label, rawValue, displayValue, icon: Icon,
  iconColor, iconBg, sparkColor, sparkData, delay = 0,
}: {
  label: string; rawValue: number; displayValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string; iconBg: string; sparkColor: string;
  sparkData: number[]; delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  const counted = useCountUp(rawValue, 1200, delay + 200);
  const shown = displayValue ?? counted.toLocaleString("pt-BR");

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className={cn(
      "rounded-2xl bg-white border border-gray-200 p-5 transition-all duration-500",
      visible ? "opacity-100 translate-y-0 shadow-sm" : "opacity-0 translate-y-5"
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-[18px] h-[18px]", iconColor)} />
        </div>
        <Sparkline data={sparkData} color={sparkColor} />
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{shown}</p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
    </div>
  );
}

// ── Quick link ─────────────────────────────────────────────────────────────────
function QuickLink({ href, icon: Icon, label, iconColor, iconBg }: {
  href: string; icon: React.ComponentType<{ className?: string }>;
  label: string; iconColor: string; iconBg: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50/40 transition-all group">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-brand-700 flex-1 transition-colors">{label}</span>
      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-400 transition-colors" />
    </Link>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { uid, ready } = useAuth();
  const { data: businesses, isLoading } = useQuery({
    queryKey: ["businesses", uid],
    queryFn: businessApi.list,
    enabled: ready && !!uid,
  });
  const business = businesses?.[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-8">
        <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
          <Store className="w-8 h-8 text-brand-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Nenhum negócio cadastrado</h2>
        <p className="text-gray-500 text-center mb-6 max-w-sm">
          Cadastre seu negócio para começar a usar o atendimento automático no WhatsApp.
        </p>
        <Link href="/businesses/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Cadastrar meu negócio
        </Link>
      </div>
    );
  }

  return <DashboardContent business={business} />;
}

function DashboardContent({ business }: { business: any }) {
  const v = getBusinessVocabulary(business?.type);

  const { data: analytics } = useQuery({
    queryKey: ["analytics", business.id],
    queryFn: () => analyticsApi.get(business.id),
    enabled: !!business.id,
  });

  const conv   = analytics?.conversations.thisMonth ?? 0;
  const pend   = analytics?.appointments.pending ?? 0;
  const rev    = analytics?.payments.revenueThisMonth ?? 0;
  const growth = analytics?.conversations.growth ?? 0;

  const weekData = generateWeekData(conv);

  const metrics = [
    {
      label: "Conversas este mês",
      rawValue: conv,
      icon: MessageSquare,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      sparkColor: "#3b82f6",
      sparkData: generateSparkData(conv),
      delay: 0,
    },
    {
      label: v.bookingsPlural,
      rawValue: pend,
      icon: Calendar,
      iconColor: "text-violet-600",
      iconBg: "bg-violet-50",
      sparkColor: "#8b5cf6",
      sparkData: generateSparkData(pend),
      delay: 80,
    },
    {
      label: "Receita este mês",
      rawValue: rev,
      displayValue: analytics ? formatCurrency(rev) : "—",
      icon: DollarSign,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      sparkColor: "#10b981",
      sparkData: generateSparkData(rev),
      delay: 160,
    },
    {
      label: "Crescimento mensal",
      rawValue: Math.abs(growth),
      displayValue: analytics
        ? `${growth > 0 ? "+" : growth < 0 ? "−" : ""}${Math.abs(growth)}%`
        : "—",
      icon: TrendingUp,
      iconColor: growth >= 0 ? "text-orange-500" : "text-red-500",
      iconBg: growth >= 0 ? "bg-orange-50" : "bg-red-50",
      sparkColor: growth >= 0 ? "#f97316" : "#ef4444",
      sparkData: generateSparkData(Math.abs(growth) + 5),
      delay: 240,
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-blue-500 p-6 mb-8 shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-6 w-48 h-48 rounded-full bg-white/5" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm flex-shrink-0">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{business.name}</h1>
                {business.isConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-emerald-400/20 text-emerald-100 border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                    Conectado
                  </span>
                ) : (
                  <Link
                    href={`/businesses/${business.id}/whatsapp`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-white/10 text-white/60 border-white/20 hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    Desconectado
                  </Link>
                )}
              </div>
              <p className="text-white/70 text-sm mt-0.5">{business.phone}</p>
            </div>
          </div>
          <Link href={`/businesses/${business.id}/conversations`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-brand-700 font-medium text-sm hover:bg-white/90 transition-colors shadow-sm flex-shrink-0">
            Abrir conversas
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Charts + sidebar */}
      <div className="grid lg:grid-cols-[1fr_260px] gap-6">
        {/* Main chart card */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900">Conversas esta semana</h3>
              <p className="text-xs text-gray-400 mt-0.5">Distribuição estimada com base no mês atual</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              Conversas
            </span>
          </div>

          {/* Area chart */}
          <AnimatedAreaChart data={weekData} />

          {/* Bars */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Volume por dia</p>
            <AnimatedBars data={weekData} />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Ring + pending */}
          <div className="rounded-2xl bg-white border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-800 mb-4">{v.bookingsPlural}</p>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <RingChart
                  value={pend}
                  max={Math.max(pend * 1.5, 10)}
                  color="#8b5cf6"
                  size={72}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-900">{pend}</span>
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-600">{pend}</p>
                <p className="text-xs text-gray-500 mt-0.5">pendentes</p>
                <Link href={`/businesses/${business.id}/appointments`}
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium mt-2 transition-colors">
                  Ver todos
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Growth indicator */}
          {analytics && (
            <div className={cn(
              "rounded-2xl p-4 border",
              growth >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
            )}>
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp className={cn("w-4 h-4", growth >= 0 ? "text-emerald-600" : "text-red-500")} />
                <span className={cn("text-sm font-bold", growth >= 0 ? "text-emerald-700" : "text-red-600")}>
                  {growth >= 0 ? `+${growth}%` : `${growth}%`}
                </span>
              </div>
              <p className={cn("text-xs leading-relaxed", growth >= 0 ? "text-emerald-600" : "text-red-500")}>
                {growth >= 0 ? "Crescimento vs. mês anterior" : "Queda vs. mês anterior"}
              </p>
            </div>
          )}

          {/* Quick links */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">Acesso rápido</p>
            <QuickLink href={`/businesses/${business.id}/faqs`}       icon={IaIcon}      label="Configurar IA"   iconColor="text-brand-600"   iconBg="bg-brand-50" />
            <QuickLink href={`/businesses/${business.id}/catalog`}    icon={ShoppingBag} label="Catálogo"         iconColor="text-violet-600"  iconBg="bg-violet-50" />
            <QuickLink href={`/businesses/${business.id}/appointments`} icon={Calendar}  label="Agendamentos"    iconColor="text-emerald-600" iconBg="bg-emerald-50" />
            <QuickLink href={`/businesses/${business.id}/settings`}   icon={Settings}    label="Configurações"   iconColor="text-gray-500"    iconBg="bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
