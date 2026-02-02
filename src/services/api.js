import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS, DEFAULTS } from '../config/apiConfig';

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
          console.log('⚠️ Endpoint realtime không tồn tại, sử dụng endpoint cũ');
          // Gọi endpoint cũ
          response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.FLOOD_DATA}?t=${Date.now()}`);
        } else if (response.status === 200) {
          // Endpoint tồn tại
          endpointRef.current = 'realtime';
          isRealtimeEndpoint = true;
          console.log('✅ Sử dụng endpoint /api/v1/flood-data/realtime');
        }
      } catch (realtimeError) {
        // Nếu lỗi khác (network, 500, etc), fallback
        endpointRef.current = 'fallback';
        isRealtimeEndpoint = false;
        console.log('⚠️ Lỗi khi gọi endpoint mới, sử dụng endpoint cũ');
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
      console.log(`Dữ liệu đã tải (${isRealtimeEndpoint ? 'realtime' : 'fallback'}):`, normalizedData);
      return { success: true, data: normalizedData };
    } else {
      console.warn('Response không đúng định dạng:', response.data);
      return { success: false, data: [] };
    }
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Chi tiết lỗi:", error.response.data);
    } else if (error.request) {
      console.error("Không nhận được response từ server. Kiểm tra xem Backend đã chạy chưa?");
    } else {
      console.error("Lỗi:", error.message);
    }
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
    console.error("Lỗi gửi báo cáo:", error);
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
    console.error("Lỗi lấy danh sách báo cáo:", error);
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
    console.error("Lỗi lấy tất cả báo cáo:", error);
    return { 
      success: false, 
      data: [], 
      error 
    };
  }
};
