import { useEffect, useState } from 'react';
import { getAuthLocationSyncSessionKey, isAuthenticated } from '../utils/auth';
import { postAuthLocation } from '../services/api';

const SYNC_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Sau khi đăng nhập, gọi Geolocation (nếu có) và POST /api/auth/location.
 * Geolocation **luôn** là GPS của thiết bị/trình duyệt hiện tại — không lấy từ máy người khác qua mạng.
 * Giới hạn 1 lần / user / khoảng SYNC_INTERVAL_MS (sessionStorage theo userId) để tránh spam API.
 */
export function useSyncAuthLocation() {
  const [authEpoch, setAuthEpoch] = useState(0);

  useEffect(() => {
    const bump = () => setAuthEpoch((n) => n + 1);
    window.addEventListener('user-updated', bump);
    const onStorage = (e) => {
      if (e.key === 'user' || e.key === 'authToken') bump();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('user-updated', bump);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated() || typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    const sessionKey = getAuthLocationSyncSessionKey();
    const last = sessionStorage.getItem(sessionKey);
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
            sessionStorage.setItem(sessionKey, String(Date.now()));
          }
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 12000 }
      );
    }, 1500);

    return () => clearTimeout(timer);
  }, [authEpoch]);
}
