import React, { useCallback, useEffect, useState } from 'react';
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
  deleteTelegramUnlink
} from '../services/api';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../utils/constants';
import ErrorToast from '../components/common/ErrorToast';
import { cn } from '@/lib/cn';
import { FaBell, FaLink, FaTrash, FaPen, FaLocationCrosshairs } from 'react-icons/fa6';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const defaultLng = DEFAULT_CENTER[1];
const defaultLat = DEFAULT_CENTER[0];

const METHOD_OPTIONS = [
  { id: 'email', label: 'Email' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'webhook', label: 'Webhook' }
];

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
  const [radius, setRadius] = useState(500);
  const [methods, setMethods] = useState({ email: true, telegram: false, webhook: false });
  const [submitting, setSubmitting] = useState(false);

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
      const linked = st.success && (st.data?.telegram_linked === true || st.data?.linked === true);
      if (linked) {
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

  const notificationMethodsArray = () =>
    METHOD_OPTIONS.filter((m) => methods[m.id]).map((m) => m.id);

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

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLat(pos.coords.latitude);
        setFormLng(pos.coords.longitude);
        setSuccess('Đã lấy vị trí hiện tại.');
      },
      () => setError('Không lấy được vị trí. Kiểm tra quyền truy cập vị trí.')
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-slate-600">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-start gap-3">
        <FaBell className="mt-1 h-8 w-8 text-sky-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cảnh báo khẩn theo vùng</h1>
          <p className="mt-1 text-sm text-slate-600">
            Đăng ký nhận thông báo khi có nguy cơ ngập nghiêm trọng trong bán kính bạn chọn (C1 — người dùng). Nút
            GPS dùng vị trí của trình duyệt trên thiết bị hiện tại, không lấy từ tài khoản hay máy khác.
          </p>
        </div>
      </div>

      {error && <ErrorToast message={error} onClose={() => setError('')} />}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success}
        </div>
      )}

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Liên kết Telegram</h2>
        <p className="mb-4 text-sm text-slate-600">
          Để nhận cảnh báo qua Telegram, bạn cần liên kết bot một lần. Trạng thái:{' '}
          <strong>{profile?.telegram_linked ? 'Đã liên kết' : 'Chưa liên kết'}</strong>
          {profile?.telegram_linked && profile?.telegram_username ? (
            <>
              {' '}
              (@{String(profile.telegram_username).replace(/^@/, '')})
            </>
          ) : null}
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={tgBusy}
            onClick={onTelegramLink}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white',
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
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Gỡ liên kết
            </button>
          )}
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Đăng ký mới</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Bán kính (mét)</label>
            <input
              type="range"
              min={100}
              max={5000}
              step={100}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-sm text-slate-600">{radius} m</div>
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">Kênh thông báo</span>
            <div className="flex flex-wrap gap-4">
              {METHOD_OPTIONS.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!methods[m.id]}
                    onChange={(e) => setMethods((prev) => ({ ...prev, [m.id]: e.target.checked }))}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={useMyLocation}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <FaLocationCrosshairs /> GPS
            </button>
            <span className="text-xs text-slate-500">
              Lat {Number(formLat).toFixed(5)}, Lng {Number(formLng).toFixed(5)} — click bản đồ để đổi điểm
            </span>
          </div>
          {MAPBOX_TOKEN ? (
            <div className="h-[220px] w-full overflow-hidden rounded-lg border border-slate-200">
              <Map
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{ longitude: formLng, latitude: formLat, zoom: DEFAULT_ZOOM }}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                onClick={(e) => {
                  const { lngLat } = e;
                  if (!lngLat) return;
                  setFormLat(lngLat.lat);
                  setFormLng(lngLat.lng);
                }}
              >
                <Marker longitude={formLng} latitude={formLat} anchor="bottom">
                  <div className="h-4 w-4 rounded-full border-2 border-white bg-red-500 shadow-md" title="Điểm đăng ký" />
                </Marker>
              </Map>
            </div>
          ) : (
            <p className="text-sm text-amber-700">Chưa cấu VITE_MAPBOX_TOKEN — nhập tọa độ thủ công:</p>
          )}
          {!MAPBOX_TOKEN && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Vĩ độ
                <input
                  type="number"
                  step="any"
                  value={formLat}
                  onChange={(e) => setFormLat(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
                />
              </label>
              <label className="text-sm">
                Kinh độ
                <input
                  type="number"
                  step="any"
                  value={formLng}
                  onChange={(e) => setFormLng(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
                />
              </label>
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {submitting ? 'Đang gửi…' : 'Tạo đăng ký'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Đăng ký của tôi ({subs.length})</h2>
        {subs.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có đăng ký nào.</p>
        ) : (
          <ul className="space-y-4">
            {subs.map((sub) => (
              <li key={sub.id} className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                {editingId === sub.id ? (
                  <div className="space-y-3">
                    <label className="text-sm">
                      Bán kính (m)
                      <input
                        type="number"
                        min={100}
                        value={editRadius}
                        onChange={(e) => setEditRadius(Number(e.target.value))}
                        className="mt-1 w-full rounded border px-2 py-1"
                      />
                    </label>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {METHOD_OPTIONS.map((m) => (
                        <label key={m.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!editMethods[m.id]}
                            onChange={(e) =>
                              setEditMethods((prev) => ({ ...prev, [m.id]: e.target.checked }))
                            }
                          />
                          {m.label}
                        </label>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                      Đang bật
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(sub.id)}
                        className="rounded bg-sky-600 px-3 py-1.5 text-sm text-white"
                      >
                        Lưu
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-sm text-slate-600">
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-700">
                      <div>
                        Bán kính <strong>{sub.radius}</strong> m —{' '}
                        {sub.is_active === false ? (
                          <span className="text-amber-700">Tạm tắt</span>
                        ) : (
                          <span className="text-emerald-700">Đang bật</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {(sub.notification_methods || []).join(', ') || '—'} · {Number(sub.lat).toFixed(4)},{' '}
                        {Number(sub.lng).toFixed(4)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(sub)}
                        className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm hover:bg-white"
                      >
                        <FaPen className="h-3.5 w-3.5" /> Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSub(sub.id)}
                        className="inline-flex items-center gap-1 rounded border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                      >
                        <FaTrash className="h-3.5 w-3.5" /> Xóa
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
