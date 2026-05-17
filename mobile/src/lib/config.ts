import Constants from 'expo-constants';
import { getApiBaseUrl } from '@hcm-flood/shared';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

export const API_BASE_URL = getApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL ?? extra?.apiBaseUrl
);
