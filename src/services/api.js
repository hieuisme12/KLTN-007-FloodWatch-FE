import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS, DEFAULTS } from '../config/apiConfig';

/** Khóa localStorage — access JWT (alias key cũ authToken), refresh opaque, session UUID */
const LS_ACCESS = 'authToken';
const LS_REFRESH = 'refreshToken';
const LS_SESSION = 'sessionToken';

/**
 * Ghi đè token sau login / register / refresh (rotation: luôn cả access + refresh).
 * @param {object} data — từ BE: access_token | token, refresh_token, session_token, user?
 */
export function persistAuthTokens(data) {
  if (!data || typeof data !== 'object') return;
  const access = data.access_token || data.token;
  if (access) localStorage.setItem(LS_ACCESS, access);
  if (data.refresh_token) localStorage.setItem(LS_REFRESH, data.refresh_token);
  if (data.session_token) localStorage.setItem(LS_SESSION, data.session_token);
  if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
}

export function clearAuthStorage() {
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
  localStorage.removeItem(LS_SESSION);
  localStorage.removeItem('user');
}

/** Một promise refresh dùng chung — tránh nhiều request 401 gọi refresh song song */
let refreshPromise = null;

function attemptTokenRefresh() {
  if (refreshPromise) return refreshPromise;

  const refresh = localStorage.getItem(LS_REFRESH);
  const session = localStorage.getItem(LS_SESSION);

  if (!refresh || !session) {
    return Promise.reject(new Error('Missing refresh or session token'));
  }

  refreshPromise = axios
    .post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_REFRESH}`, {
      refresh_token: refresh,
      session_token: session
    })
    .then((res) => {
      const payload = res.data;
      if (payload?.success && payload?.data) {
        persistAuthTokens(payload.data);
        return payload.data;
      }
      throw new Error('Invalid refresh response');
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function isAuthEndpointNoRefresh(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/verify-otp') ||
    url.includes('/api/auth/send-otp') ||
    url.includes('/api/auth/resend-otp') ||
    url.includes('/api/auth/refresh')
  );
}

// Tạo axios instance với interceptor để tự động thêm token
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL
});

// Interceptor: Tự động thêm token vào header cho mọi request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(LS_ACCESS);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor: 401 → refresh (một lần) → retry; refresh/login/register path không retry refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    if (!response || response.status !== 401 || !config) {
      return Promise.reject(error);
    }

    if (isAuthEndpointNoRefresh(config.url || '')) {
      return Promise.reject(error);
    }

    if (config._authRetry) {
      clearAuthStorage();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    try {
      await attemptTokenRefresh();
      config._authRetry = true;
      const access = localStorage.getItem(LS_ACCESS);
      config.headers = config.headers || {};
      if (access) {
        config.headers.Authorization = `Bearer ${access}`;
      }
      return apiClient(config);
    } catch {
      clearAuthStorage();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  }
);

// Chuẩn hóa dữ liệu từ API
const normalizeFloodData = (data, isRealtimeEndpoint = false) => {
  return data.map(item => {
    const waterLevel = item.water_level || 0;
    const warningThreshold = item.warning_threshold || DEFAULTS.WARNING_THRESHOLD;
    const dangerThreshold = item.danger_threshold || DEFAULTS.DANGER_THRESHOLD;
    
    // Tính toán status nếu endpoint cũ không có
    let status = item.status;
    if (!status && isRealtimeEndpoint === false) {
      // Tính toán status từ water_level và thresholds
      if (waterLevel >= dangerThreshold) {
        status = 'danger';
      } else if (waterLevel >= warningThreshold) {
        status = 'warning';
      } else {
        status = 'normal';
      }
    }
    status = status || 'normal';

    // Tính toán velocity nếu không có (endpoint cũ)
    const velocity = item.velocity || 0;

    return {
      sensor_id: item.sensor_id,
      location_name: item.location_name || 'Vị trí không xác định',
      address: item.address || item.location_address || null,
      model: item.model || 'N/A',
      sensor_status: item.sensor_status || status,
      water_level: waterLevel,
      velocity: velocity,
      status: status, // normal/warning/danger/offline
      lng: item.lng || DEFAULTS.DEFAULT_LNG,
      lat: item.lat || DEFAULTS.DEFAULT_LAT,
      warning_threshold: warningThreshold,
      danger_threshold: dangerThreshold,
      last_data_time: item.last_data_time || item.created_at,
      created_at: item.created_at || new Date().toISOString(),
      temperature: item.temperature ?? null,
      humidity: item.humidity ?? null
    };
  });
};

// Fetch dữ liệu flood: ưu tiên /api/flood-data/realtime (có temperature, humidity), fallback nếu 404
export const fetchFloodData = async (endpointRef) => {
  const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
  const tryRealtime = (url) =>
    axios.get(`${url}?t=${Date.now()}`, { validateStatus: (s) => s < 500 });

  try {
    let response;
    let isRealtimeEndpoint = false;

    if (endpointRef.current === null) {
      try {
        response = await tryRealtime(base + API_ENDPOINTS.FLOOD_DATA_REALTIME);
        if (response.status === 200) {
          endpointRef.current = 'realtime';
          isRealtimeEndpoint = true;
        } else if (response.status === 404) {
          response = await tryRealtime(base + API_ENDPOINTS.FLOOD_DATA_REALTIME_V1);
          if (response.status === 200) {
            endpointRef.current = 'realtime_v1';
            isRealtimeEndpoint = true;
          } else {
            endpointRef.current = 'fallback';
            response = await axios.get(`${base}${API_ENDPOINTS.FLOOD_DATA}?t=${Date.now()}`);
          }
        } else {
          endpointRef.current = 'fallback';
          response = await axios.get(`${base}${API_ENDPOINTS.FLOOD_DATA}?t=${Date.now()}`);
        }
      } catch {
        endpointRef.current = 'fallback';
        response = await axios.get(`${base}${API_ENDPOINTS.FLOOD_DATA}?t=${Date.now()}`);
      }
    } else {
      const url =
        endpointRef.current === 'realtime'
          ? base + API_ENDPOINTS.FLOOD_DATA_REALTIME
          : endpointRef.current === 'realtime_v1'
            ? base + API_ENDPOINTS.FLOOD_DATA_REALTIME_V1
            : base + API_ENDPOINTS.FLOOD_DATA;
      isRealtimeEndpoint = endpointRef.current === 'realtime' || endpointRef.current === 'realtime_v1';
      response = await axios.get(`${url}?t=${Date.now()}`);
    }

    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      const normalizedData = normalizeFloodData(response.data.data, isRealtimeEndpoint);
      return { success: true, data: normalizedData };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { success: false, data: null, error };
  }
};

// ==================== CROWDSOURCING APIs ====================

/**
 * Upload ảnh báo cáo. BE trả { success, url, filename }. url dạng /uploads/xxx.jpg → ghép BASE_URL làm photo_url.
 * multipart/form-data, field name: image
 */
export const uploadReportImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post(API_ENDPOINTS.UPLOAD_REPORT_IMAGE, formData);
    if (response.data && response.data.success && response.data.url) {
      const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
      const photoUrl = response.data.url.startsWith('http') ? response.data.url : base + (response.data.url.startsWith('/') ? response.data.url : '/' + response.data.url);
      return { success: true, photo_url: photoUrl };
    }
    return { success: false, error: response.data?.error || 'Upload thất bại' };
  } catch (err) {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message;
    return { success: false, error: msg || 'Tải ảnh lên thất bại' };
  }
};

// Gửi báo cáo ngập. BE: 400 khi không có sensor trong 500m → error "Hiện tại khu vực chưa có máy đo, không thể xác thực"
export const submitFloodReport = async (reportData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.REPORT_FLOOD, reportData);
    if (response.data && response.data.success) {
      return {
        success: true,
        data: response.data.data || null,
        message: response.data.message || 'Báo cáo đã được gửi thành công'
      };
    }
    return {
      success: false,
      error: response.data?.error || 'Có lỗi xảy ra'
    };
  } catch (error) {
    const errMsg = error.response?.data?.error || error.response?.data?.message;
    if (error.response?.status === 400 && errMsg) {
      return { success: false, error: errMsg };
    }
    return {
      success: false,
      error: errMsg || (error.request ? 'Không thể kết nối đến server' : error.message || 'Có lỗi xảy ra')
    };
  }
};

// Lấy danh sách báo cáo từ người dân (24h qua)
// Public endpoint - không cần auth
export const fetchCrowdReports = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    // Dùng endpoint public /api/crowd-reports (24h) - không cần auth
    const response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.CROWD_REPORTS}${queryString ? `?${queryString}` : ''}`);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data || [] 
      };
    } else {
      return { 
        success: false, 
        data: [] 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      data: [], 
      error: error.response?.data || error.message
    };
  }
};

const normalizeFusionCrowdPoint = (p) => {
  if (!p || typeof p !== 'object') return null;
  const lat = p.lat ?? p.latitude;
  const lng = p.lng ?? p.longitude;
  if (lat == null || lng == null) return null;
  return {
    ...p,
    lat: Number(lat),
    lng: Number(lng),
    crowd_only_cm: p.crowd_only_cm != null ? Number(p.crowd_only_cm) : null,
    fused_cm: p.fused_cm != null ? Number(p.fused_cm) : null,
    coverage: p.coverage,
    nearest_sensor: p.nearest_sensor ?? p.nearestSensor,
    weights: p.weights
  };
};

/**
 * Điểm trộn sensor–crowd (public). Query: crowd_hours, sensor_hours, include_sensors, bbox min_lng…
 */
export const fetchFusionPoints = async (params = {}) => {
  try {
    const defaults = {
      crowd_hours: 24,
      sensor_hours: 1,
      include_sensors: 'false'
    };
    const merged = { ...defaults, ...params };
    const usp = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
    });
    const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.FUSION_POINTS}?${usp}`;
    const response = await axios.get(url, { timeout: API_CONFIG.TIMEOUT });
    if (response.data && response.data.success) {
      const raw = response.data.data || {};
      const crowdRaw = Array.isArray(raw.crowd) ? raw.crowd : [];
      const crowd = crowdRaw.map(normalizeFusionCrowdPoint).filter(Boolean);
      const sensors = Array.isArray(raw.sensors) ? raw.sensors : [];
      return {
        success: true,
        data: { ...raw, crowd, sensors }
      };
    }
    return {
      success: false,
      data: { crowd: [], sensors: [] },
      error: response.data?.error || response.data?.message
    };
  } catch (error) {
    const err = error.response?.data?.error || error.response?.data?.message;
    return {
      success: false,
      data: { crowd: [], sensors: [] },
      error: err || error.message
    };
  }
};

/**
 * Dự báo ngắn hạn theo trạm (public). Query: horizon (phút), sample_minutes
 */
export const fetchForecastForSensor = async (sensorId, params = {}) => {
  try {
    const path = API_ENDPOINTS.FORECAST_SENSOR.replace(':sensorId', encodeURIComponent(sensorId));
    const merged = { horizon: 60, sample_minutes: 90, ...params };
    const usp = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
    });
    const url = `${API_CONFIG.BASE_URL}${path}?${usp}`;
    const response = await axios.get(url, { timeout: API_CONFIG.TIMEOUT });
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || null };
    }
    return {
      success: false,
      data: null,
      error: response.data?.error || response.data?.message
    };
  } catch (error) {
    const status = error.response?.status;
    return {
      success: false,
      data: null,
      status,
      error: error.response?.data?.error || error.response?.data?.message || error.message
    };
  }
};

/**
 * Thời tiết TP.HCM (Open-Meteo qua BE). Query: forecast_days, lat, lon
 */
export const fetchWeatherHcm = async (params = {}) => {
  try {
    const merged = { forecast_days: 3, ...params };
    const usp = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
    });
    const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.WEATHER_HCM}?${usp}`;
    const response = await axios.get(url, { timeout: 20000 });
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || null };
    }
    return {
      success: false,
      data: null,
      error: response.data?.error || response.data?.message
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.response?.data?.error || error.response?.data?.message || error.message
    };
  }
};

// Lấy tất cả báo cáo (không giới hạn thời gian)
export const fetchAllCrowdReports = async (params = {}) => {
  try {
    const queryParams = { limit: 100, ...params };
    const queryString = new URLSearchParams(queryParams).toString();
    // Dùng apiClient để tự động thêm token (cần thiết để backend biết user nào đang request)
    const response = await apiClient.get(`${API_ENDPOINTS.CROWD_REPORTS_ALL}?${queryString}`);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data || [] 
      };
    } else {
      return { 
        success: false, 
        data: [] 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      data: [], 
      error: error.response?.data || error.message
    };
  }
};

// Authentication APIs
export const login = async (username, password) => {
  try {
    const response = await axios.post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_LOGIN}`, {
      username,
      password
    });

    if (response.data && response.data.success) {
      persistAuthTokens(response.data.data);
      return {
        success: true,
        data: response.data.data
      };
    }
    return {
      success: false,
      error: response.data?.error || 'Đăng nhập thất bại'
    };
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    if (status === 403) {
      return {
        success: false,
        needsEmailVerification: true,
        error:
          data?.error ||
          'Vui lòng xác minh email (mã OTP) trước khi đăng nhập'
      };
    }
    if (status === 401) {
      return {
        success: false,
        error: data?.error || 'Sai tên đăng nhập hoặc mật khẩu'
      };
    }
    return {
      success: false,
      error: data?.error || error.message
    };
  }
};

/**
 * Đăng ký — BE 201 chỉ trả user, không JWT. Sau đó FE chuyển bước verify-otp.
 */
export const register = async (userData) => {
  try {
    const payload = {
      ...userData,
      email:
        typeof userData.email === 'string'
          ? userData.email.trim().toLowerCase()
          : userData.email
    };
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_REGISTER}`,
      payload
    );

    if (response.data?.success && response.data?.data) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    }
    return {
      success: false,
      error: response.data?.error || 'Đăng ký thất bại'
    };
  } catch (error) {
    const data = error.response?.data;
    return {
      success: false,
      error: data?.error || data?.message || error.message
    };
  }
};

/**
 * Xác minh OTP sau đăng ký (hoặc purpose khác do BE trả về).
 */
export const verifyOtp = async (email, otpCode) => {
  try {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_VERIFY_OTP}`,
      {
        email: String(email).trim().toLowerCase(),
        otp_code: String(otpCode).trim()
      }
    );

    if (response.data?.success && response.data?.data) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    }
    return {
      success: false,
      error: response.data?.error || 'Xác minh thất bại'
    };
  } catch (error) {
    const data = error.response?.data;
    return {
      success: false,
      error: data?.error || error.message
    };
  }
};

/** Gửi OTP lần đầu (email đã tồn tại trong hệ thống). */
export const sendOtp = async (email) => {
  try {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_SEND_OTP}`,
      { email: String(email).trim().toLowerCase() }
    );

    if (response.data?.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    }
    return {
      success: false,
      error: response.data?.error || 'Không gửi được mã OTP'
    };
  } catch (error) {
    const data = error.response?.data;
    return {
      success: false,
      error: data?.error || error.message
    };
  }
};

/** Gửi lại OTP (cùng logic giới hạn với send-otp). */
export const resendOtp = async (email) => {
  try {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_RESEND_OTP}`,
      { email: String(email).trim().toLowerCase() }
    );

    if (response.data?.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    }
    return {
      success: false,
      error: response.data?.error || 'Không gửi lại được mã OTP'
    };
  } catch (error) {
    const data = error.response?.data;
    return {
      success: false,
      error: data?.error || error.message
    };
  }
};

/**
 * Gửi tọa độ hiện tại lên BE (sau khi có quyền Geolocation). Cần Bearer JWT.
 * Body: { lat, lng, accuracy_m? }
 */
export const postAuthLocation = async ({ lat, lng, accuracy_m }) => {
  try {
    const body = {
      lat: Number(lat),
      lng: Number(lng)
    };
    if (accuracy_m != null && !Number.isNaN(Number(accuracy_m))) {
      body.accuracy_m = Number(accuracy_m);
    }
    const response = await apiClient.post(API_ENDPOINTS.AUTH_LOCATION, body);
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data };
    }
    return {
      success: false,
      error: response.data?.error || response.data?.message || 'Không lưu được vị trí'
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.response?.data?.message || error.message
    };
  }
};

export const getProfile = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.AUTH_PROFILE);
    
    if (response.data && response.data.success) {
      // Cập nhật thông tin user trong localStorage
      if (response.data.data) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }
      return { 
        success: true, 
        data: response.data.data 
      };
    } else {
      return { 
        success: false, 
        error: response.data.error || 'Không thể lấy thông tin người dùng' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy danh sách icon ảnh đại diện có sẵn (cần đăng nhập).
 * @returns {{ success: boolean, data?: Array<{ name: string, url: string }>, error?: string }}
 */
export const getProfileIcons = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.AUTH_PROFILE_ICONS);
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return { success: true, data: response.data.data };
    }
    return { success: false, error: response.data?.error || 'Không thể tải danh sách ảnh đại diện' };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
};

export const updateProfile = async (profileData) => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.AUTH_PROFILE, profileData);
    
    if (response.data && response.data.success) {
      // Cập nhật thông tin user trong localStorage và báo cho UI (sidebar, header) cập nhật realtime
      if (response.data.data) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
        window.dispatchEvent(new CustomEvent('user-updated'));
      }
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message || 'Cập nhật profile thành công'
      };
    } else {
      return { 
        success: false, 
        error: response.data.error || 'Cập nhật profile thất bại' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

export const changePassword = async (oldPassword, newPassword) => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.AUTH_CHANGE_PASSWORD, {
      old_password: oldPassword,
      new_password: newPassword
    });
    
    if (response.data && response.data.success) {
      // BE revoke toàn bộ phiên — xóa token, bắt đăng nhập lại
      clearAuthStorage();
      return { 
        success: true, 
        message: response.data.message || 'Đổi mật khẩu thành công',
        requiresReLogin: true
      };
    } else {
      return { 
        success: false, 
        error: response.data.error || 'Đổi mật khẩu thất bại' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

export const logout = async () => {
  const token = localStorage.getItem(LS_ACCESS);
  if (token) {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH_LOGOUT);
    } catch {
      // Vẫn xóa local dù BE lỗi / 401
    }
  }
  clearAuthStorage();
};

// Re-export auth helpers from utils/auth.js for backward compatibility
export { getCurrentUser, isAuthenticated } from '../utils/auth';

// ==================== SENSOR MANAGEMENT APIs ====================

/**
 * Lấy tất cả sensors
 * @param {Object} params - Query parameters (is_active, status, hardware_type)
 */
export const fetchSensors = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${API_ENDPOINTS.SENSORS}${queryString ? `?${queryString}` : ''}`);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { 
      success: false, 
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy thông tin sensor theo ID
 */
export const fetchSensorById = async (sensorId) => {
  try {
    const endpoint = API_ENDPOINTS.SENSOR_BY_ID.replace(':sensorId', sensorId);
    const response = await apiClient.get(endpoint);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data };
    }
    return { success: false, error: response.data?.error || 'Không tìm thấy sensor' };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy lịch sử sensor
 */
export const fetchSensorHistory = async (sensorId, limit = 100) => {
  try {
    const endpoint = API_ENDPOINTS.SENSOR_HISTORY.replace(':sensorId', sensorId);
    const response = await apiClient.get(`${endpoint}?limit=${limit}`);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { 
      success: false, 
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Tạo sensor mới (Admin only)
 */
export const createSensor = async (sensorData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.SENSORS, sensorData);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message || 'Tạo sensor thành công'
      };
    }
    return { 
      success: false, 
      error: response.data?.error || 'Tạo sensor thất bại'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Cập nhật sensor (Admin only)
 */
export const updateSensor = async (sensorId, sensorData) => {
  try {
    const endpoint = API_ENDPOINTS.SENSOR_BY_ID.replace(':sensorId', sensorId);
    const response = await apiClient.put(endpoint, sensorData);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message || 'Cập nhật sensor thành công'
      };
    }
    return { 
      success: false, 
      error: response.data?.error || 'Cập nhật sensor thất bại'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Cập nhật ngưỡng báo động (Admin only)
 */
export const updateSensorThresholds = async (sensorId, thresholds) => {
  try {
    const endpoint = API_ENDPOINTS.SENSOR_THRESHOLDS.replace(':sensorId', sensorId);
    const response = await apiClient.put(endpoint, thresholds);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message || 'Cập nhật ngưỡng thành công'
      };
    }
    return { 
      success: false, 
      error: response.data?.error || 'Cập nhật ngưỡng thất bại'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Xóa sensor (Admin only)
 */
export const deleteSensor = async (sensorId) => {
  try {
    const endpoint = API_ENDPOINTS.SENSOR_BY_ID.replace(':sensorId', sensorId);
    const response = await apiClient.delete(endpoint);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        message: response.data.message || 'Xóa sensor thành công'
      };
    }
    return { 
      success: false, 
      error: response.data?.error || 'Xóa sensor thất bại'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

// ==================== REPORT MODERATION APIs (Moderator/Admin) ====================

/**
 * Danh sách toàn bộ báo cáo (admin/moderator). GET /api/reports/all
 * Response items có thể gồm confidence, confidence_breakdown.
 */
export const fetchAllReportsAdmin = async (params = {}) => {
  try {
    const queryParams = { limit: 500, ...params };
    const queryString = new URLSearchParams(
      Object.fromEntries(Object.entries(queryParams).filter(([, v]) => v != null && v !== ''))
    ).toString();
    const response = await apiClient.get(`${API_ENDPOINTS.REPORTS_ALL}?${queryString}`);
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return {
      success: false,
      data: [],
      error: response.data?.error || response.data?.message
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error.response?.data?.error || error.response?.data?.message || error.message
    };
  }
};

/**
 * Lấy báo cáo cần kiểm duyệt
 */
export const fetchPendingReports = async (limit = 50) => {
  try {
    const response = await apiClient.get(`${API_ENDPOINTS.REPORTS_PENDING}?limit=${limit}`);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { 
      success: false, 
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Duyệt/Từ chối báo cáo
 */
export const moderateReport = async (reportId, action, rejectionReason = null) => {
  try {
    const endpoint = API_ENDPOINTS.REPORT_MODERATE.replace(':reportId', reportId);
    const payload = { action };
    if (action === 'reject' && rejectionReason) {
      payload.rejection_reason = rejectionReason;
    }
    
    const response = await apiClient.put(endpoint, payload);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message || `${action === 'approve' ? 'Duyệt' : 'Từ chối'} báo cáo thành công`
      };
    }
    return { 
      success: false, 
      error: response.data?.error || 'Thao tác thất bại'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy xếp hạng tin cậy reporter (moderator/admin)
 */
export const fetchReliabilityRanking = async (limit = 100) => {
  try {
    const response = await apiClient.get(`${API_ENDPOINTS.REPORTS_RELIABILITY_RANKING}?limit=${limit}`);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Gửi đánh giá báo cáo (rating 1-5). Cần đăng nhập.
 * POST /api/report-evaluations/:reportId
 */
export const submitReportEvaluation = async (reportId, rating, comment = null) => {
  try {
    const endpoint = API_ENDPOINTS.REPORT_EVALUATIONS.replace(':reportId', reportId);
    const body = { rating: Number(rating) };
    if (comment != null && String(comment).trim()) body.comment = String(comment).trim();
    const response = await apiClient.post(endpoint, body);
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data, message: response.data.message || 'Đánh giá thành công' };
    }
    return { success: false, error: response.data?.error || 'Gửi đánh giá thất bại' };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy danh sách đánh giá của một báo cáo (để kiểm tra user hiện tại đã đánh giá chưa).
 * GET /api/report-evaluations/:reportId
 */
export const getReportEvaluations = async (reportId) => {
  try {
    const endpoint = API_ENDPOINTS.REPORT_EVALUATIONS.replace(':reportId', reportId);
    const response = await apiClient.get(endpoint);
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return { success: true, data: response.data.data };
    }
    return { success: true, data: [] };
  } catch {
    return { success: false, data: [] };
  }
};

/**
 * Lấy điểm trung bình đánh giá của một báo cáo.
 * GET /api/report-evaluations/:reportId/average
 */
export const getReportEvaluationAverage = async (reportId) => {
  try {
    const endpoint = API_ENDPOINTS.REPORT_EVALUATIONS_AVERAGE.replace(':reportId', reportId);
    const response = await apiClient.get(endpoint);
    if (response.data && response.data.success && response.data.data != null) {
      const data = response.data.data;
      return { success: true, average: data.average ?? data.avg_rating ?? data.rating, count: data.count ?? 0 };
    }
    return { success: true, average: null, count: 0 };
  } catch {
    return { success: false, average: null, count: 0 };
  }
};

// ==================== STATS APIs ====================

/**
 * Lấy số user đang online – cho mọi người (admin, user, khách). Không cần đăng nhập.
 * GET /api/stats/online-users/count
 * Response: { success: true, data: { count: N } }
 */
export const getOnlineUsersCount = async () => {
  try {
    const response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.STATS_ONLINE_USERS_COUNT}`, {
      timeout: 5000,
      validateStatus: (status) => status === 200 || status === 404
    });
    if (response.status === 200 && response.data?.success && response.data.data) {
      const count = response.data.data.count ?? 0;
      return { success: true, count };
    }
    return { success: false, count: 0 };
  } catch {
    return { success: false, count: 0 };
  }
};

/**
 * Lấy lượt truy cập tháng (nếu BE có endpoint). Không cần token.
 * GET /api/stats/monthly-visits → { success: true, data: { count: N } } hoặc tương tự
 */
export const getMonthlyVisitsCount = async () => {
  try {
    const response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.STATS_MONTHLY_VISITS}`, {
      timeout: 5000,
      validateStatus: (status) => status === 200 || status === 404
    });
    if (response.status === 200 && response.data?.success && response.data.data != null) {
      const data = response.data.data;
      const count = data.count ?? data.monthlyVisits ?? 0;
      return { success: true, count };
    }
    return { success: false, count: 0 };
  } catch {
    return { success: false, count: 0 };
  }
};

/**
 * Lấy danh sách chi tiết user đang online (Admin only, cần JWT).
 * GET /api/stats/online-users
 * Response: { success: true, data: { online_users: [...], count: N } }
 */
export const getOnlineUsers = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.STATS_ONLINE_USERS, {
      timeout: 5000,
      validateStatus: (status) => status === 200 || status === 403
    });
    if (response.status === 200 && response.data?.success && response.data.data) {
      const data = response.data.data;
      const count = data.count ?? (Array.isArray(data.online_users) ? data.online_users.length : 0);
      return { success: true, count, online_users: data.online_users };
    }
    return { success: false, count: 0, online_users: [] };
  } catch {
    return { success: false, count: 0, online_users: [] };
  }
};

// ==================== REPORT EVALUATION APIs ====================

/**
 * Đánh giá báo cáo
 */
export const evaluateReport = async (reportId, rating, comment = '') => {
  try {
    const endpoint = API_ENDPOINTS.REPORT_EVALUATIONS.replace(':reportId', reportId);
    const response = await apiClient.post(endpoint, { rating, comment });
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message || 'Đánh giá thành công'
      };
    }
    return { 
      success: false, 
      error: response.data?.error || 'Đánh giá thất bại'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy đánh giá của báo cáo
 */
export const fetchReportEvaluations = async (reportId) => {
  try {
    const endpoint = API_ENDPOINTS.REPORT_EVALUATIONS.replace(':reportId', reportId);
    const response = await apiClient.get(endpoint);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { 
      success: false, 
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy điểm trung bình của báo cáo
 */
export const fetchReportAverageRating = async (reportId) => {
  try {
    const endpoint = API_ENDPOINTS.REPORT_EVALUATIONS_AVERAGE.replace(':reportId', reportId);
    const response = await apiClient.get(endpoint);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data };
    }
    return { success: false, data: null };
  } catch (error) {
    return { 
      success: false, 
      data: null,
      error: error.response?.data?.error || error.message
    };
  }
};

// ==================== ALERT APIs ====================

/**
 * Lấy tất cả alerts
 */
export const fetchAlerts = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${API_ENDPOINTS.ALERTS}${queryString ? `?${queryString}` : ''}`);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { 
      success: false, 
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy alerts đang active
 */
export const fetchActiveAlerts = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${API_ENDPOINTS.ALERTS_ACTIVE}${queryString ? `?${queryString}` : ''}`);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { 
      success: false, 
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Thống kê alerts
 */
export const fetchAlertStats = async (days = 7) => {
  try {
    const response = await apiClient.get(`${API_ENDPOINTS.ALERTS_STATS}?days=${days}`);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data };
    }
    return { success: false, data: null };
  } catch (error) {
    return { 
      success: false, 
      data: null,
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy alert theo ID
 */
export const fetchAlertById = async (alertId) => {
  try {
    const endpoint = API_ENDPOINTS.ALERT_BY_ID.replace(':alertId', alertId);
    const response = await apiClient.get(endpoint);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data };
    }
    return { success: false, error: response.data?.error || 'Không tìm thấy alert' };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Xác nhận alert
 */
export const acknowledgeAlert = async (alertId) => {
  try {
    const endpoint = API_ENDPOINTS.ALERT_ACKNOWLEDGE.replace(':alertId', alertId);
    const response = await apiClient.put(endpoint);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message || 'Xác nhận alert thành công'
      };
    }
    return { 
      success: false, 
      error: response.data?.error || 'Xác nhận alert thất bại'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Đánh dấu alert đã xử lý
 */
export const resolveAlert = async (alertId) => {
  try {
    const endpoint = API_ENDPOINTS.ALERT_RESOLVE.replace(':alertId', alertId);
    const response = await apiClient.put(endpoint);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message || 'Đánh dấu alert đã xử lý thành công'
      };
    }
    return { 
      success: false, 
      error: response.data?.error || 'Xử lý alert thất bại'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

// ==================== EMERGENCY SUBSCRIPTION APIs ====================

/**
 * Đăng ký nhận cảnh báo khẩn
 */
export const createEmergencySubscription = async (subscriptionData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.EMERGENCY_SUBSCRIPTIONS, subscriptionData);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message || 'Đăng ký cảnh báo thành công'
      };
    }
    return { 
      success: false, 
      error: response.data?.error || 'Đăng ký cảnh báo thất bại'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy subscriptions của user
 */
export const fetchMySubscriptions = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.EMERGENCY_SUBSCRIPTIONS_MY);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { 
      success: false, 
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Cập nhật subscription
 */
export const updateEmergencySubscription = async (subscriptionId, subscriptionData) => {
  try {
    const endpoint = API_ENDPOINTS.EMERGENCY_SUBSCRIPTION_BY_ID.replace(':subscriptionId', subscriptionId);
    const response = await apiClient.put(endpoint, subscriptionData);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message || 'Cập nhật subscription thành công'
      };
    }
    return { 
      success: false, 
      error: response.data?.error || 'Cập nhật subscription thất bại'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Xóa subscription
 */
export const deleteEmergencySubscription = async (subscriptionId) => {
  try {
    const endpoint = API_ENDPOINTS.EMERGENCY_SUBSCRIPTION_BY_ID.replace(':subscriptionId', subscriptionId);
    const response = await apiClient.delete(endpoint);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        message: response.data.message || 'Xóa subscription thành công'
      };
    }
    return { 
      success: false, 
      error: response.data?.error || 'Xóa subscription thất bại'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

// ==================== HEATMAP APIs ====================

/**
 * Lấy dữ liệu heatmap từ sensors
 */
export const fetchHeatmap = async (params) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.HEATMAP}?${queryString}`);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { 
      success: false, 
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy heatmap kết hợp (Sensors + Crowd Reports)
 */
export const fetchCombinedHeatmap = async (params) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.HEATMAP_COMBINED}?${queryString}`);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { 
      success: false, 
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

// ==================== OTA UPDATE APIs (Admin only) ====================

/**
 * Tạo OTA update
 */
export const createOTAUpdate = async (otaData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.OTA, otaData);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message || 'Tạo OTA update thành công'
      };
    }
    return { 
      success: false, 
      error: response.data?.error || 'Tạo OTA update thất bại'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy OTA updates đang pending
 */
export const fetchPendingOTAUpdates = async (limit = 50) => {
  try {
    const response = await apiClient.get(`${API_ENDPOINTS.OTA_PENDING}?limit=${limit}`);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { 
      success: false, 
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy OTA updates theo sensor
 */
export const fetchSensorOTAUpdates = async (sensorId) => {
  try {
    const endpoint = API_ENDPOINTS.OTA_SENSOR.replace(':sensorId', sensorId);
    const response = await apiClient.get(endpoint);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { 
      success: false, 
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

// ==================== ENERGY MONITORING APIs ====================

/**
 * Lấy energy logs theo sensor
 */
export const fetchEnergyLogs = async (sensorId, limit = 100) => {
  try {
    const endpoint = API_ENDPOINTS.ENERGY_SENSOR.replace(':sensorId', sensorId);
    const response = await apiClient.get(`${endpoint}?limit=${limit}`);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { 
      success: false, 
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy energy log mới nhất
 */
export const fetchLatestEnergyLog = async (sensorId) => {
  try {
    const endpoint = API_ENDPOINTS.ENERGY_SENSOR_LATEST.replace(':sensorId', sensorId);
    const response = await apiClient.get(endpoint);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data };
    }
    return { success: false, data: null };
  } catch (error) {
    return { 
      success: false, 
      data: null,
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Thống kê năng lượng
 */
export const fetchEnergyStats = async (sensorId, hours = 24) => {
  try {
    const endpoint = API_ENDPOINTS.ENERGY_SENSOR_STATS.replace(':sensorId', sensorId);
    const response = await apiClient.get(`${endpoint}?hours=${hours}`);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data };
    }
    return { success: false, data: null };
  } catch (error) {
    return { 
      success: false, 
      data: null,
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Lấy sensors có pin thấp (Admin only)
 */
export const fetchLowBatterySensors = async (threshold = 20) => {
  try {
    const response = await apiClient.get(`${API_ENDPOINTS.ENERGY_LOW_BATTERY}?threshold=${threshold}`);
    
    if (response.data && response.data.success) {
      return { success: true, data: response.data.data || [] };
    }
    return { success: false, data: [] };
  } catch (error) {
    return { 
      success: false, 
      data: [],
      error: error.response?.data?.error || error.message
    };
  }
};

