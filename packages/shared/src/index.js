import { DEFAULT_API_BASE_URL } from './constants.js';

export { API_ENDPOINTS } from './apiEndpoints.js';
export {
  DEFAULT_API_BASE_URL,
  API_TIMEOUT_MS,
  AUTH_STORAGE_KEYS,
  HCM_MAP_CENTER,
  MAP_POLL_MS,
  CROWD_REPORT_MAP_HOURS
} from './constants.js';

export function getApiBaseUrl(envBaseUrl) {
  const trimmed = typeof envBaseUrl === 'string' ? envBaseUrl.trim() : '';
  return trimmed || DEFAULT_API_BASE_URL;
}
