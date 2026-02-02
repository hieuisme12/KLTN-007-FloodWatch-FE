import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS, DEFAULTS } from '../config/apiConfig';

// Tạo axios instance với interceptor để tự động thêm token
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL
});

// Interceptor: Tự động thêm token vào header cho mọi request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor: Xử lý lỗi 401 (token hết hạn) - tự động logout
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      // Redirect to login nếu cần
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
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
      created_at: item.created_at || new Date().toISOString()
    };
  });
};

// Fetch dữ liệu flood với fallback endpoint
export const fetchFloodData = async (endpointRef) => {
  try {
    let response;
    let isRealtimeEndpoint = false;

    // Nếu chưa xác định endpoint nào hoạt động, thử endpoint mới trước
    if (endpointRef.current === null) {
      try {
        // Thử endpoint mới với validateStatus để không throw 404
        response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.FLOOD_DATA_REALTIME}?t=${Date.now()}`, {
          validateStatus: (status) => status < 500 // Chỉ throw nếu >= 500
        });
        
        // Kiểm tra status code
        if (response.status === 404) {
          // Endpoint không tồn tại, fallback
          endpointRef.current = 'fallback';
          isRealtimeEndpoint = false;
          // Gọi endpoint cũ
          response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.FLOOD_DATA}?t=${Date.now()}`);
        } else if (response.status === 200) {
          // Endpoint tồn tại
          endpointRef.current = 'realtime';
          isRealtimeEndpoint = true;
        }
      } catch {
        endpointRef.current = 'fallback';
        isRealtimeEndpoint = false;
        // Gọi endpoint cũ
        response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.FLOOD_DATA}?t=${Date.now()}`);
      }
    } else {
      // Sử dụng endpoint đã xác định
      if (endpointRef.current === 'realtime') {
        response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.FLOOD_DATA_REALTIME}?t=${Date.now()}`);
        isRealtimeEndpoint = true;
      } else {
        response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.FLOOD_DATA}?t=${Date.now()}`);
        isRealtimeEndpoint = false;
      }
    }
    
    if (response.data && response.data.success && response.data.data) {
      const normalizedData = normalizeFloodData(response.data.data, isRealtimeEndpoint);
      return { success: true, data: normalizedData };
    } else {
      return { success: false, data: [] };
    }
  } catch (error) {
    return { success: false, data: null, error };
  }
};

// ==================== CROWDSOURCING APIs ====================

// Gửi báo cáo ngập từ người dùng
export const submitFloodReport = async (reportData) => {
  try {
    const response = await axios.post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.REPORT_FLOOD}`, reportData);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data || null,
        message: response.data.message || 'Báo cáo đã được gửi thành công'
      };
    } else {
      return { 
        success: false, 
        error: response.data?.error || 'Có lỗi xảy ra' 
      };
    }
  } catch (error) {
    if (error.response) {
      return { 
        success: false, 
        error: error.response.data?.error || 'Có lỗi xảy ra' 
      };
    } else if (error.request) {
      return { 
        success: false, 
        error: 'Không thể kết nối đến server' 
      };
    } else {
      return { 
        success: false, 
        error: error.message || 'Có lỗi xảy ra' 
      };
    }
  }
};

// Lấy danh sách báo cáo từ người dân (24h qua)
export const fetchCrowdReports = async () => {
  try {
    const response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.CROWD_REPORTS}`);
    
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
      error 
    };
  }
};

// Lấy tất cả báo cáo (không giới hạn thời gian)
export const fetchAllCrowdReports = async (limit = 100) => {
  try {
    const response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.CROWD_REPORTS_ALL}?limit=${limit}`);
    
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
      error 
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
      // Lưu thông tin user và token vào localStorage
      if (response.data.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      if (response.data.data.token) {
        localStorage.setItem('authToken', response.data.data.token);
      }
      return { 
        success: true, 
        data: response.data.data 
      };
    } else {
      return { 
        success: false, 
        error: response.data.error || 'Đăng nhập thất bại' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
    };
  }
};

export const register = async (userData) => {
  try {
    const response = await axios.post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_REGISTER}`, userData);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data 
      };
    } else {
      return { 
        success: false, 
        error: response.data.error || 'Đăng ký thất bại' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message
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

export const updateProfile = async (profileData) => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.AUTH_PROFILE, profileData);
    
    if (response.data && response.data.success) {
      // Cập nhật thông tin user trong localStorage
      if (response.data.data) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
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
      return { 
        success: true, 
        message: response.data.message || 'Đổi mật khẩu thành công'
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

export const logout = () => {
  // Xóa thông tin user và token khỏi localStorage
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = () => {
  // Kiểm tra xem có thông tin user trong localStorage không
  return !!localStorage.getItem('user');
};

