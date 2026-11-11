// datetime-local values are interpreted as Seoul wall time, not server local time.
export function seoulInputToIso(value: string | null): string | null | undefined {
  if (value === "") return null;
  if (!value || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return undefined;
  const day = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== value.slice(0, 10)) return undefined;
  const local = value.length === 16 ? value + ":00" : value;
  const wall = Date.parse(`${local}Z`);
  if (!Number.isFinite(wall)) return undefined;
  const candidates = new Set<string>();
  // Probe either side of a possible offset transition. Ambiguous or skipped
  // wall times fail closed instead of silently choosing a different instant.
  for (const hours of [-48, -24, -12, 0, 12, 24, 48]) {
    const sample = new Date(wall + hours * 3_600_000);
    const localSample = isoToSeoulInput(sample.toISOString());
    const offset = Date.parse(`${localSample}Z`) - sample.getTime();
    const candidate = new Date(wall - offset);
    if (Number.isFinite(candidate.getTime()) && isoToSeoulInput(candidate.toISOString()) === local) {
      candidates.add(candidate.toISOString());
    }
  }
  return candidates.size === 1 ? [...candidates][0] : undefined;
}

export function isoToSeoulInput(value: string | null): string {
  if (value === null) return "";
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).format(instant).replace(" ", "T");
}
