import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';

/** Khớp BE + legacy FE */
const LS_ACCESS = 'authToken';
const LS_ACCESS_DOC = 'access_token';
const LS_REFRESH = 'refreshToken';
const LS_SESSION = 'sessionToken';
const LS_EXPIRES_IN = 'auth_expires_in';
const LS_ACCESS_EXPIRES_AT = 'auth_access_expires_at';
const LS_REFRESH_EXPIRES_AT = 'auth_refresh_expires_at';
const USER_KEY = 'user';

/**
 * Ưu tiên nơi đang có token (session trước nếu cả hai có — tránh trùng; login luôn xóa bên kia).
 */
export function getAuthStorage() {
  if (typeof window === 'undefined') return localStorage;
  const sess =
    sessionStorage.getItem(LS_REFRESH) ||
    sessionStorage.getItem(LS_ACCESS) ||
    sessionStorage.getItem(LS_ACCESS_DOC);
  const loc =
    localStorage.getItem(LS_REFRESH) ||
    localStorage.getItem(LS_ACCESS) ||
    localStorage.getItem(LS_ACCESS_DOC);
  if (sess) return sessionStorage;
  if (loc) return localStorage;
  return localStorage;
}

function clearAuthKeysIn(storage) {
  storage.removeItem(LS_ACCESS);
  storage.removeItem(LS_ACCESS_DOC);
  storage.removeItem(LS_REFRESH);
  storage.removeItem(LS_SESSION);
  storage.removeItem(LS_EXPIRES_IN);
  storage.removeItem(LS_ACCESS_EXPIRES_AT);
  storage.removeItem(LS_REFRESH_EXPIRES_AT);
  storage.removeItem(USER_KEY);
}

/** ISO string | unix s | unix ms */
function parseToMs(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }
  const s = String(value).trim();
  const n = Number(s);
  if (!Number.isNaN(n) && s === String(n)) {
    return n > 1e12 ? n : n * 1000;
  }
  const d = Date.parse(s);
  return Number.isNaN(d) ? null : d;
}

let proactiveTimerId = null;

function clearProactiveTimer() {
  if (proactiveTimerId != null && typeof window !== 'undefined') {
    window.clearTimeout(proactiveTimerId);
    proactiveTimerId = null;
  }
}

function scheduleProactiveRefresh() {
  clearProactiveTimer();
  if (typeof window === 'undefined') return;
  const exp = getAccessExpiresAtMs();
  if (exp == null) return;
  const leadMs = 60 * 1000;
  const delay = Math.max(5000, exp - Date.now() - leadMs);
  proactiveTimerId = window.setTimeout(() => {
    proactiveTimerId = null;
    refreshTokensViaApi().then((ok) => {
      if (ok) scheduleProactiveRefresh();
    });
  }, delay);
}

export function getAccessExpiresAtMs() {
  const raw = getAuthStorage().getItem(LS_ACCESS_EXPIRES_AT);
  if (!raw) return null;
  const t = Number(raw);
  return Number.isFinite(t) ? t : null;
}

export function isAccessExpired() {
  const exp = getAccessExpiresAtMs();
  if (exp == null) return false;
  return Date.now() >= exp;
}

/** Còn refresh_token + session_token và chưa quá refresh_expires_at (nếu BE có gửi). */
export function isRefreshSessionValid() {
  const s = getAuthStorage();
  const refresh = s.getItem(LS_REFRESH);
  const session = s.getItem(LS_SESSION);
  if (!refresh || !session) return false;
  const raw = s.getItem(LS_REFRESH_EXPIRES_AT);
  if (!raw) return true;
  const t = Number(raw);
  if (!Number.isFinite(t)) return true;
  return Date.now() < t;
}

export function getAccessToken() {
  const s = getAuthStorage();
  return s.getItem(LS_ACCESS) || s.getItem(LS_ACCESS_DOC);
}

/**
 * Lưu token sau login / refresh / register có JWT.
 * @param {object} data — access_token|token, refresh_token, session_token, expires_in?, refresh_expires_at?, user?
 * @param {boolean} [rememberMe=true] — false → sessionStorage (đóng tab mất phiên).
 */
export function persistAuthTokens(data, rememberMe = true) {
  if (!data || typeof data !== 'object') return;
  const storage = rememberMe ? localStorage : sessionStorage;
  clearAuthKeysIn(localStorage);
  clearAuthKeysIn(sessionStorage);

  const access = data.access_token || data.token;
  if (access) {
    storage.setItem(LS_ACCESS, access);
    storage.setItem(LS_ACCESS_DOC, access);
  }
  if (data.refresh_token) storage.setItem(LS_REFRESH, data.refresh_token);
  if (data.session_token) storage.setItem(LS_SESSION, data.session_token);
  if (data.user) storage.setItem(USER_KEY, JSON.stringify(data.user));

  const expiresInRaw = data.expires_in ?? data.expiresIn;
  if (expiresInRaw != null && Number.isFinite(Number(expiresInRaw))) {
    const sec = Number(expiresInRaw);
    storage.setItem(LS_EXPIRES_IN, String(sec));
    storage.setItem(LS_ACCESS_EXPIRES_AT, String(Date.now() + sec * 1000));
  } else {
    storage.removeItem(LS_EXPIRES_IN);
    const abs = data.access_expires_at ?? data.accessExpiresAt;
    const absMs = parseToMs(abs);
    if (absMs != null) storage.setItem(LS_ACCESS_EXPIRES_AT, String(absMs));
    else storage.removeItem(LS_ACCESS_EXPIRES_AT);
  }

  const refExp = data.refresh_expires_at ?? data.refreshExpiresAt;
  const refMs = parseToMs(refExp);
  if (refMs != null) storage.setItem(LS_REFRESH_EXPIRES_AT, String(refMs));
  else storage.removeItem(LS_REFRESH_EXPIRES_AT);

  clearProactiveTimer();
  scheduleProactiveRefresh();
}

export function clearAuthStorage() {
  clearProactiveTimer();
  clearAuthKeysIn(localStorage);
  clearAuthKeysIn(sessionStorage);
}

let refreshInFlight = null;

/**
 * POST /api/auth/refresh — dùng axios thuần (không qua apiClient) để tránh vòng interceptor.
 * Một promise chung khi nhiều chỗ gọi đồng thời (401 + timer).
 * @returns {Promise<boolean>} đã lấy và lưu access mới
 */
export async function refreshTokensViaApi() {
  if (refreshInFlight) return refreshInFlight;
  const s = getAuthStorage();
  const refresh = s.getItem(LS_REFRESH);
  const session = s.getItem(LS_SESSION);
  if (!refresh || !session) {
    return false;
  }
  if (!isRefreshSessionValid()) {
    return false;
  }

  const remember = s === localStorage;

  refreshInFlight = (async () => {
    try {
      const refreshRes = await axios.post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_REFRESH}`, {
        refresh_token: refresh,
        session_token: session
      });
      const payload = refreshRes.data;
      if (!payload?.success || !payload?.data) {
        return false;
      }
      persistAuthTokens(payload.data, remember);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Khi mở app: nếu còn trong refresh window → gọi refresh để có access mới (access ~30 phút).
 * Gọi một lần trước khi render route được bảo vệ.
 */
export async function bootstrapAuth() {
  if (typeof window === 'undefined') return;
  if (!isRefreshSessionValid()) {
    if (getAccessToken() || getAuthStorage().getItem(LS_REFRESH)) {
      clearAuthStorage();
    }
    return;
  }
  const hasAccess = Boolean(getAccessToken());
  if (!hasAccess || isAccessExpired()) {
    const ok = await refreshTokensViaApi();
    if (!ok) clearAuthStorage();
  } else {
    scheduleProactiveRefresh();
  }
}

export function setStoredUserJson(userObj) {
  if (!userObj) return;
  getAuthStorage().setItem(USER_KEY, JSON.stringify(userObj));
}
