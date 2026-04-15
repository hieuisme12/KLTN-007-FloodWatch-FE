import React, { useMemo, useState } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../utils/constants';
import { fetchSafePath } from '../services/api';
import ErrorToast from '../components/common/ErrorToast';
import { FaLocationCrosshairs, FaRoute } from 'react-icons/fa6';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const defaultLng = DEFAULT_CENTER[1];
const defaultLat = DEFAULT_CENTER[0];

const VEHICLES = [
  { id: 'motorbike', label: 'Xe máy' },
  { id: 'car', label: 'Ô tô' },
  { id: 'suv', label: 'SUV' }
];

const toNum = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};

const pickLngLat = (obj, prefix = '') => {
  if (!obj || typeof obj !== 'object') return null;
  const lng = toNum(obj[`${prefix}lng`] ?? obj[`${prefix}longitude`] ?? obj.lng ?? obj.longitude);
  const lat = toNum(obj[`${prefix}lat`] ?? obj[`${prefix}latitude`] ?? obj.lat ?? obj.latitude);
  if (lng == null || lat == null) return null;
  return [lng, lat];
};

function buildRouteGeoJSON(routeData) {
  const segments = Array.isArray(routeData?.route?.segments) ? routeData.route.segments : [];
  const features = segments
    .map((seg, idx) => {
      const from = pickLngLat(seg.from || seg.start || seg, '');
      const to = pickLngLat(seg.to || seg.end || seg, '');
      if (!from || !to) return null;
      return {
        type: 'Feature',
        id: `seg-${idx}`,
        properties: { idx },
        geometry: { type: 'LineString', coordinates: [from, to] }
      };
    })
    .filter(Boolean);
  return { type: 'FeatureCollection', features };
}

export default function RoutingPage() {
  const [startLat, setStartLat] = useState(defaultLat);
  const [startLng, setStartLng] = useState(defaultLng);
  const [endLat, setEndLat] = useState(defaultLat + 0.01);
  const [endLng, setEndLng] = useState(defaultLng + 0.01);
  const [pickMode, setPickMode] = useState('start');
  const [vehicleType, setVehicleType] = useState('motorbike');
  const [nearestNodeMaxM, setNearestNodeMaxM] = useState(1200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const routeGeoJSON = useMemo(() => buildRouteGeoJSON(result), [result]);
  const found = !!result?.found;
  const etaMin =
    result?.route?.total_cost_sec != null ? Math.max(1, Math.round(Number(result.route.total_cost_sec) / 60)) : null;
  const distanceKm =
    result?.route?.total_distance_m != null ? (Number(result.route.total_distance_m) / 1000).toFixed(2) : null;
  const floodSources = result?.flood_sources;
  const floodSourcesSummary = useMemo(() => {
    if (!floodSources || typeof floodSources !== 'object') return [];
    if (Array.isArray(floodSources)) {
      return floodSources.map((item, idx) => ({
        label: item?.source || item?.name || `Nguồn ${idx + 1}`,
        value: item?.count ?? item?.value ?? JSON.stringify(item)
      }));
    }
    return Object.entries(floodSources).map(([k, v]) => ({
      label: k,
      value:
        typeof v === 'object' && v != null
          ? JSON.stringify(v)
          : v == null
            ? '—'
            : String(v)
    }));
  }, [floodSources]);

  const setMyLocationToStart = () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStartLat(pos.coords.latitude);
        setStartLng(pos.coords.longitude);
      },
      () => setError('Không lấy được vị trí hiện tại.')
    );
  };

  const handleMapClick = (e) => {
    const p = e?.lngLat;
    if (!p) return;
    if (pickMode === 'start') {
      setStartLng(p.lng);
      setStartLat(p.lat);
    } else {
      setEndLng(p.lng);
      setEndLat(p.lat);
    }
  };

  const searchRoute = async () => {
    setLoading(true);
    setError('');
    const res = await fetchSafePath({
      start_lng: startLng,
      start_lat: startLat,
      end_lng: endLng,
      end_lat: endLat,
      vehicle_type: vehicleType,
      nearest_node_max_m: nearestNodeMaxM
    });
    setLoading(false);
    if (!res.success) {
      setResult(null);
      setError(res.error || 'Không gọi được API tìm đường an toàn.');
      return;
    }
    setResult(res.data || null);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {error && <ErrorToast message={error} onClose={() => setError('')} />}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tìm đường an toàn (AMC-A*)</h1>
        <p className="mt-1 text-sm text-slate-600">
          Chọn điểm đi/đến để tìm lộ trình tránh đoạn ngập theo loại xe.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            <label className="block text-sm">
              Loại xe
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
              >
                {VEHICLES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              nearest_node_max_m
              <input
                type="number"
                min={100}
                step={100}
                value={nearestNodeMaxM}
                onChange={(e) => setNearestNodeMaxM(Number(e.target.value))}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
              />
            </label>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <label>
                Start lat
                <input
                  type="number"
                  step="any"
                  value={startLat}
                  onChange={(e) => setStartLat(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
                />
              </label>
              <label>
                Start lng
                <input
                  type="number"
                  step="any"
                  value={startLng}
                  onChange={(e) => setStartLng(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
                />
              </label>
              <label>
                End lat
                <input
                  type="number"
                  step="any"
                  value={endLat}
                  onChange={(e) => setEndLat(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
                />
              </label>
              <label>
                End lng
                <input
                  type="number"
                  step="any"
                  value={endLng}
                  onChange={(e) => setEndLng(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPickMode('start')}
                className={`rounded px-3 py-2 text-sm ${pickMode === 'start' ? 'bg-sky-600 text-white' : 'border border-slate-300'}`}
              >
                Đặt điểm đi
              </button>
              <button
                type="button"
                onClick={() => setPickMode('end')}
                className={`rounded px-3 py-2 text-sm ${pickMode === 'end' ? 'bg-rose-600 text-white' : 'border border-slate-300'}`}
              >
                Đặt điểm đến
              </button>
              <button
                type="button"
                onClick={setMyLocationToStart}
                className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <FaLocationCrosshairs /> Dùng vị trí tôi
              </button>
            </div>

            <button
              type="button"
              onClick={searchRoute}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              <FaRoute />
              {loading ? 'Đang tìm…' : 'Tìm đường an toàn'}
            </button>
          </div>

          {result && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              {found ? (
                <>
                  <div>
                    <strong>Kết quả:</strong> Tìm thấy lộ trình an toàn
                  </div>
                  <div>ETA: {etaMin != null ? `${etaMin} phút` : '—'}</div>
                  <div>Khoảng cách: {distanceKm != null ? `${distanceKm} km` : '—'}</div>
                  <div>Số đoạn route: {Array.isArray(result?.route?.segments) ? result.route.segments.length : 0}</div>
                  <div>
                    Start node: {result?.start_node?.id ?? result?.start_node ?? '—'} · End node:{' '}
                    {result?.end_node?.id ?? result?.end_node ?? '—'}
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    Tránh: {Array.isArray(result?.avoided?.blocked_edge_ids) ? result.avoided.blocked_edge_ids.length : 0}{' '}
                    đoạn ngập nặng; gần ngưỡng:{' '}
                    {Array.isArray(result?.avoided?.near_limit_edge_ids) ? result.avoided.near_limit_edge_ids.length : 0}.
                  </div>
                  {floodSourcesSummary.length > 0 && (
                    <div className="mt-2 rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700">
                      <div className="mb-1 font-semibold">Nguồn dữ liệu ngập dùng cho route</div>
                      <ul className="space-y-0.5">
                        {floodSourcesSummary.map((item, idx) => (
                          <li key={`fs-${idx}`}>
                            {item.label}: {item.value}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Bao gồm sensor và crowd report đã duyệt; report mới và reliability cao có tác động né ngập mạnh hơn.
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-amber-800">
                  Không có đường an toàn cho loại xe hiện tại. Gợi ý: đổi sang <strong>SUV</strong> hoặc chỉnh lại điểm đi/đến.
                </div>
              )}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {MAPBOX_TOKEN ? (
            <div className="h-[640px] w-full">
              <Map
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{ longitude: defaultLng, latitude: defaultLat, zoom: DEFAULT_ZOOM }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                style={{ width: '100%', height: '100%' }}
                onClick={handleMapClick}
              >
                <Marker longitude={startLng} latitude={startLat} anchor="bottom">
                  <div className="h-4 w-4 rounded-full border-2 border-white bg-sky-600" title="Điểm đi" />
                </Marker>
                <Marker longitude={endLng} latitude={endLat} anchor="bottom">
                  <div className="h-4 w-4 rounded-full border-2 border-white bg-rose-600" title="Điểm đến" />
                </Marker>
                {found && routeGeoJSON.features.length > 0 && (
                  <Source id="safe-route" type="geojson" data={routeGeoJSON}>
                    <Layer
                      id="safe-route-line"
                      type="line"
                      paint={{
                        'line-color': '#0ea5e9',
                        'line-width': 5,
                        'line-opacity': 0.95
                      }}
                    />
                  </Source>
                )}
              </Map>
            </div>
          ) : (
            <div className="p-4 text-sm text-amber-700">
              Chưa cấu hình `VITE_MAPBOX_TOKEN`. Bạn vẫn có thể nhập tọa độ và bấm “Tìm đường an toàn”.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
