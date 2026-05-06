// Authentication Helper Functions
// RBAC: Admin (hạ tầng, user, sensor, audit) ≠ Moderator (kiểm duyệt, thống kê). Admin không kế thừa quyền Moderator.

import { getAccessToken, getAuthStorage } from './authSession';

/**
 * Lấy thông tin user hiện tại từ cùng storage với token (localStorage hoặc sessionStorage).
 */
export const getCurrentUser = () => {
  try {
    const userStr = getAuthStorage().getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

/**
 * Khóa localStorage cho cache reverse-geocode (địa chỉ theo tọa độ).
 * Tách theo user để nhiều tài khoản đăng nhập lần lượt trên cùng trình duyệt không dùng chung một object cache.
 */
export function getLocationCacheStorageKey() {
  try {
    const userStr = getAuthStorage().getItem('user');
    if (!userStr) return 'locationCache_guest';
    const user = JSON.parse(userStr);
    const id = user?.id ?? user?.user_id ?? user?.userId ?? user?.username;
    if (id != null && String(id).length > 0) return `locationCache_u_${String(id)}`;
    return 'locationCache_guest';
  } catch {
    return 'locationCache_guest';
  }
}

/**
 * sessionStorage: lần cuối POST /api/auth/location theo từng user (tránh user B kế thừa cờ “đã sync” của user A).
 */
export function getAuthLocationSyncSessionKey() {
  const u = getCurrentUser();
  const id = u?.id ?? u?.user_id ?? u?.userId ?? u?.username;
  if (id != null && String(id).length > 0) return `userLocationSyncedAt:${String(id)}`;
  return 'userLocationSyncedAt:guest';
}

/**
 * Lấy access JWT (cùng nguồn với apiClient).
 */
export const getToken = () => {
  return getAccessToken();
};

/**
 * Kiểm tra xem user đã đăng nhập chưa
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Kiểm tra xem user có phải admin không (chỉ role 'admin')
 * Admin: hạ tầng (sensor, user, cấu hình, audit). Không duyệt báo cáo.
 */
export const isAdmin = () => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

/**
 * Kiểm tra xem user có phải moderator không (chỉ role 'moderator')
 * Admin KHÔNG được coi là moderator. Moderator: kiểm duyệt báo cáo, cảnh báo, thống kê nghiệp vụ.
 */
export const isModerator = () => {
  const user = getCurrentUser();
  return user?.role === 'moderator';
};

/**
 * Kiểm tra xem user có phải user thường không
 */
export const isUser = () => {
  const user = getCurrentUser();
  return user?.role === 'user';
};

/**
 * Kiểm tra xem user có một trong các roles được chỉ định không
 * @param {string[]} roles - Mảng các roles cần kiểm tra (vd: ['admin'], ['moderator'], ['admin', 'moderator'])
 * @returns {boolean}
 */
export const hasRole = (roles) => {
  const user = getCurrentUser();
  if (!user || !user.role) return false;
  return roles.includes(user.role);
};

/**
 * Kiểm tra xem user có đúng role được yêu cầu không (không có thứ bậc kế thừa)
 * @param {string} role - 'admin' | 'moderator' | 'user'
 * @returns {boolean}
 */
export const hasPermission = (role) => {
  const user = getCurrentUser();
  if (!user || !user.role) return false;
  return user.role === role;
};


