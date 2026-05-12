import { API_CONFIG } from '../config/apiConfig';

/** URL đầy đủ cho avatar/icon người báo cáo (đồng bộ MapView + Profile). */
export function getReporterAvatarUrl(avatarFileName) {
  if (!avatarFileName || typeof avatarFileName !== 'string') return null;
  const trimmed = avatarFileName.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/profile-icons/${trimmed}`;
  return base + path;
}
