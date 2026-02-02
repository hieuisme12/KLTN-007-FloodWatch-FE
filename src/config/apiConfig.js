// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://trieuminh:3000',
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3
};

// API Endpoints
export const API_ENDPOINTS = {
  FLOOD_DATA: '/api/v1/flood-data',
  FLOOD_DATA_REALTIME: '/api/v1/flood-data/realtime',
  REPORT_FLOOD: '/api/report-flood',
  CROWD_REPORTS: '/api/crowd-reports',
  CROWD_REPORTS_ALL: '/api/crowd-reports/all',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_PROFILE: '/api/auth/profile',
  AUTH_CHANGE_PASSWORD: '/api/auth/change-password'
};

// Polling intervals (milliseconds)
export const POLLING_INTERVALS = {
  FLOOD_DATA: 5000,        // 5 seconds
  CROWD_REPORTS: 30000     // 30 seconds
};

// Default values
export const DEFAULTS = {
  WARNING_THRESHOLD: 10,
  DANGER_THRESHOLD: 30,
  DEFAULT_LAT: 10.776,
  DEFAULT_LNG: 106.701
};
