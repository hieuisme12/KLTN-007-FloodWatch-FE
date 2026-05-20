import { API_BASE_URL } from './config';

export const PUBLIC_BASE_URL = (
  process.env.EXPO_PUBLIC_PUBLIC_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  API_BASE_URL
).replace(/\/$/, '');

function isUploadsPath(pathname: string) {
  return pathname.startsWith('/uploads/');
}

function isWrongUploadsHost(hostname: string) {
  const h = hostname.toLowerCase();
  if (h.startsWith('admin.')) return true;
  try {
    return h !== new URL(PUBLIC_BASE_URL).hostname.toLowerCase();
  } catch {
    return false;
  }
}

export function resolveReportMediaUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (isUploadsPath(parsed.pathname) && isWrongUploadsHost(parsed.hostname)) {
        return `${PUBLIC_BASE_URL}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (isUploadsPath(path)) return `${PUBLIC_BASE_URL}${path}`;
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
}

export function parsePhotoUrlsField(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())).map((x) => x.trim());
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith('[')) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
            .map((x) => x.trim());
        }
      } catch {
        /* single url */
      }
    }
    return [t];
  }
  return [];
}

export function getReportPhotoUrls(report: {
  photo_urls?: unknown;
  photoUrls?: unknown;
  photo_url?: string;
  photoUrl?: string;
}): string[] {
  const fromArray = parsePhotoUrlsField(report.photo_urls ?? report.photoUrls);
  const raw =
    fromArray.length > 0
      ? fromArray
      : report.photo_url || report.photoUrl
        ? [String(report.photo_url || report.photoUrl).trim()]
        : [];
  return [...new Set(raw.map((u) => resolveReportMediaUrl(u)).filter(Boolean) as string[])];
}

export function getReportContent(report: {
  content?: string;
  description?: string;
}): string {
  const raw = report.content ?? report.description;
  return typeof raw === 'string' ? raw.trim() : '';
}
