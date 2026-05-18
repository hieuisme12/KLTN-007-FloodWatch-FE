import { API_CONFIG } from '../config/apiConfig';

/**
 * Khớp BE `PUBLIC_BASE_URL` / photoUrl.js — origin cho `/uploads/*`.
 * Mặc định = API host (BE trả absolute_url dạng https://api.floodsight.id.vn/uploads/...).
 */
export const PUBLIC_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_BASE_URL) ||
  API_CONFIG.BASE_URL
).replace(/\/$/, '');

function isUploadsPath(pathname) {
  return typeof pathname === 'string' && pathname.startsWith('/uploads/');
}

/** Host cũ / sai trong DB (vd. admin.*) — ghép lại bằng PUBLIC_BASE_URL. */
function isWrongUploadsHost(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  if (h.startsWith('admin.')) return true;
  try {
    const expected = new URL(PUBLIC_BASE_URL).hostname.toLowerCase();
    return h !== expected;
  } catch {
    return false;
  }
}

/**
 * Chuẩn hoá URL ảnh báo cáo để hiển thị (không Bearer trên <img>).
 * - URL absolute đúng host → giữ nguyên
 * - Host sai / path `/uploads/...` tương đối → ghép PUBLIC_BASE_URL
 */
export function resolveReportMediaUrl(url) {
  if (url == null) return null;
  const trimmed = typeof url === 'string' ? url.trim() : '';
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
  if (isUploadsPath(path)) {
    return `${PUBLIC_BASE_URL}${path}`;
  }

  const apiBase = API_CONFIG.BASE_URL.replace(/\/$/, '');
  return apiBase + path;
}

/** BE có thể trả photo_urls là array hoặc JSON string. */
export function parsePhotoUrlsField(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith('[')) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((x) => typeof x === 'string' && x.trim())
            .map((x) => x.trim());
        }
      } catch {
        /* một URL đơn */
      }
    }
    return [t];
  }
  return [];
}
