/**
 * Chuẩn hóa thông báo lỗi hiển thị cho người dùng: không lộ URL nội bộ, stack, endpoint raw.
 */

const FALLBACK = 'Đã xảy ra lỗi. Vui lòng thử lại sau.';

function toStringSafe(input: unknown): string {
  if (input == null) return '';
  if (typeof input === 'string') return input;
  if (typeof input === 'number' || typeof input === 'boolean') return String(input);
  if (input instanceof Error) return input.message || '';
  try {
    if (typeof input === 'object') {
      const o = input as Record<string, unknown>;
      if (typeof o.error === 'string') return o.error;
      if (typeof o.message === 'string') return o.message;
    }
  } catch {
    /* ignore */
  }
  return FALLBACK;
}

function stripUrls(text: string): string {
  return text.replace(/\bhttps?:\/\/[^\s)]+/gi, '[liên kết đã ẩn]');
}

function stripPaths(text: string): string {
  return text
    .replace(/\b(?:\/[\w.-]+)+\/(?:api|v\d)\b[^\s]*/gi, '[đường dẫn API đã ẩn]')
    .replace(/[A-Za-z]:\\[^\s]+/g, '[đường dẫn đã ẩn]')
    .replace(/\/(?:var|usr|home)\/[^\s]+/g, '[đường dẫn đã ẩn]');
}

function looksLikeInfrastructureLeak(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes('relation ') ||
    t.includes('does not exist') ||
    t.includes('sqlstate') ||
    t.includes('econnrefused') ||
    t.includes('stack') ||
    t.includes('trace') ||
    t.includes('railway') ||
    t.includes('bad gateway') ||
    t.includes('nginx') ||
    t.includes('502') ||
    t.includes('503') ||
    t.includes('504')
  );
}

/**
 * Trả về chuỗi an toàn để render lên UI (toast, banner, inline).
 */
export function getSafeUserFacingError(input: unknown, fallback: string = FALLBACK): string {
  let raw = toStringSafe(input).trim();
  if (!raw) return fallback;

  raw = stripUrls(raw);
  raw = stripPaths(raw);

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^\s*at\s+/i.test(l) && !/^\s*Caused by:/i.test(l));
  raw = lines.join(' ').trim();
  if (!raw) return fallback;

  if (looksLikeInfrastructureLeak(raw)) {
    return fallback;
  }

  if (raw.length > 280) {
    raw = `${raw.slice(0, 277)}…`;
  }
  return raw;
}

/** Log chi tiết chỉ trên development — không gọi với secret. */
export function devLogError(context: string, err: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[${context}]`, err);
  }
}
