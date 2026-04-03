import { useEffect } from 'react';
import { isAuthenticated } from '../utils/auth';
import { postAuthLocation } from '../services/api';

const SYNC_INTERVAL_MS = 30 * 60 * 1000;
const SESSION_KEY = 'userLocationSyncedAt';

/**
 * Sau khi đăng nhập, gọi Geolocation (nếu có) và POST /api/auth/location.
 * Giới hạn 1 lần / phiên (sessionStorage) để không làm phiền và tránh spam API.
 */
export function useSyncAuthLocation() {
  useEffect(() => {
    if (!isAuthenticated() || typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    const last = sessionStorage.getItem(SESSION_KEY);
    if (last && Date.now() - Number(last) < SYNC_INTERVAL_MS) {
      return;
    }

    const timer = setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const res = await postAuthLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy_m:
              pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : undefined
          });
          if (res.success) {
            sessionStorage.setItem(SESSION_KEY, String(Date.now()));
          }
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 12000 }
      );
    }, 1500);

    return () => clearTimeout(timer);
  }, []);
}
