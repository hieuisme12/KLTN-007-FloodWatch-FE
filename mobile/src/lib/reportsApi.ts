import axios from 'axios';
import { API_ENDPOINTS } from '@hcm-flood/shared';
import { apiClient } from './api';
import { getAuthHeaderRecord } from './authHeaders';
import { API_BASE_URL } from './config';
import { getReportContent, getReportPhotoUrls } from './mediaUrl';
import { FLOOD_LEVEL_COLORS } from './floodLevels';

export { FLOOD_LEVEL_COLORS, getFloodLevelLabel } from './floodLevels';

export type ModerationStatus = 'pending' | 'approved' | 'rejected' | string;

export type CrowdReport = {
  id: number | string;
  lat: number;
  lng: number;
  flood_level?: string;
  content?: string;
  description?: string;
  reporter_name?: string;
  moderation_status?: ModerationStatus;
  moderated_by_name?: string | null;
  moderated_at?: string | null;
  rejection_reason?: string | null;
  photo_url?: string;
  photo_urls?: string[] | string;
  location_description?: string;
  confidence?: number;
  verified_by_sensor?: boolean;
  created_at?: string;
};

export { getReportContent, getReportPhotoUrls };

function normalizeReport(raw: Record<string, unknown>): CrowdReport | null {
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: (raw.id as number | string) ?? `${lat},${lng}`,
    lat,
    lng,
    flood_level: raw.flood_level as string | undefined,
    content: raw.content as string | undefined,
    description: raw.description as string | undefined,
    reporter_name: raw.reporter_name as string | undefined,
    moderation_status: raw.moderation_status as ModerationStatus | undefined,
    moderated_by_name: raw.moderated_by_name as string | null | undefined,
    moderated_at: raw.moderated_at as string | null | undefined,
    rejection_reason: raw.rejection_reason as string | null | undefined,
    photo_url: raw.photo_url as string | undefined,
    photo_urls: raw.photo_urls as string[] | string | undefined,
    location_description: raw.location_description as string | undefined,
    confidence: raw.confidence != null ? Number(raw.confidence) : undefined,
    verified_by_sensor: Boolean(raw.verified_by_sensor),
    created_at: raw.created_at as string | undefined
  };
}

/** Danh sách đầy đủ (JWT). Fallback endpoint công khai nếu 401. */
export async function fetchAllReports(): Promise<CrowdReport[]> {
  try {
    const { data } = await apiClient.get(API_ENDPOINTS.CROWD_REPORTS_ALL);
    const rows = data?.success && Array.isArray(data.data) ? data.data : [];
    return rows
      .map((r: Record<string, unknown>) => normalizeReport(r))
      .filter(Boolean) as CrowdReport[];
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 401) {
      try {
        // Public fallback: gọi thẳng bằng axios để không phụ thuộc auth/cookie hiện tại.
        const { data } = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.CROWD_REPORTS}`, {
          params: { moderation_status: 'approved' },
          withCredentials: false
        });
        const rows = data?.success && Array.isArray(data.data) ? data.data : [];
        return rows
          .map((r: Record<string, unknown>) => normalizeReport(r))
          .filter(Boolean) as CrowdReport[];
      } catch {
        return [];
      }
    }
    throw e;
  }
}

export function formatReportDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN');
}

/** Meta dòng người báo: "20:25 · 28/5/2026" */
export function formatReportListTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const time = d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const date = d.toLocaleDateString('vi-VN');
  return `${time} · ${date}`;
}

export const MODERATION_LABELS: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối'
};

export const MODERATION_COLORS: Record<string, string> = {
  pending: '#b45309',
  approved: '#047857',
  rejected: '#b91c1c'
};

const REPORT_FLOOD_PATH = '/api/report-flood';
const UPLOAD_REPORT_IMAGE_PATH = '/api/upload/report-image';

export type SubmitFloodReportPayload = {
  level: string;
  lat: number;
  lng: number;
  content?: string;
  location_description?: string;
  photo_url?: string;
  photo_urls?: string[];
  name?: string;
};

export type SubmitFloodReportResult =
  | { success: true; data: unknown; message?: string }
  | { success: false; error: string; status?: number };

export async function uploadReportImage(
  uri: string,
  mimeType = 'image/jpeg'
): Promise<{ success: true; photo_url: string } | { success: false; error: string }> {
  try {
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: mimeType,
      name: `report-${Date.now()}.jpg`
    } as unknown as Blob);

    const authHeaders = await getAuthHeaderRecord();
    const { data } = await apiClient.post(UPLOAD_REPORT_IMAGE_PATH, formData, {
      headers: authHeaders
    });

    const absoluteRaw =
      typeof data?.absolute_url === 'string' ? data.absolute_url.trim() : '';
    const urlRaw = typeof data?.url === 'string' ? data.url.trim() : '';
    const photoUrl = absoluteRaw || urlRaw;
    if (data?.success && photoUrl) {
      return { success: true, photo_url: photoUrl };
    }
    return { success: false, error: data?.error || 'Tải ảnh thất bại' };
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const msg = e.response?.data?.error || e.response?.data?.message;
      return { success: false, error: msg || 'Tải ảnh thất bại' };
    }
    return { success: false, error: 'Tải ảnh thất bại' };
  }
}

export async function submitFloodReport(
  payload: SubmitFloodReportPayload
): Promise<SubmitFloodReportResult> {
  try {
    const authHeaders = await getAuthHeaderRecord();
    const { data } = await apiClient.post(REPORT_FLOOD_PATH, payload, {
      headers: authHeaders
    });
    if (data?.success) {
      return {
        success: true,
        data: data.data ?? null,
        message: data.message || 'Báo cáo đã được gửi thành công'
      };
    }
    return { success: false, error: data?.error || 'Có lỗi xảy ra' };
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const status = e.response?.status;
      const errMsg = e.response?.data?.error || e.response?.data?.message;
      if (status === 400 && errMsg) return { success: false, error: errMsg, status };
      if (status === 429) {
        return {
          success: false,
          error: errMsg || 'Bạn gửi quá nhiều báo cáo. Vui lòng thử lại sau.',
          status
        };
      }
      return {
        success: false,
        error: errMsg || 'Không thể kết nối đến server',
        status
      };
    }
    return { success: false, error: 'Có lỗi xảy ra' };
  }
}
