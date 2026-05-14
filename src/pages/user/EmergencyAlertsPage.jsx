import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
} from '../../services/api';
import { DEFAULT_CENTER, DEFAULT_ZOOM, statusColors } from '../../utils/constants';
import SensorMarker from '../../components/map/SensorMarker';
import ErrorToast from '../../components/common/ErrorToast';
import ConfirmDialog from '../../components/common/ConfirmDialog';
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
import { getMapboxToken } from '../../utils/mapboxToken';
import { getReporterAvatarUrl } from '../../utils/reporterAvatarUrl';
import { getCurrentUser } from '../../utils/auth';
import Skeleton from 'react-loading-skeleton';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

const MAPBOX_TOKEN = getMapboxToken();
const defaultLng = DEFAULT_CENTER[1];
const defaultLat = DEFAULT_CENTER[0];

/** Chỉ dùng Telegram khi tạo/cập nhật; hiển thị vẫn đọc được bản ghi cũ có email/webhook từ BE. */
const TELEGRAM_METHODS = ['telegram'];

/** Khớp API: name trim, tối đa 200 ký tự; rỗng → null khi gửi POST/PUT. */
const EMERGENCY_SUB_NAME_MAX = 200;

function getDisplayMeta(sub) {
  if (!sub || typeof sub !== 'object') return null;
  const m = sub.display_meta ?? sub.displayMeta;
  if (m && typeof m === 'object' && !Array.isArray(m)) return m;
  return null;
}

/** Chuẩn hoá chuỗi nhập tên trước khi gửi API (trim + giới hạn độ dài). */
function clipEmergencySubscriptionName(raw) {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  return s.length > EMERGENCY_SUB_NAME_MAX ? s.slice(0, EMERGENCY_SUB_NAME_MAX) : s;
}

/** Tên hiển thị: name từ BE → display_meta (label, title, …) → các field legacy → Vùng #id */
function getSubscriptionDisplayName(sub) {
  if (!sub) return '';
  if (typeof sub.name === 'string') {
    const t = sub.name.trim();
    if (t) return t.length > EMERGENCY_SUB_NAME_MAX ? t.slice(0, EMERGENCY_SUB_NAME_MAX) : t;
  }
  const meta = getDisplayMeta(sub);
  if (meta) {
    for (const k of ['label', 'title', 'displayName', 'name']) {
      const v = meta[k];
      if (typeof v === 'string' && v.trim()) {
        const t = v.trim();
        return t.length > EMERGENCY_SUB_NAME_MAX ? t.slice(0, EMERGENCY_SUB_NAME_MAX) : t;
      }
    }
  }
  const keys = ['label', 'title', 'zone_name', 'display_name'];
  for (const k of keys) {
    const v = sub[k];
    if (typeof v === 'string' && v.trim()) {
      const t = v.trim();
      return t.length > EMERGENCY_SUB_NAME_MAX ? t.slice(0, EMERGENCY_SUB_NAME_MAX) : t;
    }
  }
  return i18n.t('emergency.zoneFallback', { id: sub.id });
}

/** Màu chữ tiêu đề từ display_meta.color (nếu có). */
function getSubscriptionTitleStyle(sub) {
  const meta = getDisplayMeta(sub);
  if (!meta) return undefined;
  const c = meta.color;
  if (typeof c === 'string' && c.trim()) return { color: c.trim() };
  return undefined;
}

/** Chỉ hiển thị Telegram trong UI (ẩn email/webhook trên giao diện). */
function subscriptionChannelLine() {
  return 'Telegram';
}

/** Cùng logic hiển thị với marker báo cáo người dân trên MapView (tên + avatar/icon + mũi pin). */
function EmergencyPickMarkerBody({ displayName, avatarFileName, markerTheme = 'dark', avatarCacheNonce = 0 }) {
  const { t } = useTranslation();
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
          {trimmed || t('emergency.you')}
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

/** Modal form cùng phong cách overlay với ConfirmDialog / bản đồ cảnh báo */
function EmergencyStackModal({ open, title, description, onClose, children, footer }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[4600] flex items-center justify-center p-4"
      role="presentation"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.88)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-stack-modal-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="min-w-0 pr-2">
            <h2 id="emergency-stack-modal-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {description ? <div className="mt-2 text-sm leading-relaxed text-slate-600">{description}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label={t('emergency.close')}
          >
            <FaXmark className="h-5 w-5" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

function EmergencyMapModal({
  open,
  onClose,
  onConfirm,
  fromCreateFlow,
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
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const floodEndpointRef = useRef(null);
  const [sensors, setSensors] = useState([]);
  const [sensorPopupId, setSensorPopupId] = useState(null);

  useEffect(() => {
    if (!open) {
      const id = window.requestAnimationFrame(() => {
        setSensorPopupId(null);
        setSensors([]);
      });
      return () => window.cancelAnimationFrame(id);
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
      className="fixed inset-0 z-[4000] flex items-center justify-center p-4"
      role="presentation"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.88)' }}
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
              {t('emergency.pickTitle')}
            </h2>
            <p className="text-xs text-slate-500 sm:text-sm">
              {fromCreateFlow ? t('emergency.pickHintWithCrowd') : t('emergency.pickHintSensorsOnly')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label={t('emergency.close')}
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
                    title={t('emergency.subTitleMarker', { id: s.id })}
                  />
                </Marker>
              ))}
              {userGps && (
                <Marker longitude={userGps.lng} latitude={userGps.lat} anchor="center">
                  <div
                    className="h-3.5 w-3.5 rounded-full border-2 border-white bg-sky-500 shadow-md"
                    title={t('emergency.gpsTitle')}
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
                  title={t('emergency.alertPointTitle')}
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
              {t('emergency.mapboxMissing')}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <div className="text-xs text-slate-600 sm:text-sm">
            {t('emergency.latLngLine', { lat: Number(mapLat).toFixed(5), lng: Number(mapLng).toFixed(5) })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyGps}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              <FaLocationCrosshairs className="h-4 w-4 text-sky-600" />
              {t('emergency.getGps')}
            </button>
            <button
              type="button"
              onClick={() => (onConfirm ? onConfirm() : onClose())}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              {t('emergency.done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmergencyAlertsPage() {
  const { t } = useTranslation();
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
  const [submitting, setSubmitting] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  /** { type: 'delete', id } | { type: 'unlink' } */
  const [confirmDialog, setConfirmDialog] = useState(null);
  /** true: đóng bản đồ bằng «Xong» sẽ gọi API tạo đăng ký (sau khi đã kiểm tra Telegram). */
  const [pendingCreateAfterPick, setPendingCreateAfterPick] = useState(false);
  const pendingCreateNameRef = useRef('');
  const [createNameModalOpen, setCreateNameModalOpen] = useState(false);
  const [createNameInput, setCreateNameInput] = useState('');
  const [subSearch, setSubSearch] = useState('');

  /** null | subscription — sửa trong popup */
  const [editModalSub, setEditModalSub] = useState(null);
  const [editModalName, setEditModalName] = useState('');
  const [editModalRadius, setEditModalRadius] = useState(500);
  const [editModalActive, setEditModalActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

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
    const intervalId = setInterval(async () => {
      const st = await getTelegramLinkStatus();
      if (st.success && st.data?.linked) {
        setTelegramPoll(false);
        setSuccess(t('emergency.tgLinkedOk'));
        await loadAll();
      }
    }, 4000);
    const stop = setTimeout(() => setTelegramPoll(false), 120000);
    return () => {
      clearInterval(intervalId);
      clearTimeout(stop);
    };
  }, [telegramPoll, loadAll, t]);

  const filteredSubs = useMemo(() => {
    const q = subSearch.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter(
      (s) =>
        String(s.id).includes(q) ||
        String(s.radius).includes(q) ||
        getSubscriptionDisplayName(s).toLowerCase().includes(q) ||
        `${Number(s.lat).toFixed(4)} ${Number(s.lng).toFixed(4)}`.includes(q)
    );
  }, [subs, subSearch]);

  const submitCreateSubscription = useCallback(async () => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    const payload = {
      lat: Number(formLat),
      lng: Number(formLng),
      radius: Number(radius),
      notification_methods: TELEGRAM_METHODS
    };
    const nm = clipEmergencySubscriptionName(pendingCreateNameRef.current);
    payload.name = nm === '' ? null : nm;
    const res = await createEmergencySubscription(payload);
    setSubmitting(false);
    pendingCreateNameRef.current = '';
    if (res.success) {
      setSuccess(res.message || t('emergency.createdOk'));
      await loadAll();
    } else {
      setError(res.error || t('emergency.createFail'));
    }
  }, [formLat, formLng, radius, loadAll, t]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!profile?.telegram_linked) {
      setError(t('emergency.needTgFirst'));
      return;
    }
    setCreateNameInput('');
    setCreateNameModalOpen(true);
  };

  const cancelCreateNameModal = () => {
    setCreateNameModalOpen(false);
    setCreateNameInput('');
  };

  const confirmCreateNameAndOpenMap = () => {
    setError('');
    pendingCreateNameRef.current = clipEmergencySubscriptionName(createNameInput);
    setCreateNameModalOpen(false);
    setCreateNameInput('');
    setPendingCreateAfterPick(true);
    setMapPickerOpen(true);
  };

  const openMapPickerOnly = () => {
    setPendingCreateAfterPick(false);
    setMapPickerOpen(true);
  };

  const closeMapPicker = () => {
    setMapPickerOpen(false);
    setPendingCreateAfterPick(false);
    pendingCreateNameRef.current = '';
  };

  const confirmMapPicker = () => {
    setMapPickerOpen(false);
    if (pendingCreateAfterPick) {
      setPendingCreateAfterPick(false);
      void submitCreateSubscription();
    }
  };

  const openEditModal = (sub) => {
    setEditModalSub(sub);
    const raw = sub.name;
    setEditModalName(typeof raw === 'string' ? raw : '');
    setEditModalRadius(sub.radius ?? 500);
    setEditModalActive(sub.is_active !== false);
  };

  const closeEditModal = () => {
    setEditModalSub(null);
    setEditSaving(false);
  };

  const saveEditModal = async () => {
    if (!editModalSub) return;
    setError('');
    if (!profile?.telegram_linked) {
      setError(t('emergency.needTgMaintain'));
      return;
    }
    setEditSaving(true);
    const body = {
      radius: Number(editModalRadius),
      notification_methods: TELEGRAM_METHODS,
      is_active: editModalActive,
      lat: Number(editModalSub.lat),
      lng: Number(editModalSub.lng)
    };
    const trimmed = clipEmergencySubscriptionName(editModalName);
    body.name = trimmed === '' ? null : trimmed;
    const res = await updateEmergencySubscription(editModalSub.id, body);
    setEditSaving(false);
    if (res.success) {
      setSuccess(t('emergency.updatedOk'));
      closeEditModal();
      await loadAll();
    } else {
      setError(res.error || t('emergency.updateFail'));
    }
  };

  const removeSub = (id) => {
    setConfirmDialog({ type: 'delete', id });
  };

  const confirmDeleteSub = async () => {
    if (confirmDialog?.type !== 'delete') return;
    const id = confirmDialog.id;
    setConfirmDialog(null);
    const res = await deleteEmergencySubscription(id);
    if (res.success) {
      setSuccess(t('emergency.deletedOk'));
      await loadAll();
    } else {
      setError(res.error || t('emergency.deleteFail'));
    }
  };

  const requestTelegramUnlink = () => {
    setConfirmDialog({ type: 'unlink' });
  };

  const confirmTelegramUnlink = async () => {
    if (confirmDialog?.type !== 'unlink') return;
    setConfirmDialog(null);
    setTgBusy(true);
    const res = await deleteTelegramUnlink();
    setTgBusy(false);
    if (res.success) {
      setSuccess(t('emergency.unlinkedOk'));
      await loadAll();
    } else {
      setError(res.error || t('emergency.unlinkFail'));
    }
  };

  const onTelegramLink = async () => {
    setError('');
    setTgBusy(true);
    const res = await postTelegramLink();
    setTgBusy(false);
    if (!res.success) {
      setError(res.error || t('emergency.linkFail'));
      return;
    }
    const link = res.data?.deep_link || res.data?.deepLink;
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
      setTelegramPoll(true);
      setSuccess(t('emergency.tgOpened'));
    } else {
      setError(t('emergency.noDeepLink'));
    }
  };

  const useMyLocationInline = () => {
    if (!navigator.geolocation) {
      setError(t('emergency.geoUnsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLat(pos.coords.latitude);
        setFormLng(pos.coords.longitude);
        setUserGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSuccess(t('emergency.gpsOk'));
      },
      () => setError(t('emergency.gpsError'))
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
      t('emergency.you');
    const avatar = profile?.avatar ?? u?.avatar ?? null;
    return { displayName: name, avatarFileName: avatar };
    // pickMarkerRev: bust pick marker when profile/avatar updates without profile ref change
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional invalidation
  }, [profile, pickMarkerRev, t]);

  if (loading) {
    return (
      <div style={pageShellStyle}>
        <div style={heroStyle}>
          <h1 style={heroTitleStyle}>{t('emergency.heroTitle')}</h1>
          <p style={heroSubtitleStyle}>{t('emergency.heroSubtitle')}</p>
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
      <ConfirmDialog
        open={confirmDialog?.type === 'delete'}
        title={t('emergency.deleteTitle')}
        description={t('emergency.deleteDesc')}
        confirmLabel={t('emergency.deleteConfirm')}
        cancelLabel={t('emergency.cancelBtn')}
        variant="danger"
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => void confirmDeleteSub()}
      />
      <ConfirmDialog
        open={confirmDialog?.type === 'unlink'}
        title={t('emergency.unlinkTitle')}
        description={t('emergency.unlinkDesc')}
        confirmLabel={t('emergency.unlinkConfirm')}
        cancelLabel={t('emergency.cancelBtn')}
        variant="danger"
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => void confirmTelegramUnlink()}
      />

      <EmergencyStackModal
        open={createNameModalOpen}
        title={t('emergency.nameModalTitle')}
        description={t('emergency.nameModalDesc')}
        onClose={cancelCreateNameModal}
        footer={
          <>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={cancelCreateNameModal}
            >
              {t('emergency.cancelBtn')}
            </button>
            <button
              type="button"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              onClick={confirmCreateNameAndOpenMap}
            >
              {t('emergency.continuePick')}
            </button>
          </>
        }
      >
        <label className="block text-sm font-medium text-slate-800">
          {t('emergency.nameFieldLabel')}
          <input
            type="text"
            value={createNameInput}
            onChange={(e) => setCreateNameInput(e.target.value)}
            maxLength={EMERGENCY_SUB_NAME_MAX}
            autoFocus
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder={t('emergency.namePlaceholder')}
          />
        </label>
      </EmergencyStackModal>

      <EmergencyStackModal
        open={editModalSub != null}
        title={t('emergency.editTitle')}
        description={
          editModalSub ? (
            <span>
              {t('emergency.editCoordsNote', {
                lat: Number(editModalSub.lat).toFixed(5),
                lng: Number(editModalSub.lng).toFixed(5)
              })}
            </span>
          ) : null
        }
        onClose={closeEditModal}
        footer={
          <>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={closeEditModal}
            >
              {t('emergency.cancelBtn')}
            </button>
            <button
              type="button"
              disabled={editSaving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
              onClick={() => void saveEditModal()}
            >
              {editSaving ? t('emergency.saving') : t('emergency.save')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-800">
            {t('emergency.displayNameLabel')}
            <input
              type="text"
              value={editModalName}
              onChange={(e) => setEditModalName(e.target.value)}
              maxLength={EMERGENCY_SUB_NAME_MAX}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder={t('emergency.editNamePh')}
            />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            {t('emergency.radiusLabel')}
            <input
              type="number"
              min={100}
              value={editModalRadius}
              onChange={(e) => setEditModalRadius(Number(e.target.value))}
              className="mt-1.5 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
          <p className="text-sm text-slate-600">{t('emergency.channelTelegramNote')}</p>
          <label className="flex items-center gap-3 text-sm text-slate-800">
            <ToggleSwitch checked={editModalActive} onChange={(v) => setEditModalActive(v)} />
            {t('emergency.subActive')}
          </label>
        </div>
      </EmergencyStackModal>

      <div style={heroStyle}>
        <h1 style={heroTitleStyle}>{t('emergency.heroTitle')}</h1>
        <p style={heroSubtitleStyle}>{t('emergency.heroSubtitle')}</p>
      </div>

      <EmergencyMapModal
        open={mapPickerOpen}
        onClose={closeMapPicker}
        onConfirm={confirmMapPicker}
        fromCreateFlow={pendingCreateAfterPick}
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
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{t('emergency.setupTitle')}</h2>
            <p className="mt-1 text-sm text-slate-600">{t('emergency.setupLead')}</p>
          </div>
          <div className="relative w-full shrink-0 sm:max-w-sm">
            <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={subSearch}
              onChange={(e) => setSubSearch(e.target.value)}
              placeholder={t('emergency.searchSubsPh')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{t('emergency.tgSection')}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {t('emergency.tgStatusLead')}{' '}
                <strong
                  className={profile?.telegram_linked ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}
                >
                  {profile?.telegram_linked ? t('emergency.tgLinked') : t('emergency.tgNotLinked')}
                </strong>
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
                {tgBusy ? t('emergency.tgBusy') : t('emergency.tgOpenLink')}
              </button>
              {profile?.telegram_linked && (
                <button
                  type="button"
                  disabled={tgBusy}
                  onClick={requestTelegramUnlink}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {t('emergency.unlinkBtn')}
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleCreate} className="border-b border-slate-200">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h3 className="text-base font-semibold text-slate-900">{t('emergency.newSubTitle')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('emergency.newSubHelp')}</p>
          </div>
          <div className="min-w-0 divide-y divide-slate-100">
              <div className="px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">{t('emergency.radiusLabelShort')}</span>
                  <span className="text-sm tabular-nums text-slate-600">{t('emergency.radiusMeters', { radius })}</span>
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
                  <div className="text-sm font-medium text-slate-800">{t('emergency.centerLabel')}</div>
                  <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                    {Number(formLat).toFixed(5)}, {Number(formLng).toFixed(5)}
                    {userGps ? t('emergency.gpsSuffix') : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openMapPickerOnly}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    <FaMapLocationDot className="h-4 w-4 text-sky-600" />
                    {t('emergency.openMapPick')}
                  </button>
                  <button
                    type="button"
                    onClick={useMyLocationInline}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    <FaLocationCrosshairs className="h-4 w-4 text-sky-600" />
                    {t('emergency.quickGps')}
                  </button>
                </div>
              </div>
              {!MAPBOX_TOKEN && (
                <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6">
                  <label className="text-sm text-slate-700">
                    {t('emergency.lat')}
                    <input
                      type="number"
                      step="any"
                      value={formLat}
                      onChange={(e) => setFormLat(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    {t('emergency.lng')}
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
              <div className="space-y-2 px-4 py-4 sm:px-6 sm:py-5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {submitting ? t('emergency.submitting') : t('emergency.createSub')}
                </button>
                <p className="max-w-xl text-xs leading-relaxed text-slate-500">{t('emergency.channelTelegramCreate')}</p>
              </div>
            </div>
        </form>

        <div className="flex-1">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h3 className="text-base font-semibold text-slate-900">{t('emergency.mySubsTitle')}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {t('emergency.subListCount', { shown: filteredSubs.length, total: subs.length })}
            </p>
          </div>
          <div className="min-w-0 divide-y divide-slate-100">
              {filteredSubs.length === 0 ? (
                <div className="px-4 py-8 text-sm text-slate-500 sm:px-6">
                  {subs.length === 0 ? t('emergency.noSubs') : t('emergency.noSearchMatch')}
                </div>
              ) : (
                filteredSubs.map((sub) => (
                  <div key={sub.id} className="px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <ToggleSwitch
                          checked={sub.is_active !== false}
                          onChange={async (v) => {
                            setError('');
                            const body = {
                              radius: Number(sub.radius),
                              notification_methods: TELEGRAM_METHODS,
                              is_active: v,
                              lat: Number(sub.lat),
                              lng: Number(sub.lng)
                            };
                            const res = await updateEmergencySubscription(sub.id, body);
                            if (res.success) {
                              setSuccess(v ? t('emergency.subOn') : t('emergency.subOff'));
                              await loadAll();
                            } else {
                              setError(res.error || t('emergency.toggleFail'));
                            }
                          }}
                        />
                        <div className="min-w-0">
                          <div
                            className="font-medium text-slate-900"
                            style={getSubscriptionTitleStyle(sub)}
                          >
                            {getSubscriptionDisplayName(sub)} {t('emergency.subRadiusSuffix', { radius: sub.radius })}
                          </div>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {subscriptionChannelLine()} · {Number(sub.lat).toFixed(4)},{' '}
                            {Number(sub.lng).toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(sub)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        >
                          <FaPen className="h-3.5 w-3.5" /> {t('emergency.editDetails')}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSub(sub.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          <FaTrash className="h-3.5 w-3.5" /> {t('emergency.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
