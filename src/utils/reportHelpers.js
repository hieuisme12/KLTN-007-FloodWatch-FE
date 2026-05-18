import {
  parsePhotoUrlsField,
  resolveReportMediaUrl
} from './mediaUrl';

export { resolveReportMediaUrl, parsePhotoUrlsField };

/**
 * Kiểm tra báo cáo đã hết hạn (không hiển thị trên bản đồ).
 */
export const isReportExpired = (report, maxAgeHours = 24) => {
  if (!report) return true;
  const now = Date.now();
  if (report.expires_at) {
    const expiresAt = new Date(report.expires_at).getTime();
    return now > expiresAt;
  }
  if (report.created_at) {
    const createdAt = new Date(report.created_at).getTime();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    return now - createdAt > maxAgeMs;
  }
  return false;
};

export const filterNonExpiredReports = (reports, maxAgeHours = 24) => {
  if (!Array.isArray(reports)) return [];
  return reports.filter((r) => !isReportExpired(r, maxAgeHours));
};

/** BE dùng `content`; giữ `description` cho tương thích cũ. */
export const getReportContent = (report) => {
  if (!report) return '';
  const raw = report.content ?? report.description;
  return typeof raw === 'string' ? raw.trim() : '';
};

/**
 * Danh sách URL ảnh hiển thị — khớp checklist BE:
 * photo_urls (array / JSON) → ưu tiên; không có thì photo_url.
 */
export const getReportPhotoUrls = (report) => {
  if (!report) return [];

  const fromArray = parsePhotoUrlsField(report.photo_urls ?? report.photoUrls);
  const rawList =
    fromArray.length > 0
      ? fromArray
      : report.photo_url || report.photoUrl
        ? [String(report.photo_url || report.photoUrl).trim()]
        : [];

  const resolved = rawList.map((u) => resolveReportMediaUrl(u)).filter(Boolean);
  return [...new Set(resolved)];
};
