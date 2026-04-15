import React, { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM, statusColors } from '../utils/constants';
import { fetchSafePath, fetchFloodData, fetchCrowdReports } from '../services/api';
import ErrorToast from '../components/common/ErrorToast';
import { FaLocationCrosshairs, FaRoute } from 'react-icons/fa6';
import { fetchAddressFromCoords, searchPlaces } from '../utils/geocode';
import { POLLING_INTERVALS, CROWD_REPORT_MAP_DISPLAY_HOURS } from '../config/apiConfig';
import { filterNonExpiredReports } from '../utils/reportHelpers';
import SensorMarker from '../components/map/SensorMarker';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const defaultLng = DEFAULT_CENTER[1];
const defaultLat = DEFAULT_CENTER[0];

const getCrowdMarkerColor = (report) => {
  const moderationStatus = report.moderation_status;
  if (moderationStatus === 'approved') {
    const levelColors = { 'Nặng': '#dc3545', 'Trung bình': '#ffc107', 'Nhẹ': '#17a2b8' };
    return report.flood_level && levelColors[report.flood_level] ? levelColors[report.flood_level] : '#28a745';
  }
  if (moderationStatus === 'rejected') return '#dc3545';
  const validationStatus = report.validation_status;
  const displayStatus = moderationStatus === 'pending' || !moderationStatus ? validationStatus : moderationStatus;
  if (displayStatus === 'pending') return '#ffc107';
  if (report.verified_by_sensor || displayStatus === 'cross_verified') return '#28a745';
  if (displayStatus === 'verified') return '#17a2b8';
  return '#6c757d';
};

const VEHICLES = [
  { id: 'motorbike', label: 'Xe máy' },
  { id: 'car', label: 'Ô tô' },
  { id: 'suv', label: 'SUV' }
];

const FLOOD_SOURCE_LABELS = {
  crowd_report_hours: 'Khoảng thời gian crowd report (giờ)',
  crowd_edge_buffer_m: 'Vùng đệm cạnh đường từ report (m)',
  crowd_recency_half_life_hours: 'Bán rã theo thời gian report (giờ)',
  crowd_min_reliability: 'Độ tin cậy crowd report tối thiểu (%)',
  crowd_max_boost: 'Mức tăng trọng số tối đa'
};

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

function buildRouteGeoJSON(result) {
  const segments = Array.isArray(result?.route?.segments) ? result.route.segments : [];
  const avoided = result?.avoided || {};
  const blockedIds = new Set(
    Array.isArray(avoided.blocked_edge_ids) ? avoided.blocked_edge_ids : []
  );
  const nearLimitIds = new Set(
    Array.isArray(avoided.near_limit_edge_ids) ? avoided.near_limit_edge_ids : []
  );
  const features = segments
    .map((seg, idx) => {
      const from = pickLngLat(seg.from || seg.start || seg, '');
      const to = pickLngLat(seg.to || seg.end || seg, '');
      if (!from || !to) return null;
      const edgeId =
        seg.edge_id ?? seg.id ?? seg.edge ?? seg.edgeId ?? seg.segment_id ?? null;
      const rawDepth =
        seg.flood_depth_cm ?? seg.depth_cm ?? seg.water_depth_cm ?? seg.depth ?? null;
      const depthCm = rawDepth != null && Number.isFinite(Number(rawDepth))
        ? Number(rawDepth)
        : null;
      let status = 'normal';
      if (edgeId != null) {
        if (blockedIds.has(edgeId)) status = 'blocked';
        else if (nearLimitIds.has(edgeId)) status = 'near_limit';
      }
      return {
        type: 'Feature',
        id: `seg-${idx}`,
        properties: { idx, edgeId, depthCm, status },
        geometry: { type: 'LineString', coordinates: [from, to] }
      };
    })
    .filter(Boolean);
  return { type: 'FeatureCollection', features };
}

export default function RoutingPage() {
  const [startLat, setStartLat] = useState(null);
  const [startLng, setStartLng] = useState(null);
  const [endLat, setEndLat] = useState(null);
  const [endLng, setEndLng] = useState(null);
  const [pickMode, setPickMode] = useState('none');
  const [vehicleType, setVehicleType] = useState('motorbike');
  const [nearestNodeMaxM, setNearestNodeMaxM] = useState(1200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromLocked, setFromLocked] = useState(false);
  const [toLocked, setToLocked] = useState(false);
  const [fromOptions, setFromOptions] = useState([]);
  const [toOptions, setToOptions] = useState([]);
  const [searchingFrom, setSearchingFrom] = useState(false);
  const [searchingTo, setSearchingTo] = useState(false);
  const [showAdvancedCoords, setShowAdvancedCoords] = useState(false);
  const [floodData, setFloodData] = useState([]);
  const [crowdReports, setCrowdReports] = useState([]);
  const endpointRef = useRef(null);
  const mapRef = useRef(null);

  const routeGeoJSON = useMemo(() => buildRouteGeoJSON(result), [result]);
  const found = !!result?.found;
  const etaMin =
    result?.route?.total_cost_sec != null ? Math.max(1, Math.round(Number(result.route.total_cost_sec) / 60)) : null;
  const distanceKm =
    result?.route?.total_distance_m != null ? Number(result.route.total_distance_m) / 1000 : null;
  const numberFormatter = useMemo(
    () =>
      typeof Intl !== 'undefined'
        ? new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
        : { format: (v) => (typeof v === 'number' ? v.toFixed(2) : String(v)) },
    []
  );
  const floodSources = result?.flood_sources;
  const floodSourcesSummary = useMemo(() => {
    if (!floodSources || typeof floodSources !== 'object') return [];
    if (Array.isArray(floodSources)) {
      return floodSources.map((item, idx) => ({
        label: item?.source || item?.name || `Nguồn ${idx + 1}`,
        value: item?.count ?? item?.value ?? JSON.stringify(item)
      }));
    }
    return Object.entries(floodSources).map(([k, v]) => {
      if (typeof v === 'object' && v != null) {
        return {
          label: FLOOD_SOURCE_LABELS[k] || k,
          value: JSON.stringify(v)
        };
      }
      if (v == null) {
        return { label: FLOOD_SOURCE_LABELS[k] || k, value: '—' };
      }
      let formatted;
      const num = Number(v);
      switch (k) {
        case 'crowd_min_reliability':
          formatted = Number.isFinite(num) ? `${num}%` : String(v);
          break;
        case 'crowd_report_hours':
          formatted = Number.isFinite(num) ? `${num} giờ` : String(v);
          break;
        case 'crowd_edge_buffer_m':
          formatted = Number.isFinite(num) ? `${num} m` : String(v);
          break;
        case 'crowd_max_boost':
          formatted = Number.isFinite(num) ? `x${num}` : String(v);
          break;
        default:
          formatted = String(v);
      }
      return {
        label: FLOOD_SOURCE_LABELS[k] || k,
        value: formatted
      };
    });
  }, [floodSources]);
  const vehicle = result?.vehicle || null;
  const vehicleName = vehicle?.name || null;
  const vehicleMaxDepthCm =
    vehicle?.maxWadingDepthCm ?? vehicle?.max_wading_depth_cm ?? vehicle?.max_wading_depth ?? null;

  const startNode = result?.start_node || null;
  const endNode = result?.end_node || null;
  const formatNodeInfo = (node) => {
    if (!node) return { id: '—', distanceText: null };
    const id = node.id ?? node;
    const dist = node.distance_m != null ? Number(node.distance_m) : null;
    return {
      id,
      distanceText: dist != null && Number.isFinite(dist) ? `${numberFormatter.format(dist)} m` : null
    };
  };
  const startNodeInfo = formatNodeInfo(startNode);
  const endNodeInfo = formatNodeInfo(endNode);
  const nodePathCount = Array.isArray(result?.node_path) ? result.node_path.length : 0;
  const [showAdvancedInfo, setShowAdvancedInfo] = useState(false);
  const nonExpiredCrowdReports = useMemo(
    () => filterNonExpiredReports(crowdReports, CROWD_REPORT_MAP_DISPLAY_HOURS),
    [crowdReports]
  );
  const hasChosenStart = useMemo(
    () => startLat != null && startLng != null,
    [startLat, startLng]
  );

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
      setFromLocked(false);
      fetchAddressFromCoords(p.lat, p.lng, { mapboxToken: MAPBOX_TOKEN })
        .then((addr) => {
          if (addr) {
            setFromQuery(addr);
            setFromLocked(true);
            setFromOptions([]);
          }
        })
        .catch(() => {});
    } else if (pickMode === 'end') {
      setEndLng(p.lng);
      setEndLat(p.lat);
      setToLocked(false);
      fetchAddressFromCoords(p.lat, p.lng, { mapboxToken: MAPBOX_TOKEN })
        .then((addr) => {
          if (addr) {
            setToQuery(addr);
            setToLocked(true);
            setToOptions([]);
          }
        })
        .catch(() => {});
    } else {
      return;
    }
    setPickMode('none');
  };

  // Load cảm biến mực nước (giống trang bản đồ chính)
  useEffect(() => {
    const loadData = async () => {
      const result = await fetchFloodData(endpointRef);
      if (result.success && result.data) {
        setFloodData(result.data);
      } else if (result.data === null) {
      } else {
        setFloodData([]);
      }
    };

    loadData();
    const interval = setInterval(loadData, POLLING_INTERVALS.FLOOD_DATA);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadCrowdReports = async () => {
      const result = await fetchCrowdReports({ moderation_status: 'approved' });
      if (result.success && result.data) {
        setCrowdReports(result.data);
      }
    };

    loadCrowdReports();
    const interval = setInterval(loadCrowdReports, POLLING_INTERVALS.CROWD_REPORTS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!result) return;
    setResult(null);
  }, [fromQuery, toQuery, startLat, startLng, endLat, endLng]);

  // Khi có route mới, tự động zoom map bao trùm toàn bộ đường đi cho dễ nhìn
  useEffect(() => {
    if (!found || !routeGeoJSON.features.length || !mapRef.current) return;
    const coords = routeGeoJSON.features.flatMap((f) => f.geometry?.coordinates || []);
    if (!coords.length) return;
    let minLng = coords[0][0];
    let maxLng = coords[0][0];
    let minLat = coords[0][1];
    let maxLat = coords[0][1];
    coords.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
    const map = mapRef.current.getMap ? mapRef.current.getMap() : mapRef.current;
    if (map && map.fitBounds) {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat]
        ],
        { padding: 60, duration: 800, maxZoom: 17 }
      );
    }
  }, [found, routeGeoJSON]);

  useEffect(() => {
    let cancelled = false;
    const q = (fromQuery || '').trim();
    if (fromLocked) {
      setFromOptions([]);
      setSearchingFrom(false);
      return undefined;
    }
    if (!q || q.length < 3) {
      setFromOptions([]);
      setSearchingFrom(false);
      return undefined;
    }
    setSearchingFrom(true);
    const t = setTimeout(async () => {
      try {
        const list = await searchPlaces(q, { mapboxToken: MAPBOX_TOKEN, limit: 5 });
        if (!cancelled) setFromOptions(list);
      } finally {
        if (!cancelled) setSearchingFrom(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [fromQuery]);

  useEffect(() => {
    let cancelled = false;
    const q = (toQuery || '').trim();
    if (toLocked) {
      setToOptions([]);
      setSearchingTo(false);
      return undefined;
    }
    if (!q || q.length < 3) {
      setToOptions([]);
      setSearchingTo(false);
      return undefined;
    }
    setSearchingTo(true);
    const t = setTimeout(async () => {
      try {
        const list = await searchPlaces(q, { mapboxToken: MAPBOX_TOKEN, limit: 5 });
        if (!cancelled) setToOptions(list);
      } finally {
        if (!cancelled) setSearchingTo(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [toQuery]);

  const applySuggestion = (type, option) => {
    if (!option || option.lat == null || option.lng == null) return;
    if (type === 'from') {
      setStartLat(option.lat);
      setStartLng(option.lng);
      setFromQuery(option.fullAddress || option.name);
      setFromLocked(true);
      setFromOptions([]);
    } else {
      setEndLat(option.lat);
      setEndLng(option.lng);
      setToQuery(option.fullAddress || option.name);
      setToLocked(true);
      setToOptions([]);
    }
  };

  const searchRoute = async () => {
    if (startLat == null || startLng == null || endLat == null || endLng == null) {
      setError('Vui lòng chọn đầy đủ điểm đi và điểm đến (địa chỉ hoặc trên bản đồ).');
      return;
    }
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
        <h1 className="text-2xl font-bold text-slate-900">Tìm đường an toàn</h1>
        <p className="mt-1 text-sm text-slate-600">
          Chọn điểm đi/đến để tìm lộ trình tránh đoạn ngập theo loại xe.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            <label className="block text-sm">
              Địa chỉ điểm đi
              <div className="mt-1">
                <input
                  type="text"
                  value={fromQuery}
                  onChange={(e) => {
                    setFromLocked(false);
                    setFromQuery(e.target.value);
                  }}
                  placeholder="Ví dụ: Nguyễn Văn B, Bình Thạnh"
                  className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                />
              </div>
              {searchingFrom && (
                <div className="mt-1 text-xs text-slate-500">Đang gợi ý địa chỉ…</div>
              )}
              {fromOptions.length > 0 && (
                <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto rounded border border-slate-200 bg-white text-xs shadow-sm">
                  {fromOptions.map((opt) => (
                    <li
                      key={opt.id}
                      className="cursor-pointer px-2 py-1 hover:bg-slate-100"
                      onClick={() => applySuggestion('from', opt)}
                    >
                      {opt.fullAddress}
                    </li>
                  ))}
                </ul>
              )}
            </label>

            <label className="block text-sm">
              Địa chỉ điểm đến
              <div className="mt-1">
                <input
                  type="text"
                  value={toQuery}
                  onChange={(e) => {
                    setToLocked(false);
                    setToQuery(e.target.value);
                  }}
                  placeholder="Ví dụ: Lê Duẩn, Quận 1"
                  className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                />
              </div>
              {searchingTo && (
                <div className="mt-1 text-xs text-slate-500">Đang gợi ý địa chỉ…</div>
              )}
              {toOptions.length > 0 && (
                <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto rounded border border-slate-200 bg-white text-xs shadow-sm">
                  {toOptions.map((opt) => (
                    <li
                      key={opt.id}
                      className="cursor-pointer px-2 py-1 hover:bg-slate-100"
                      onClick={() => applySuggestion('to', opt)}
                    >
                      {opt.fullAddress}
                    </li>
                  ))}
                </ul>
              )}
            </label>

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
              Bán kính tìm nút gần nhất (m)
              <input
                type="number"
                min={100}
                step={100}
                value={nearestNodeMaxM}
                onChange={(e) => setNearestNodeMaxM(Number(e.target.value))}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
              />
            </label>

            <button
              type="button"
              onClick={() => setShowAdvancedCoords((v) => !v)}
              className="text-xs font-medium text-sky-700 hover:underline"
            >
              {showAdvancedCoords ? 'Ẩn tọa độ chi tiết' : 'Hiện tọa độ chi tiết'}
            </button>

            {showAdvancedCoords && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label>
                  Vĩ độ điểm đi
                  <input
                    type="number"
                    step="any"
                    value={startLat}
                    onChange={(e) => setStartLat(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
                  />
                </label>
                <label>
                  Kinh độ điểm đi
                  <input
                    type="number"
                    step="any"
                    value={startLng}
                    onChange={(e) => setStartLng(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
                  />
                </label>
                <label>
                  Vĩ độ điểm đến
                  <input
                    type="number"
                    step="any"
                    value={endLat}
                    onChange={(e) => setEndLat(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
                  />
                </label>
                <label>
                  Kinh độ điểm đến
                  <input
                    type="number"
                    step="any"
                    value={endLng}
                    onChange={(e) => setEndLng(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
                  />
                </label>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPickMode('start')}
                className={`rounded px-3 py-2 text-sm ${pickMode === 'start' ? 'bg-sky-600 text-white' : 'border border-slate-300'}`}
              >
                Chọn điểm đi trên bản đồ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!hasChosenStart) {
                    setError('Vui lòng chọn điểm đi trước (địa chỉ hoặc trên bản đồ).');
                    return;
                  }
                  setPickMode('end');
                }}
                className={`rounded px-3 py-2 text-sm ${pickMode === 'end' ? 'bg-rose-600 text-white' : 'border border-slate-300'}`}
              >
                Chọn điểm đến trên bản đồ
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
                  <div>
                    Khoảng cách:{' '}
                    {distanceKm != null ? `${numberFormatter.format(distanceKm)} km` : '—'}
                  </div>
                  {vehicleName && (
                    <div>
                      Loại xe: {vehicleName}
                      {vehicleMaxDepthCm != null &&
                        ` (chịu ngập tối đa khoảng ${numberFormatter.format(Number(vehicleMaxDepthCm))} cm)`}
                    </div>
                  )}
                  {vehicleMaxDepthCm != null && (
                    <div className="mt-1 text-xs text-slate-600">
                      Đoạn route màu cam là các cạnh gần chạm ngưỡng ngập khoảng{' '}
                      {numberFormatter.format(Number(vehicleMaxDepthCm))} cm cho loại xe hiện tại.
                    </div>
                  )}
                  <div className="mt-1 text-xs text-slate-600">
                    Nguồn dữ liệu: cảm biến mực nước và crowd report đã duyệt.
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdvancedInfo((v) => !v)}
                    className="mt-3 text-xs font-medium text-sky-700 hover:underline"
                  >
                    {showAdvancedInfo ? 'Ẩn chi tiết kỹ thuật' : 'Xem chi tiết kỹ thuật'}
                  </button>

                  {showAdvancedInfo && (
                    <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs text-slate-700">
                      <div>
                        Số đoạn route: {Array.isArray(result?.route?.segments) ? result.route.segments.length : 0}
                      </div>
                      <div>Số nút trên đường đi: {nodePathCount}</div>
                      <div>
                        Start node: {startNodeInfo.id}
                        {startNodeInfo.distanceText && ` (cách điểm chọn ~${startNodeInfo.distanceText})`} · End node:{' '}
                        {endNodeInfo.id}
                        {endNodeInfo.distanceText && ` (cách điểm chọn ~${endNodeInfo.distanceText})`}
                      </div>
                      <div>
                        Cạnh bị loại bỏ hoàn toàn vì ngập nặng:{' '}
                        {Array.isArray(result?.avoided?.blocked_edge_ids) ? result.avoided.blocked_edge_ids.length : 0}
                        .
                      </div>
                      <div>
                        Cạnh gần ngưỡng ngập (có thể bị né hoặc giảm ưu tiên):{' '}
                        {Array.isArray(result?.avoided?.near_limit_edge_ids)
                          ? result.avoided.near_limit_edge_ids.length
                          : 0}
                        .
                      </div>
                      {floodSourcesSummary.length > 0 && (
                        <div className="mt-1 rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700">
                          <div className="mb-1 font-semibold">Tham số nguồn dữ liệu ngập</div>
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
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{ longitude: defaultLng, latitude: defaultLat, zoom: DEFAULT_ZOOM }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                style={{ width: '100%', height: '100%' }}
                onClick={handleMapClick}
              >
                {startLat != null && startLng != null && (
                  <Marker longitude={startLng} latitude={startLat} anchor="bottom">
                    <div className="h-4 w-4 rounded-full border-2 border-white bg-sky-600" title="Điểm đi" />
                  </Marker>
                )}
                {endLat != null && endLng != null && (
                  <Marker longitude={endLng} latitude={endLat} anchor="bottom">
                    <div className="h-4 w-4 rounded-full border-2 border-white bg-rose-600" title="Điểm đến" />
                  </Marker>
                )}
                {floodData.map((item, index) => {
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
                    />
                  );
                })}
                {nonExpiredCrowdReports.map((report) => {
                  const lat = report.lat;
                  const lng = report.lng;
                  if (lat == null || lng == null) return null;
                  const color = getCrowdMarkerColor(report);
                  return (
                    <Marker
                      key={`crowd-${report.id}`}
                      longitude={lng}
                      latitude={lat}
                      anchor="bottom"
                    >
                      <div
                        className="flex flex-col items-center"
                        title={report.location_description || 'Báo cáo từ người dân'}
                      >
                        <div
                          className="rounded-full border-2 border-white"
                          style={{ width: 18, height: 18, backgroundColor: color }}
                        />
                        <div
                          style={{
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: `8px solid ${color}`,
                            marginTop: -2
                          }}
                        />
                      </div>
                    </Marker>
                  );
                })}
                {found && routeGeoJSON.features.length > 0 && (
                  <Source id="safe-route" type="geojson" data={routeGeoJSON}>
                    <Layer
                      id="route-casing"
                      type="line"
                      paint={{
                        'line-color': '#ffffff',
                        'line-width': 7,
                        'line-opacity': 0.9,
                        'line-join': 'round',
                        'line-cap': 'round'
                      }}
                    />
                    <Layer
                      id="route-normal"
                      type="line"
                      filter={['==', ['get', 'status'], 'normal']}
                      paint={{
                        'line-color': '#0ea5e9',
                        'line-width': 4.5,
                        'line-opacity': 0.98,
                        'line-join': 'round',
                        'line-cap': 'round'
                      }}
                    />
                    <Layer
                      id="route-near-limit"
                      type="line"
                      filter={['==', ['get', 'status'], 'near_limit']}
                      paint={{
                        'line-color': '#f97316',
                        'line-width': 4.5,
                        'line-opacity': 0.98,
                        'line-join': 'round',
                        'line-cap': 'round'
                      }}
                    />
                    <Layer
                      id="route-blocked"
                      type="line"
                      filter={['==', ['get', 'status'], 'blocked']}
                      paint={{
                        'line-color': '#dc2626',
                        'line-width': 5,
                        'line-opacity': 0.98,
                        'line-join': 'round',
                        'line-cap': 'round'
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
