import { Platform } from 'react-native';
import { getAccessToken, getSessionToken } from './authStorage';

/** Header auth cho mọi request cần JWT — tránh mất Bearer khi upload multipart. */
export async function getAuthHeaderRecord(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = (await getAccessToken())?.trim();
  if (token) {
    headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  const session = (await getSessionToken())?.trim();
  // Trình duyệt chặn custom session headers (CORS); native vẫn gửi kèm cookie + Bearer.
  if (session && Platform.OS !== 'web') {
    headers['X-Session-Token'] = session;
    headers['Session-Token'] = session;
  }
  return headers;
}
