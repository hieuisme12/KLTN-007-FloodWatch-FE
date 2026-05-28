import { apiClient } from './api';

const EMERGENCY_SUBSCRIPTIONS = '/api/emergency-subscriptions';
const EMERGENCY_SUBSCRIPTIONS_MY = '/api/emergency-subscriptions/my-subscriptions';
const EMERGENCY_SUBSCRIPTION_BY_ID = '/api/emergency-subscriptions/:subscriptionId';
const AUTH_TELEGRAM_LINK = '/api/auth/telegram/link';
const AUTH_TELEGRAM_STATUS = '/api/auth/telegram/status';
const AUTH_TELEGRAM_UNLINK = '/api/auth/telegram/unlink';

export type EmergencySubscription = {
  id: number | string;
  name?: string | null;
  lat: number;
  lng: number;
  radius: number;
  is_active?: boolean;
};

export async function fetchTelegramLinkStatus() {
  const { data } = await apiClient.get(AUTH_TELEGRAM_STATUS);
  return data;
}

export async function requestTelegramLink() {
  const { data } = await apiClient.post(AUTH_TELEGRAM_LINK);
  return data;
}

export async function unlinkTelegram() {
  const { data } = await apiClient.delete(AUTH_TELEGRAM_UNLINK);
  return data;
}

export async function fetchMyEmergencySubscriptions(): Promise<EmergencySubscription[]> {
  const { data } = await apiClient.get(EMERGENCY_SUBSCRIPTIONS_MY);
  if (!data?.success || !Array.isArray(data.data)) return [];
  return data.data.map((s: Record<string, unknown>) => ({
    id: (s.id as number | string) ?? String(Math.random()),
    name: (s.name as string | null | undefined) ?? null,
    lat: Number(s.lat) || 0,
    lng: Number(s.lng) || 0,
    radius: Number(s.radius) || 500,
    is_active: s.is_active !== false
  }));
}

export async function createEmergencySubscription(payload: {
  lat: number;
  lng: number;
  radius: number;
  name?: string | null;
}) {
  const { data } = await apiClient.post(EMERGENCY_SUBSCRIPTIONS, {
    ...payload,
    notification_methods: ['telegram']
  });
  return data;
}

export async function updateEmergencySubscription(
  subscriptionId: string | number,
  payload: Partial<{
    lat: number;
    lng: number;
    radius: number;
    is_active: boolean;
    name: string | null;
  }>
) {
  const endpoint = EMERGENCY_SUBSCRIPTION_BY_ID.replace(':subscriptionId', String(subscriptionId));
  const { data } = await apiClient.put(endpoint, {
    ...payload,
    notification_methods: ['telegram']
  });
  return data;
}

export async function deleteEmergencySubscription(subscriptionId: string | number) {
  const endpoint = EMERGENCY_SUBSCRIPTION_BY_ID.replace(':subscriptionId', String(subscriptionId));
  const { data } = await apiClient.delete(endpoint);
  return data;
}
