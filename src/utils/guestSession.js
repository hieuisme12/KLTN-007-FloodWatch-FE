import { isAuthenticated } from './auth';

const GUEST_EXPLORE_KEY = 'hcm_flood_guest_explore';

export function setGuestExploreMode() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(GUEST_EXPLORE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearGuestExploreMode() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(GUEST_EXPLORE_KEY);
  } catch {
    /* ignore */
  }
}

export function isGuestExploreActive() {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(GUEST_EXPLORE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Đang xem thử (nút khách) và chưa có JWT — dùng để hiện đủ menu + chặn tính năng cần đăng nhập. */
export function isGuestBrowseMode() {
  return isGuestExploreActive() && !isAuthenticated();
}
