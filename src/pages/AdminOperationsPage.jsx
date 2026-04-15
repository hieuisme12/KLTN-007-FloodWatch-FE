import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminDevicesHealth,
  fetchAdminEmergencyAlertsSummary
} from '../services/api';
import { isAdmin } from '../utils/auth';
import { useNavigate } from 'react-router-dom';
import ErrorToast from '../components/common/ErrorToast';
import { FaServer, FaChartColumn } from 'react-icons/fa6';

const statusBadgeClass = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'online') return 'bg-emerald-100 text-emerald-800';
  if (s === 'degraded') return 'bg-amber-100 text-amber-900';
  if (s === 'offline' || s === 'inactive') return 'bg-slate-200 text-slate-800';
  return 'bg-slate-100 text-slate-700';
};

/** Chuẩn hóa danh sách thiết bị từ nhiều dạng response BE */
function normalizeDeviceRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.devices)) return payload.devices;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export default function AdminOperationsPage() {
  const navigate = useNavigate();
  const [hours, setHours] = useState(24);
  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!isAdmin()) return;
    setLoading(true);
    setError('');
    const [h, s] = await Promise.all([fetchAdminDevicesHealth(), fetchAdminEmergencyAlertsSummary(hours)]);
    setHealth(h.success ? h.data : null);
    if (!h.success && h.error) setError((prev) => (prev ? `${prev} ` : '') + h.error);
    setSummary(s.success ? s.data : null);
    if (!s.success && s.error) setError((prev) => (prev ? `${prev} ` : '') + s.error);
    setLoading(false);
  }, [hours]);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/', { replace: true });
      return;
    }
    queueMicrotask(() => void load());
  }, [load, navigate]);

  const devices = normalizeDeviceRows(health);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vận hành hệ thống</h1>
          <p className="mt-1 text-sm text-slate-600">
            B1 — sức khỏe thiết bị; C1 — thống kê cảnh báo đa kênh. Chỉ tài khoản <strong>admin</strong>.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          Khung giờ thống kê
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="rounded border border-slate-300 px-2 py-1"
          >
            {[1, 6, 12, 24, 48, 72, 168].map((h) => (
              <option key={h} value={h}>
                {h}h
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
          >
            Tải lại
          </button>
        </label>
      </div>

      {error && <ErrorToast message={error} onClose={() => setError('')} />}

      {loading && <p className="text-slate-600">Đang tải…</p>}

      {!loading && (
        <>
          <section className="mb-10">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800">
              <FaServer className="h-5 w-5 text-sky-600" />
              Sức khỏe thiết bị
            </h2>
            {devices.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Không có dữ liệu hoặc API từ chối. Kiểm tra JWT admin và Swagger{' '}
                <code className="text-xs">GET /api/v1/admin/devices/health</code>.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-700">Trạm / ID</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Đo gần nhất</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((row, idx) => {
                      const id = row.sensor_id ?? row.id ?? row.device_id ?? idx;
                      const name = row.location_name ?? row.name ?? row.label ?? `Sensor ${id}`;
                      const st = row.health_status ?? row.status ?? row.state ?? '—';
                      const last =
                        row.last_measurement_at ??
                        row.last_seen_at ??
                        row.last_data_time ??
                        row.last_log_at ??
                        '—';
                      return (
                        <tr key={String(id)} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3 text-slate-800">
                            <div className="font-medium">{name}</div>
                            <div className="text-xs text-slate-500">{String(id)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(st)}`}
                            >
                              {String(st)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{String(last)}</td>
                          <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-500">
                            {row.note ?? row.message ?? ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800">
              <FaChartColumn className="h-5 w-5 text-violet-600" />
              Thống kê cảnh báo khẩn ({hours}h)
            </h2>
            {summary == null ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Không tải được tóm tắt. Xem <code className="text-xs">GET /api/v1/admin/emergency-alerts/summary</code>.
              </p>
            ) : (
              <pre className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-4 text-xs text-emerald-100">
                {JSON.stringify(summary, null, 2)}
              </pre>
            )}
          </section>
        </>
      )}
    </div>
  );
}
