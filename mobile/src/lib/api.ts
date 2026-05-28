import axios from 'axios';
import { API_ENDPOINTS } from '@hcm-flood/shared';
import { API_BASE_URL } from './config';
import {
  clearAuthStorage,
  getAccessToken,
  getStoredUser,
  persistAuthFromLoginResponse
} from './authStorage';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function loginWithCredentials(username: string, password: string) {
  const loginId = username.trim();
  const postLogin = async (payload: Record<string, string>) => {
    const { data } = await axios.post(
      `${API_BASE_URL}${API_ENDPOINTS.AUTH_LOGIN}`,
      payload,
      { withCredentials: true }
    );
    await persistAuthFromLoginResponse(data);
    return data;
  };

  const primaryPayload = loginId.includes('@')
    ? { email: loginId.toLowerCase(), password }
    : { username: loginId, password };

  try {
    return await postLogin(primaryPayload);
  } catch (firstError) {
    if (!axios.isAxiosError(firstError) || !firstError.response) {
      throw firstError;
    }
    const fallbackPayload = loginId.includes('@')
      ? { username: loginId, password }
      : { email: loginId.toLowerCase(), password };
    return await postLogin(fallbackPayload);
  }
}

export async function registerWithCredentials(input: {
  username: string;
  email: string;
  password: string;
}) {
  const payload = {
    username: input.username.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password
  };

  const { data } = await axios.post(
    `${API_BASE_URL}/api/auth/register`,
    payload,
    { withCredentials: true }
  );
  return data;
}

export async function fetchActiveAlertsCount(): Promise<number> {
  const { data } = await apiClient.get(API_ENDPOINTS.ALERTS_ACTIVE);
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.alerts)) return data.alerts.length;
  if (typeof data?.count === 'number') return data.count;
  return 0;
}

export async function fetchAuthProfile() {
  const { data } = await apiClient.get(API_ENDPOINTS.AUTH_PROFILE);
  return data;
}

export async function updateAuthProfile(payload: {
  full_name?: string;
  email?: string;
  phone?: string;
}) {
  const { data } = await apiClient.put('/api/auth/profile/edit', payload);
  return data;
}

export async function logout() {
  try {
    await apiClient.post('/api/auth/logout');
  } catch {
    // ignore — vẫn xóa local
  }
  await clearAuthStorage();
}

export { getStoredUser, getAccessToken, clearAuthStorage, persistAuthFromLoginResponse };
