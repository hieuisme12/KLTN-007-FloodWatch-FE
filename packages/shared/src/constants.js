export const DEFAULT_API_BASE_URL = 'https://api.floodsight.id.vn';

export const API_TIMEOUT_MS = 10000;

/** TP.HCM — khớp web DEFAULTS */
export const HCM_MAP_CENTER = {
  lat: 10.776,
  lng: 106.701
};

export const MAP_POLL_MS = {
  floodData: 5000,
  crowdReports: 10000
};

export const CROWD_REPORT_MAP_HOURS = 24;

export const AUTH_STORAGE_KEYS = {
  ACCESS: 'authToken',
  ACCESS_DOC: 'access_token',
  REFRESH: 'refreshToken',
  SESSION: 'sessionToken',
  USER: 'user'
};
