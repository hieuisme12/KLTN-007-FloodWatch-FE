import { API_BASE_URL } from './config';

export type ProfileIcon = {
  name: string;
  url: string;
};

export function getProfileAvatarUrl(avatarFileName?: string | null): string | null {
  if (!avatarFileName || typeof avatarFileName !== 'string') return null;
  const trimmed = avatarFileName.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/profile-icons/${trimmed}`;
  return `${base}${path}`;
}

export function getProfileInitials(
  fullName?: string | null,
  username?: string | null
): string {
  if (fullName?.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return fullName.trim().charAt(0).toUpperCase();
  }
  if (username?.trim()) return username.trim().charAt(0).toUpperCase();
  return 'U';
}

export function normalizeProfileUser(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null;
  const root = input as Record<string, unknown>;
  const candidates = [root.data, root.user, root];
  for (const item of candidates) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>;
      if (
        typeof obj.email === 'string' ||
        typeof obj.full_name === 'string' ||
        typeof obj.username === 'string' ||
        typeof obj.avatar === 'string'
      ) {
        return obj;
      }
    }
  }
  return null;
}
