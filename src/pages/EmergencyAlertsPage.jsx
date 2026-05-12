import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  getProfile,
  createEmergencySubscription,
  fetchMySubscriptions,
  updateEmergencySubscription,
  deleteEmergencySubscription,
  postTelegramLink,
  getTelegramLinkStatus,
  deleteTelegramUnlink,
  fetchFloodData
} from '../services/api';
import { DEFAULT_CENTER, DEFAULT_ZOOM, statusColors } from '../utils/constants';
import SensorMarker from '../components/map/SensorMarker';
import ErrorToast from '../components/common/ErrorToast';
import { cn } from '@/lib/cn';
import {
  FaLink,
  FaTrash,
  FaPen,
  FaLocationCrosshairs,
  FaMagnifyingGlass,
  FaXmark,
  FaMapLocationDot
} from 'react-icons/fa6';
import { getMapboxToken } from '../utils/mapboxToken';
import { getReporterAvatarUrl } from '../utils/reporterAvatarUrl';
import { getCurrentUser } from '../utils/auth';
import Skeleton from 'react-loading-skeleton';

const MAPBOX_TOKEN = getMapboxToken();
const defaultLng = DEFAULT_CENTER[1];
const defaultLat = DEFAULT_CENTER[0];

const METHOD_OPTIONS = [
  { id: 'email', label: 'Email', desc: 'Gửi cảnh báo tới email gắn với tài khoản của bạn.' },
  { id: 'telegram', label: 'Telegram', desc: 'Nhận tin qua bot sau khi đã liên kết Telegram.' },
  { id: 'webhook', label: 'Webhook', desc: 'Gửi sự kiện tới URL webhook bạn cấu hình (nếu bật).' }
];

/** Cùng logic hiển thị với marker báo cáo người dân trên MapView (tên + avatar/icon + mũi pin). */
function EmergencyPickMarkerBody({ displayName, avatarFileName, markerTheme = 'dark', avatarCacheNonce = 0 }) {
  const isLight = markerTheme === 'light';
  const textColor = isLight ? '#fff' : '#000';
  const borderColor = isLight ? '#fff' : '#000';
  const rawUrl = getReporterAvatarUrl(avatarFileName);
  const avatarUrl =
    rawUrl && avatarCacheNonce != null
      ? `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}_av=${avatarCacheNonce}`
      : rawUrl;
  const trimmed = (displayName || '').trim();
  const initials = trimmed
    ? trimmed.split(/\s+/).length >= 2
      ? (trimmed.split(/\s+/)[0].charAt(0) + trimmed.split(/\s+/).pop().charAt(0)).toUpperCase()
      : trimmed.charAt(0).toUpperCase()
    : '?';
  const fallbackBg = '#0ea5e9';
  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '4px'
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: textColor,
            whiteSpace: 'nowrap',
            maxWidth: '140px',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {trimmed || 'Bạn'}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: `3px solid ${borderColor}`,
            overflow: 'hidden',
            background: avatarUrl ? undefined : fallbackBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>{initials}</span>
          )}
        </div>
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: `14px solid ${borderColor}`,
            marginTop: '-2px'
          }}
        />
      </div>
    </>
  );
}

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative !m-0 inline-flex !h-7 !w-12 !min-h-7 !min-w-12 shrink-0 !cursor-pointer !items-stretch !justify-start !rounded-full !p-0 !font-[inherit] !leading-none !shadow-none transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
        '!border-2 !border-transparent',
        checked ? '!bg-sky-600 hover:!bg-sky-700' : '!bg-slate-200 hover:!bg-slate-300',
        disabled && '!cursor-not-allowed opacity-45'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-slate-300/90 bg-white shadow-sm transition-[left] duration-200 ease-out',
          checked ? 'left-[calc(100%-22px)]' : 'left-[2px]'
        )}
      />
    </button>
  );
}

function EmergencyMapModal({
  open,
  onClose,
  mapLat,
  mapLng,
  onPick,
  userGps,
  onUserGps,
  existingSubs,
  pickDisplayName,
  pickAvatarFileName,
  pickAvatarCacheNonce = 0
}) {
  const mapRef = useRef(null);
  const floodEndpointRef = useRef(null);
  const [sensors, setSensors] = useState([]);
  const [sensorPopupId, setSensorPopupId] = useState(null);

  useEffect(() => {
    if (!open) {
      setSensorPopupId(null);
      setSensors([]);
      return undefined;
    }
    let cancelled = false;
    fetchFloodData(floodEndpointRef).then((res) => {
      if (cancelled) return;
      if (!res.success || !res.data?.length) {
        setSensors([]);
        return;
      }
      const list = res.data.filter((s) => s.lat != null && s.lng != null);
      setSensors(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => {
      const map = mapRef.current?.getMap?.();
      map?.resize?.();
    }, 200);
    return () => window.clearTimeout(id);
  }, [open, mapLat, mapLng]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const applyGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onUserGps(pos.coords.latitude, pos.coords.longitude);
        onPick(pos.coords.latitude, pos.coords.longitude);
        const map = mapRef.current?.getMap?.();
        map?.flyTo?.({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15, duration: 800 });
      },
      () => {}
    );
  };

  return (
    <div
      className="fixed inset-0 z-[4000] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-[70vw] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl max-sm:w-[94vw]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-map-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <h2 id="emergency-map-title" className="text-base font-semibold text-slate-900 sm:text-lg">
              Chọn điểm trên bản đồ
            </h2>
            <p className="text-xs text-slate-500 sm:text-sm">
              Có marker cảm biến mực nước; bấm map để chọn điểm cảnh báo. Không hiển thị báo cáo người dân.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Đóng"
          >
            <FaXmark className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-[min(70vh,560px)] flex-1">
          {MAPBOX_TOKEN ? (
            <Map
              ref={mapRef}
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={{ longitude: mapLng, latitude: mapLat, zoom: DEFAULT_ZOOM }}
              style={{ width: '100%', height: '100%', minHeight: 'min(70vh,560px)' }}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              onClick={(e) => {
                setSensorPopupId(null);
                const { lngLat } = e;
                if (!lngLat) return;
                onPick(lngLat.lat, lngLat.lng);
              }}
            >
              {sensors.map((item, index) => {
                const status = item.status || 'normal';
                const color = statusColors[status] || statusColors.normal;
                const sensorId = item.sensor_id || `sensor-${index}`;
                const isOnline = status !== 'offline';
                return (
                  <SensorMarker
                    key={sensorId}
                    item={item}
                    color={color}
                    isOnline={isOnline}
                    mode="map"
                    onClick={() => {}}
                    isPopupOpen={sensorPopupId === sensorId}
                    onOpenPopup={() => setSensorPopupId(sensorId)}
                    onClosePopup={() => setSensorPopupId(null)}
                  />
                );
              })}
              {existingSubs.map((s) => (
                <Marker key={`sub-${s.id}`} longitude={Number(s.lng)} latitude={Number(s.lat)} anchor="center">
                  <div
                    className="h-2.5 w-2.5 rounded-full border border-white bg-slate-400 opacity-90 shadow"
                    title={`Đăng ký #${s.id}`}
                  />
                </Marker>
              ))}
              {userGps && (
                <Marker longitude={userGps.lng} latitude={userGps.lat} anchor="center">
                  <div
                    className="h-3.5 w-3.5 rounded-full border-2 border-white bg-sky-500 shadow-md"
                    title="Vị trí GPS của bạn"
                  />
                </Marker>
              )}
              <Marker
                longitude={mapLng}
                latitude={mapLat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                }}
              >
                <div
                  style={{
                    padding: '20px',
                    margin: '-20px',
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'default',
                    lineHeight: 1.2
                  }}
                  title="Điểm đăng ký cảnh báo"
                >
                  <EmergencyPickMarkerBody
                    displayName={pickDisplayName}
                    avatarFileName={pickAvatarFileName}
                    avatarCacheNonce={pickAvatarCacheNonce}
                    markerTheme="dark"
                  />
                </div>
              </Marker>
            </Map>
          ) : (
            <div className="flex h-[min(70vh,560px)] items-center justify-center bg-slate-100 px-4 text-center text-sm text-amber-800">
              Chưa cấu hình VITE_MAPBOX_TOKEN — không thể hiển thị bản đồ.
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <div className="text-xs text-slate-600 sm:text-sm">
            Vĩ độ <strong>{Number(mapLat).toFixed(5)}</strong>, kinh độ <strong>{Number(mapLng).toFixed(5)}</strong>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyGps}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              <FaLocationCrosshairs className="h-4 w-4 text-sky-600" />
              Lấy GPS
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Xong
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmergencyAlertsPage() {
  const [profile, setProfile] = useState(null);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tgBusy, setTgBusy] = useState(false);
  const [telegramPoll, setTelegramPoll] = useState(false);

  const [formLat, setFormLat] = useState(defaultLat);
  const [formLng, setFormLng] = useState(defaultLng);
  const [userGps, setUserGps] = useState(null);
  const [radius, setRadius] = useState(500);
  const [methods, setMethods] = useState({ email: true, telegram: false, webhook: false });
  const [submitting, setSubmitting] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [subSearch, setSubSearch] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editRadius, setEditRadius] = useState(500);
  const [editMethods, setEditMethods] = useState({ email: true, telegram: false, webhook: false });
  const [editActive, setEditActive] = useState(true);

  const loadAll = useCallback(async () => {
    setError('');
    const [p, s] = await Promise.all([getProfile(), fetchMySubscriptions()]);
    if (p.success && p.data) setProfile(p.data);
    else setProfile(null);
    if (s.success) setSubs(s.data || []);
    else setSubs([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadAll());
  }, [loadAll]);

  useEffect(() => {
    if (!telegramPoll) return undefined;
    const t = setInterval(async () => {
      const st = await getTelegramLinkStatus();
      if (st.success && st.data?.linked) {
        setTelegramPoll(false);
        setSuccess('Đã liên kết Telegram thành công.');
        await loadAll();
      }
    }, 4000);
    const stop = setTimeout(() => setTelegramPoll(false), 120000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [telegramPoll, loadAll]);

  const filteredSubs = useMemo(() => {
    const q = subSearch.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter(
      (s) =>
        String(s.id).includes(q) ||
        String(s.radius).includes(q) ||
        (s.notification_methods || []).some((m) => String(m).toLowerCase().includes(q)) ||
        `${Number(s.lat).toFixed(4)} ${Number(s.lng).toFixed(4)}`.includes(q)
    );
  }, [subs, subSearch]);

  const notificationMethodsArray = () => METHOD_OPTIONS.filter((m) => methods[m.id]).map((m) => m.id);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const arr = notificationMethodsArray();
    if (arr.length === 0) {
      setError('Chọn ít nhất một kênh thông báo.');
      return;
    }
    if (arr.includes('telegram') && profile && !profile.telegram_linked) {
      setError('Bạn chọn Telegram nhưng chưa liên kết bot. Hãy liên kết ở mục bên dưới trước.');
      return;
    }
    setSubmitting(true);
    const res = await createEmergencySubscription({
      lat: Number(formLat),
      lng: Number(formLng),
      radius: Number(radius),
      notification_methods: arr
    });
    setSubmitting(false);
    if (res.success) {
      setSuccess(res.message || 'Đã tạo đăng ký.');
      await loadAll();
    } else {
      setError(res.error || 'Không tạo được đăng ký.');
    }
  };

  const startEdit = (sub) => {
    setEditingId(sub.id);
    setEditRadius(sub.radius ?? 500);
    setEditActive(sub.is_active !== false);
    const m = { email: false, telegram: false, webhook: false };
    (sub.notification_methods || []).forEach((x) => {
      if (m[x] !== undefined) m[x] = true;
    });
    if (!sub.notification_methods?.length) m.email = true;
    setEditMethods(m);
  };

  const saveEdit = async (id) => {
    setError('');
    const sub = subs.find((s) => String(s.id) === String(id));
    const arr = METHOD_OPTIONS.filter((o) => editMethods[o.id]).map((o) => o.id);
    if (arr.length === 0) {
      setError('Chọn ít nhất một kênh.');
      return;
    }
    if (arr.includes('telegram') && profile && !profile.telegram_linked) {
      setError('Cần liên kết Telegram trước khi bật kênh Telegram.');
      return;
    }
    const body = {
      radius: Number(editRadius),
      notification_methods: arr,
      is_active: editActive
    };
    if (sub && sub.lat != null && sub.lng != null) {
      body.lat = Number(sub.lat);
      body.lng = Number(sub.lng);
    }
    const res = await updateEmergencySubscription(id, body);
    if (res.success) {
      setSuccess('Đã cập nhật đăng ký.');
      setEditingId(null);
      await loadAll();
    } else {
      setError(res.error || 'Cập nhật thất bại.');
    }
  };

  const removeSub = async (id) => {
    if (!window.confirm('Xóa đăng ký cảnh báo tại vùng này?')) return;
    const res = await deleteEmergencySubscription(id);
    if (res.success) {
      setSuccess('Đã xóa đăng ký.');
      await loadAll();
    } else {
      setError(res.error || 'Xóa thất bại.');
    }
  };

  const onTelegramLink = async () => {
    setError('');
    setTgBusy(true);
    const res = await postTelegramLink();
    setTgBusy(false);
    if (!res.success) {
      setError(res.error || 'Không tạo liên kết được.');
      return;
    }
    const link = res.data?.deep_link || res.data?.deepLink;
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
      setTelegramPoll(true);
      setSuccess('Đã mở Telegram. Hoàn tất /start trên bot để liên kết.');
    } else {
      setError('Phản hồi từ server không có deep link.');
    }
  };

  const onTelegramUnlink = async () => {
    if (!window.confirm('Gỡ liên kết Telegram?')) return;
    setTgBusy(true);
    const res = await deleteTelegramUnlink();
    setTgBusy(false);
    if (res.success) {
      setSuccess('Đã gỡ liên kết Telegram.');
      await loadAll();
    } else {
      setError(res.error || 'Gỡ liên kết thất bại.');
    }
  };

  const useMyLocationInline = () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLat(pos.coords.latitude);
        setFormLng(pos.coords.longitude);
        setUserGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSuccess('Đã lấy vị trí hiện tại.');
      },
      () => setError('Không lấy được vị trí. Kiểm tra quyền truy cập vị trí.')
    );
  };

  const pageShellStyle = {
    minHeight: 'calc(100vh - 60px)',
    display: 'flex',
    flexDirection: 'column',
    background: '#f5f5f5',
    padding: '20px'
  };

  const heroStyle = {
    backgroundImage: 'url(/notification.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    marginBottom: '24px',
    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '32px 40px'
  };

  const heroTitleStyle = {
    margin: '0 0 12px 0',
    fontSize: '2rem',
    color: 'white',
    fontWeight: '700',
    letterSpacing: '0.5px',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    position: 'relative',
    zIndex: 1
  };

  const heroSubtitleStyle = {
    margin: '0',
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: '15px',
    fontWeight: '400',
    lineHeight: '1.6',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    position: 'relative',
    zIndex: 1,
    maxWidth: '48rem'
  };

  const listPanelClass =
    'w-full flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm';

  const [pickMarkerRev, setPickMarkerRev] = useState(0);
  useEffect(() => {
    const onUser = () => setPickMarkerRev((n) => n + 1);
    window.addEventListener('user-updated', onUser);
    return () => window.removeEventListener('user-updated', onUser);
  }, []);

  const pickViewer = useMemo(() => {
    const u = getCurrentUser();
    const name =
      profile?.username ??
      profile?.full_name ??
      profile?.name ??
      u?.username ??
      u?.full_name ??
      u?.name ??
      'Bạn';
    const avatar = profile?.avatar ?? u?.avatar ?? null;
    return { displayName: name, avatarFileName: avatar };
  }, [profile, pickMarkerRev]);

  if (loading) {
    return (
      <div style={pageShellStyle}>
        <div style={heroStyle}>
          <h1 style={heroTitleStyle}>Cảnh báo khẩn theo vùng</h1>
          <p style={heroSubtitleStyle}>
            Chọn điểm, bán kính và kênh nhận tin — được báo khi nguy cơ ngập cao trong vùng đó.
          </p>
        </div>
        <div className={listPanelClass}>
          <div className="space-y-4 p-6">
            <Skeleton height={36} width="40%" />
            <Skeleton height={20} width="100%" />
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageShellStyle}>
      <div style={heroStyle}>
        <h1 style={heroTitleStyle}>Cảnh báo khẩn theo vùng</h1>
        <p style={heroSubtitleStyle}>
          Chọn điểm, bán kính và kênh nhận tin — được báo khi nguy cơ ngập cao trong vùng đó.
        </p>
      </div>

      <EmergencyMapModal
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        mapLat={formLat}
        mapLng={formLng}
        onPick={(lat, lng) => {
          setFormLat(lat);
          setFormLng(lng);
        }}
        userGps={userGps}
        onUserGps={(lat, lng) => setUserGps({ lat, lng })}
        existingSubs={subs}
        pickDisplayName={pickViewer.displayName}
        pickAvatarFileName={pickViewer.avatarFileName}
        pickAvatarCacheNonce={pickMarkerRev}
      />

      <div className={cn(listPanelClass, 'flex min-h-0 flex-col')}>
        {error && (
          <div className="border-b border-slate-100 px-4 pt-4 sm:px-6">
            <ErrorToast message={error} onClose={() => setError('')} />
          </div>
        )}
        {success && (
          <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:px-6">
            {success}
          </div>
        )}

        <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Thiết lập nhận tin</h2>
            <p className="mt-1 text-sm text-slate-600">Bật kênh, chọn vùng và quản lý các đăng ký cảnh báo.</p>
          </div>
          <div className="relative w-full shrink-0 sm:max-w-sm">
            <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={subSearch}
              onChange={(e) => setSubSearch(e.target.value)}
              placeholder="Tìm trong đăng ký của tôi…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="grid border-b border-slate-200 md:grid-cols-[minmax(200px,280px)_1fr]">
          <div className="border-slate-200 p-5 md:border-r md:bg-slate-50/60">
            <h3 className="text-base font-semibold text-slate-900">Kênh thông báo</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Chọn cách bạn muốn nhận tin khi có nguy cơ ngập cao trong bán kính đã chọn.
            </p>
          </div>
          <div className="min-w-0 divide-y divide-slate-100">
            {METHOD_OPTIONS.map((m) => (
              <div
                key={m.id}
                className="flex items-start gap-4 px-4 py-4 sm:px-6 sm:py-5"
              >
                <ToggleSwitch
                  checked={!!methods[m.id]}
                  onChange={(v) => setMethods((prev) => ({ ...prev, [m.id]: v }))}
                  disabled={
                    m.id === 'telegram' && !!profile && !profile.telegram_linked && !methods.telegram
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900">{m.label}</div>
                  <p className="mt-0.5 text-sm text-slate-500">{m.desc}</p>
                  {m.id === 'telegram' && profile && !profile.telegram_linked && (
                    <p className="mt-1 text-xs text-amber-700">Cần liên kết Telegram ở mục dưới trước khi bật.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Liên kết Telegram</h3>
              <p className="mt-1 text-sm text-slate-600">
                Trạng thái: <strong>{profile?.telegram_linked ? 'Đã liên kết' : 'Chưa liên kết'}</strong>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={tgBusy}
                onClick={onTelegramLink}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white',
                  'hover:bg-sky-700 disabled:opacity-50'
                )}
              >
                <FaLink className="h-4 w-4" />
                {tgBusy ? 'Đang xử lý…' : 'Mở liên kết Telegram'}
              </button>
              {profile?.telegram_linked && (
                <button
                  type="button"
                  disabled={tgBusy}
                  onClick={onTelegramUnlink}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Gỡ liên kết
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleCreate} className="border-b border-slate-200">
          <div className="grid md:grid-cols-[minmax(200px,280px)_1fr]">
            <div className="border-slate-200 p-5 md:border-r md:bg-slate-50/60">
              <h3 className="text-base font-semibold text-slate-900">Đăng ký vùng mới</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Chọn bán kính và điểm trung tâm, rồi gửi đăng ký. Bản đồ chỉ dùng để chọn tọa độ.
              </p>
            </div>
            <div className="min-w-0 space-y-0 divide-y divide-slate-100">
              <div className="px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">Bán kính</span>
                  <span className="text-sm tabular-nums text-slate-600">{radius} m</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={100}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="mt-3 w-full accent-sky-600"
                />
              </div>
              <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800">Vị trí trung tâm</div>
                  <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                    {Number(formLat).toFixed(5)}, {Number(formLng).toFixed(5)}
                    {userGps ? ' · đã lấy GPS' : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMapPickerOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    <FaMapLocationDot className="h-4 w-4 text-sky-600" />
                    Mở bản đồ chọn điểm
                  </button>
                  <button
                    type="button"
                    onClick={useMyLocationInline}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    <FaLocationCrosshairs className="h-4 w-4 text-sky-600" />
                    GPS nhanh
                  </button>
                </div>
              </div>
              {!MAPBOX_TOKEN && (
                <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6">
                  <label className="text-sm text-slate-700">
                    Vĩ độ
                    <input
                      type="number"
                      step="any"
                      value={formLat}
                      onChange={(e) => setFormLat(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Kinh độ
                    <input
                      type="number"
                      step="any"
                      value={formLng}
                      onChange={(e) => setFormLng(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                </div>
              )}
              <div className="px-4 py-4 sm:px-6 sm:py-5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang gửi…' : 'Tạo đăng ký'}
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="flex-1">
          <div className="grid md:grid-cols-[minmax(200px,280px)_1fr]">
            <div className="border-slate-200 p-5 md:border-r md:bg-slate-50/60">
              <h3 className="text-base font-semibold text-slate-900">Đăng ký của tôi</h3>
              <p className="mt-2 text-sm text-slate-600">
                {filteredSubs.length} / {subs.length} hiển thị
              </p>
            </div>
            <div className="min-w-0 divide-y divide-slate-100">
              {filteredSubs.length === 0 ? (
                <div className="px-4 py-8 text-sm text-slate-500 sm:px-6">
                  {subs.length === 0 ? 'Chưa có đăng ký nào.' : 'Không có đăng ký nào khớp tìm kiếm.'}
                </div>
              ) : (
                filteredSubs.map((sub) => (
                  <div key={sub.id} className="px-4 py-4 sm:px-6 sm:py-5">
                    {editingId === sub.id ? (
                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-slate-800">
                          Bán kính (m)
                          <input
                            type="number"
                            min={100}
                            value={editRadius}
                            onChange={(e) => setEditRadius(Number(e.target.value))}
                            className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2"
                          />
                        </label>
                        <div className="space-y-3 border-t border-slate-100 pt-3">
                          {METHOD_OPTIONS.map((m) => (
                            <div key={m.id} className="flex items-start gap-4">
                              <ToggleSwitch
                                checked={!!editMethods[m.id]}
                                onChange={(v) => setEditMethods((prev) => ({ ...prev, [m.id]: v }))}
                              />
                              <span className="text-sm font-medium text-slate-800">{m.label}</span>
                            </div>
                          ))}
                        </div>
                        <label className="flex items-center gap-3 text-sm text-slate-800">
                          <ToggleSwitch checked={editActive} onChange={(v) => setEditActive(v)} />
                          Đang bật đăng ký
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(sub.id)}
                            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 flex-1 items-start gap-4">
                          <ToggleSwitch
                            checked={sub.is_active !== false}
                            onChange={async (v) => {
                              setError('');
                              const m = { email: false, telegram: false, webhook: false };
                              (sub.notification_methods || []).forEach((x) => {
                                if (m[x] !== undefined) m[x] = true;
                              });
                              if (!sub.notification_methods?.length) m.email = true;
                              const arr = METHOD_OPTIONS.filter((o) => m[o.id]).map((o) => o.id);
                              const body = {
                                radius: Number(sub.radius),
                                notification_methods: arr,
                                is_active: v,
                                lat: Number(sub.lat),
                                lng: Number(sub.lng)
                              };
                              const res = await updateEmergencySubscription(sub.id, body);
                              if (res.success) {
                                setSuccess(v ? 'Đã bật đăng ký.' : 'Đã tạm tắt đăng ký.');
                                await loadAll();
                              } else {
                                setError(res.error || 'Không cập nhật được.');
                              }
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900">
                              Vùng #{sub.id} · bán kính {sub.radius} m
                            </div>
                            <p className="mt-0.5 text-sm text-slate-500">
                              {(sub.notification_methods || []).join(', ') || '—'} ·{' '}
                              {Number(sub.lat).toFixed(4)}, {Number(sub.lng).toFixed(4)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(sub)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                          >
                            <FaPen className="h-3.5 w-3.5" /> Sửa chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSub(sub.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                          >
                            <FaTrash className="h-3.5 w-3.5" /> Xóa
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
