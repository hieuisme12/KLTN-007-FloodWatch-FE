/** Thang mức ngập 5 bậc — đồng bộ web `src/utils/floodLevels.js` */
export const FLOOD_LEVELS = [
  { value: 'Mức 1', label: 'Mức 1 - 10 cm', cm: 10, color: '#4CAF50' },
  { value: 'Mức 2', label: 'Mức 2 - 20 cm', cm: 20, color: '#8BC34A' },
  { value: 'Mức 3', label: 'Mức 3 - 30 cm', cm: 30, color: '#FFC107' },
  { value: 'Mức 4', label: 'Mức 4 - 40 cm', cm: 40, color: '#FF9800' },
  { value: 'Mức 5', label: 'Mức 5 - trên 50 cm', cm: 55, color: '#F44336' },
] as const;

const LEGACY_MAP: Record<string, string> = {
  Nhẹ: 'Mức 1',
  'Trung bình': 'Mức 3',
  Nặng: 'Mức 5',
};

export function normalizeFloodLevel(raw?: string | null): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (LEGACY_MAP[s]) return LEGACY_MAP[s];
  if (FLOOD_LEVELS.some((l) => l.value === s)) return s;
  if (/^[1-5]$/.test(s)) return `Mức ${s}`;
  return s;
}

export function getFloodLevelColor(level?: string | null, fallback = '#4CAF50'): string {
  const norm = normalizeFloodLevel(level);
  const def = FLOOD_LEVELS.find((l) => l.value === norm);
  return def?.color ?? fallback;
}

export function getFloodLevelLabel(level?: string | null): string {
  const norm = normalizeFloodLevel(level);
  const def = FLOOD_LEVELS.find((l) => l.value === norm);
  return def?.label ?? norm ?? level ?? '—';
}

export const FLOOD_LEVEL_COLORS: Record<string, string> = Object.fromEntries(
  FLOOD_LEVELS.map((l) => [l.value, l.color])
);
for (const [legacy, mapped] of Object.entries(LEGACY_MAP)) {
  const color = FLOOD_LEVEL_COLORS[mapped];
  if (color) FLOOD_LEVEL_COLORS[legacy] = color;
}

export function crowdReportColor(level?: string): string {
  return getFloodLevelColor(level, '#4CAF50');
}
