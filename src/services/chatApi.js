import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';
import { getAccessToken } from '../utils/authSession';
import { normalizeChatText } from '../utils/chatMessageFormat';

const chatClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
});

chatClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * @param {{ message: string, history?: Array<{ role: 'user'|'model', content: string }>, account_id?: string, area?: string }} payload
 */
export async function postChatMessage(payload) {
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (!message) {
    return { success: false, error: 'Tin nhắn trống', status: 400 };
  }
  if (message.length > 2000) {
    return { success: false, error: 'Tin nhắn quá dài (tối đa 2000 ký tự)', status: 400 };
  }

  const history = Array.isArray(payload.history)
    ? payload.history
        .filter((m) => m && (m.role === 'user' || m.role === 'model') && typeof m.content === 'string')
        .slice(-50)
        .map((m) => ({ role: m.role, content: m.content.trim() }))
        .filter((m) => m.content)
    : [];

  try {
    const { data, status } = await chatClient.post(API_ENDPOINTS.CHAT, {
      message,
      history,
      account_id: payload.account_id,
      ...(payload.area ? { area: payload.area } : {})
    });

    if (data?.success && typeof data.reply === 'string') {
      return {
        success: true,
        reply: normalizeChatText(data.reply),
        timestamp: data.timestamp,
        meta: data.meta ?? null
      };
    }

    return {
      success: false,
      error: data?.error || data?.message || 'Chat thất bại',
      status
    };
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data;
    const error =
      body?.error ||
      body?.message ||
      (status === 429
        ? 'Quá nhiều câu hỏi, thử lại sau 1 phút.'
        : status === 503
          ? 'Chat AI tạm tắt, vui lòng xem bản đồ realtime.'
          : status === 502
            ? 'Lỗi dịch vụ AI, thử lại sau.'
            : err.message || 'Không kết nối được server.');
    return { success: false, error, status };
  }
}

/**
 * @param {{ area?: string, limit?: number }} params
 */
export async function fetchFloodStatusSnapshot(params = {}) {
  try {
    const { data } = await chatClient.get(API_ENDPOINTS.FLOOD_STATUS, {
      params: {
        limit: params.limit ?? 50,
        ...(params.area ? { area: params.area } : {})
      }
    });
    if (data?.success && Array.isArray(data.data)) {
      return { success: true, data: data.data, count: data.count ?? data.data.length };
    }
    return { success: false, data: [] };
  } catch {
    return { success: false, data: [] };
  }
}

/**
 * Xác nhận gửi báo cáo từ nháp chat (meta.report_draft khi ready: true).
 * @param {{ level: string, lat: number, lng: number, location_description?: string, content?: string, name?: string, photo_url?: string, photo_urls?: string[] }} body
 */
export async function confirmChatReport(body) {
  const level = typeof body.level === 'string' ? body.level.trim() : '';
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!['Nhẹ', 'Trung bình', 'Nặng'].includes(level)) {
    return { success: false, error: 'Mức ngập không hợp lệ', status: 400 };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { success: false, error: 'Thiếu tọa độ vị trí', status: 400 };
  }

  const payload = {
    level,
    lat,
    lng,
    ...(body.location_description
      ? { location_description: String(body.location_description).trim() }
      : {}),
    ...(body.content ? { content: String(body.content).trim().slice(0, 500) } : {}),
    ...(body.name ? { name: String(body.name).trim() } : {}),
    ...(body.photo_url ? { photo_url: body.photo_url } : {}),
    ...(Array.isArray(body.photo_urls) && body.photo_urls.length > 0
      ? { photo_urls: body.photo_urls }
      : {})
  };

  try {
    const { data, status } = await chatClient.post(API_ENDPOINTS.CHAT_CONFIRM_REPORT, payload);

    if (data?.success) {
      return {
        success: true,
        reply: normalizeChatText(data.reply || data.message || ''),
        data: data.data ?? null
      };
    }

    return {
      success: false,
      error: data?.error || data?.message || 'Không gửi được báo cáo',
      status
    };
  } catch (err) {
    const status = err.response?.status;
    const bodyErr = err.response?.data;
    const error =
      bodyErr?.error ||
      bodyErr?.message ||
      (status === 429
        ? 'Bạn gửi quá nhiều báo cáo. Vui lòng thử lại sau.'
        : status === 400
          ? bodyErr?.error || 'Dữ liệu báo cáo không hợp lệ.'
          : err.message || 'Không kết nối được server.');
    return { success: false, error, status };
  }
}

/** Top trạm theo mực nước (cm) — hiển thị khi mở chat. */
export async function fetchTopFloodStations(limit = 3) {
  const res = await fetchFloodStatusSnapshot({ limit: 50 });
  if (!res.success) return [];
  return [...res.data]
    .sort((a, b) => (Number(b.muc_nuoc_cm) || 0) - (Number(a.muc_nuoc_cm) || 0))
    .slice(0, limit);
}
