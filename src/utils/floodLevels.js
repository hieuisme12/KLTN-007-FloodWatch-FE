/**
 * Thang mức ngập 5 bậc (đồng bộ BE) — dùng cho form, bản đồ, danh sách, chat draft.
 */
export const FLOOD_LEVELS = [
  { value: 'Mức 1', i18nKey: 'level1', label: 'Mức 1 - 10 cm', cm: 10, color: '#4CAF50' },
  { value: 'Mức 2', i18nKey: 'level2', label: 'Mức 2 - 20 cm', cm: 20, color: '#8BC34A' },
  { value: 'Mức 3', i18nKey: 'level3', label: 'Mức 3 - 30 cm', cm: 30, color: '#FFC107' },
  { value: 'Mức 4', i18nKey: 'level4', label: 'Mức 4 - 40 cm', cm: 40, color: '#FF9800' },
  { value: 'Mức 5', i18nKey: 'level5', label: 'Mức 5 - trên 50 cm', cm: 55, color: '#F44336' }
];

/** Báo cáo cũ (Nhẹ / Trung bình / Nặng) → map sang thang mới khi hiển thị */
export const LEGACY_FLOOD_LEVEL_MAP = {
  Nhẹ: 'Mức 1',
  'Trung bình': 'Mức 3',
  Nặng: 'Mức 5'
};

export const FLOOD_LEVEL_VALUES = FLOOD_LEVELS.map((l) => l.value);

function withAlpha(hex, alpha) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Chuẩn hóa "Mức 1" … "Mức 5", "1"–"5", hoặc giá trị legacy */
export function normalizeFloodLevel(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (LEGACY_FLOOD_LEVEL_MAP[s]) return LEGACY_FLOOD_LEVEL_MAP[s];
  if (FLOOD_LEVEL_VALUES.includes(s)) return s;
  if (/^[1-5]$/.test(s)) return `Mức ${s}`;
  const mucMatch = s.match(/^mức\s*([1-5])$/i) || s.match(/^muc\s*([1-5])$/i);
  if (mucMatch) return `Mức ${mucMatch[1]}`;
  return s;
}

export function getFloodLevelDef(level) {
  const norm = normalizeFloodLevel(level);
  return FLOOD_LEVELS.find((l) => l.value === norm) || null;
}

export function isValidFloodLevel(level) {
  return getFloodLevelDef(level) != null;
}

export function getFloodLevelColor(level, fallback = '#6c757d') {
  return getFloodLevelDef(level)?.color ?? fallback;
}

function translateFloodLevel(t, ns, levelDef) {
  if (typeof t !== 'function' || !levelDef) return levelDef?.label ?? '—';
  const key = `${ns}.${levelDef.i18nKey}`;
  const translated = t(key, { defaultValue: levelDef.label });
  return translated === key ? levelDef.label : translated;
}

/** Nhãn hiển thị — ưu tiên i18n, fallback label từ constant */
export function getFloodLevelLabel(level, t) {
  const def = getFloodLevelDef(level);
  if (def) return translateFloodLevel(t, 'reportUi.floodDepth', def);
  const norm = normalizeFloodLevel(level);
  return norm || level || '—';
}

/** Options cho FilterDropdown / select — luôn 5 mức mới */
export function getFloodLevelDropdownOptions(t, includeEmpty = true) {
  const items = FLOOD_LEVELS.map((l) => ({
    id: l.value,
    name: translateFloodLevel(t, 'newReport.floodLevel', l)
  }));
  if (includeEmpty) {
    const emptyLabel =
      typeof t === 'function'
        ? t('newReport.levelPick', { defaultValue: '-- Chọn mức độ --' })
        : '-- Chọn mức độ --';
    return [{ id: '', name: emptyLabel }, ...items];
  }
  return items;
}

export function getFloodLevelDisplayInfo(level, t) {
  const def = getFloodLevelDef(level);
  if (!def) {
    return {
      color: '#6c757d',
      pillBg: '#f1f5f9',
      pillText: '#475569',
      pillBorder: '#e2e8f0',
      desc: getFloodLevelLabel(level, t)
    };
  }
  return {
    color: def.color,
    pillBg: withAlpha(def.color, 0.12),
    pillText: def.color,
    pillBorder: withAlpha(def.color, 0.35),
    desc: getFloodLevelLabel(def.value, t)
  };
}

/** Màu marker báo cáo crowd trên bản đồ */
export function getCrowdReportMarkerColor(report) {
  const mod = report?.moderation_status;
  if (mod === 'rejected') return '#dc3545';
  if (mod === 'approved') {
    return getFloodLevelColor(report?.flood_level, '#28a745');
  }
  return '#ffc107';
}

/** Trích draft báo cáo từ meta POST /api/chat */
export function extractReportDraft(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const d = meta.report_draft || meta.flood_report_draft || meta.draft;
  if (!d || typeof d !== 'object') return null;
  const lat = Number(d.lat);
  const lng = Number(d.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    level: normalizeFloodLevel(d.level),
    location_description: d.location_description || d.address || null,
    name: typeof d.name === 'string' ? d.name.trim() : null
  };
}

/** Record value → color (map, mobile, legend) */
export function buildFloodLevelColorMap() {
  const map = { ...LEGACY_FLOOD_LEVEL_MAP };
  for (const l of FLOOD_LEVELS) {
    map[l.value] = l.color;
  }
  return map;
}
