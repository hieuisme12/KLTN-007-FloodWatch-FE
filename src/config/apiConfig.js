// API Configuration
export const API_CONFIG = {
  // FE luôn ưu tiên gọi theo VITE_API_BASE_URL trong .env.
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://api.floodsight.id.vn',
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3
};

// API Endpoints
export const API_ENDPOINTS = {
  // Flood Data (realtime có temperature, humidity từ DHT22)
  FLOOD_DATA: '/api/v1/flood-data',
  FLOOD_DATA_REALTIME: '/api/flood-data/realtime',
  FLOOD_DATA_REALTIME_V1: '/api/v1/flood-data/realtime',
  /** Sensor–crowd fusion (bản đồ trộn) */
  FUSION_POINTS: '/api/v1/fusion/points',
  /** Dự báo mực nước ngắn hạn theo trạm */
  FORECAST_SENSOR: '/api/v1/forecast/sensor/:sensorId',
  /** Thời tiết Open-Meteo (TP.HCM) */
  WEATHER_HCM: '/api/v1/weather/hcm',
  SENSOR_HISTORY: '/api/sensors/:sensorId/history',
  
  // Sensors
  SENSORS: '/api/sensors',
  SENSOR_BY_ID: '/api/sensors/:sensorId',
  SENSOR_THRESHOLDS: '/api/sensors/:sensorId/thresholds',
  
  // Crowd Reports
  REPORT_FLOOD: '/api/report-flood',
  UPLOAD_REPORT_IMAGE: '/api/upload/report-image',
  CROWD_REPORTS: '/api/crowd-reports',
  CROWD_REPORTS_ALL: '/api/crowd-reports/all',
  
  // Report Moderation (Moderator/Admin)
  REPORTS_ALL: '/api/reports/all',
  REPORTS_PENDING: '/api/reports/pending',
  REPORT_MODERATE: '/api/reports/:reportId/moderate',
  REPORTS_RELIABILITY_RANKING: '/api/reports/reliability-ranking',
  
  // Report Evaluation
  REPORT_EVALUATIONS: '/api/report-evaluations/:reportId',
  REPORT_EVALUATIONS_AVERAGE: '/api/report-evaluations/:reportId/average',
  
  // Alerts
  ALERTS: '/api/alerts',
  ALERTS_ACTIVE: '/api/alerts/active',
  ALERTS_STATS: '/api/alerts/stats',
  ALERT_BY_ID: '/api/alerts/:alertId',
  ALERT_ACKNOWLEDGE: '/api/alerts/:alertId/acknowledge',
  ALERT_RESOLVE: '/api/alerts/:alertId/resolve',
  
  // Emergency Subscriptions
  EMERGENCY_SUBSCRIPTIONS: '/api/emergency-subscriptions',
  EMERGENCY_SUBSCRIPTIONS_MY: '/api/emergency-subscriptions/my-subscriptions',
  EMERGENCY_SUBSCRIPTION_BY_ID: '/api/emergency-subscriptions/:subscriptionId',
  
  // Heatmap
  HEATMAP: '/api/heatmap',
  HEATMAP_COMBINED: '/api/heatmap/combined',
  HEATMAP_TIMELINE_24H: '/api/heatmap/timeline-24h',
  
  // Routing (AMC-A*)
  ROUTING_SAFE_PATH: '/api/v1/routing/safe-path',

  /** Reverse geocode (BE → Google Geocoding). Query: lat, lng */
  REVERSE_GEOCODE: '/api/v1/geocode/reverse',
  /** Gợi ý khi gõ (BE → Google Places Autocomplete). Query: q hoặc input; tuỳ chọn session_token, lat, lng, radius */
  GEOCODE_SEARCH: '/api/v1/geocode/search',
  /** Chi tiết địa điểm sau khi chọn gợi ý. Query: place_id; tuỳ chọn session_token */
  GEOCODE_PLACE: '/api/v1/geocode/place',
  /** Geocode một chuỗi địa chỉ đầy đủ. Query: address */
  GEOCODE_FORWARD: '/api/v1/geocode/forward',
  /** @deprecated Dùng GEOCODE_SEARCH / GEOCODE_FORWARD */
  FORWARD_GEOCODE: '/api/v1/geocode/forward',

  // Admin (JWT role admin)
  ADMIN_DEVICES_HEALTH: '/api/v1/admin/devices/health',
  ADMIN_EMERGENCY_ALERTS_SUMMARY: '/api/v1/admin/emergency-alerts/summary',
  /** Ghi đè độ ngập thủ công (batch) — đồng bộ với BE nếu đổi path */
  ADMIN_ROUTING_MANUAL_FLOOD_DEPTHS_BATCH: '/api/v1/admin/routing/manual-flood-depths/batch',

  // Telegram (user JWT)
  AUTH_TELEGRAM_LINK: '/api/auth/telegram/link',
  AUTH_TELEGRAM_STATUS: '/api/auth/telegram/status',
  AUTH_TELEGRAM_UNLINK: '/api/auth/telegram/unlink',
  
  // OTA Updates (Admin)
  OTA: '/api/ota',
  OTA_PENDING: '/api/ota/pending',
  OTA_SENSOR: '/api/ota/sensor/:sensorId',
  OTA_STATUS: '/api/ota/:otaId/status',
  
  // Energy Monitoring
  ENERGY: '/api/energy',
  ENERGY_SENSOR: '/api/energy/sensor/:sensorId',
  ENERGY_SENSOR_LATEST: '/api/energy/sensor/:sensorId/latest',
  ENERGY_SENSOR_STATS: '/api/energy/sensor/:sensorId/stats',
  ENERGY_LOW_BATTERY: '/api/energy/low-battery',
  
  // Authentication
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_VERIFY_OTP: '/api/auth/verify-otp',
  AUTH_SEND_OTP: '/api/auth/send-otp',
  AUTH_RESEND_OTP: '/api/auth/resend-otp',
  AUTH_FORGOT_PASSWORD: '/api/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/api/auth/reset-password',
  AUTH_REFRESH: '/api/auth/refresh',
  AUTH_LOGOUT: '/api/auth/logout',
  /** Chỉ đọc thông tin user (JWT). */
  AUTH_PROFILE: '/api/auth/profile',
  /** Cập nhật profile (full_name, phone, email, avatar, …). */
  AUTH_PROFILE_EDIT: '/api/auth/profile/edit',
  /** Lưu GPS sau Geolocation (JSON body: lat, lng, accuracy_m) */
  AUTH_LOCATION: '/api/auth/location',
  AUTH_PROFILE_ICONS: '/api/auth/profile-icons',
  AUTH_CHANGE_PASSWORD: '/api/auth/change-password',

  /** Tin RSS TP.HCM — public, không bắt buộc JWT */
  NEWS: '/api/v1/news/hcm',

  // Stats
  STATS_ONLINE_USERS: '/api/stats/online-users',
  STATS_ONLINE_USERS_COUNT: '/api/stats/online-users/count',
  STATS_MONTHLY_VISITS: '/api/stats/monthly-visits',

  // Research analytics (Admin/Moderator)
  RESEARCH_EVALUATION: '/api/v1/research/evaluation',
  RESEARCH_COLD_START_HOTSPOTS: '/api/v1/research/cold-start-hotspots'
};

// Polling intervals (milliseconds)
export const POLLING_INTERVALS = {
  FLOOD_DATA: 5000,        // 5 seconds
  CROWD_REPORTS: 10000     // 10 seconds (giảm từ 30s để cập nhật nhanh hơn)
};

// Báo cáo cộng đồng: số giờ hiển thị trên bản đồ, sau đó coi là hết hạn (ẩn khỏi map)
export const CROWD_REPORT_MAP_DISPLAY_HOURS = 24;

// Default values
export const DEFAULTS = {
  WARNING_THRESHOLD: 10,
  DANGER_THRESHOLD: 30,
  DEFAULT_LAT: 10.776,
  DEFAULT_LNG: 106.701
};
