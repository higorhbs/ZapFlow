const MIN_LEAD_MS = 60_000;
export const MAX_SCHEDULE_DAYS = 62;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function dateDayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(y!, m! - 1, day!);
}

export function buildScheduledAtsFromDayKeys(
  dayKeys: string[],
  hour: number,
  minute: number,
  minLeadMs = MIN_LEAD_MS
): string[] {
  const unique = [...new Set(dayKeys)].sort();
  if (unique.length === 0) throw new Error("Selecione pelo menos um dia no calendário.");
  if (unique.length > MAX_SCHEDULE_DAYS) {
    throw new Error(`Selecione no máximo ${MAX_SCHEDULE_DAYS} dias por vez.`);
  }

  const minAt = Date.now() + minLeadMs;
  const out: string[] = [];

  for (const key of unique) {
    const parts = key.split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) continue;
    const [y, m, d] = parts;
    const dt = new Date(y!, m! - 1, d!, hour, minute, 0, 0);
    if (dt.getTime() >= minAt) out.push(dt.toISOString());
  }

  if (out.length === 0) {
    throw new Error("Nenhum dia válido: escolha datas futuras e um horário pelo menos 1 min à frente.");
  }

  return out;
}
