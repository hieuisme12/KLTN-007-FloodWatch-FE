/** API paths — dùng chung web + mobile (không phụ thuộc Vite/Expo env). */
export const API_ENDPOINTS = {
  FLOOD_DATA: '/api/v1/flood-data',
  FLOOD_DATA_REALTIME: '/api/flood-data/realtime',
  FLOOD_DATA_REALTIME_V1: '/api/v1/flood-data/realtime',
  FUSION_POINTS: '/api/v1/fusion/points',
  FORECAST_SENSOR: '/api/v1/forecast/sensor/:sensorId',
  WEATHER_HCM: '/api/v1/weather/hcm',
  CROWD_REPORTS: '/api/crowd-reports',
  CROWD_REPORTS_ALL: '/api/crowd-reports/all',
  ALERTS_ACTIVE: '/api/alerts/active',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_PROFILE: '/api/auth/profile',
  AUTH_REFRESH: '/api/auth/refresh',
  NEWS: '/api/v1/news/hcm'
};
