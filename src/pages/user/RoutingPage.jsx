import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Map, { Marker, Source, Layer, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM, statusColors } from '../../utils/constants';
import { fetchSafePath, fetchFloodData, fetchCrowdReports } from '../../services/api';
import ErrorToast from '../../components/common/ErrorToast';
import SearchAutoComplete from '../../components/common/SearchAutoComplete';
import {
  FaArrowRightArrowLeft,
  FaCarSide,
  FaLink,
  FaLocationCrosshairs,
  FaLocationDot,
  FaMotorcycle,
  FaRoute,
  FaTruck,
  FaStreetView,
  FaTrash,
  FaXmark
} from 'react-icons/fa6';
import { getSafeUserFacingError } from '../../utils/safeErrorMessage';
import {
  fetchAddressFromCoords,
  resolveGeocodePlaceSelection,
  searchPlacesUnified
} from '../../utils/geocode';
import { POLLING_INTERVALS, CROWD_REPORT_MAP_DISPLAY_HOURS } from '../../config/apiConfig';
import { filterNonExpiredReports } from '../../utils/reportHelpers';
import SensorMarker from '../../components/map/SensorMarker';
import UserLocationMarker from '../../components/map/UserLocationMarker';
import { useMapboxGlResize } from '../../hooks/useMapboxGlResize';
import { getMapboxToken } from '../../utils/mapboxToken';
import { Slab } from 'react-loading-indicators';
import { useTranslation } from 'react-i18next';
import { getCrowdReportMarkerColor } from '../../utils/floodLevels';

const MAPBOX_TOKEN = getMapboxToken();
const defaultLng = DEFAULT_CENTER[1];
const defaultLat = DEFAULT_CENTER[0];
const GEOCODE_SEARCH_BIAS = { lat: defaultLat, lng: defaultLng, radius: 35000 };
const ROUTING_SEARCH_HISTORY_KEY = 'routingSearchHistory';
/** Layer tuyến xanh (normal) — hover để xem ETA */
const ROUTE_NORMAL_LAYER_ID = 'route-normal';
/** Vẽ route dưới nhãn đường để không che tên đường */
const ROUTE_BEFORE_LAYER_ID = 'road-label';

const getCrowdMarkerColor = (report) => getCrowdReportMarkerColor(report);

const toNum = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};

const pickLngLat = (obj, prefix = '') => {
  if (!obj || typeof obj !== 'object') return null;
  const lng = toNum(
    obj[`${prefix}lng`] ??
      obj[`${prefix}lon`] ??
      obj[`${prefix}longitude`] ??
      (prefix ? undefined : obj.lng ?? obj.lon ?? obj.longitude)
  );
  const lat = toNum(
    obj[`${prefix}lat`] ??
      obj[`${prefix}latitude`] ??
      (prefix ? undefined : obj.lat ?? obj.latitude)
  );
  if (lng == null || lat == null) return null;
  return [lng, lat];
};

const pickSegmentEndpoint = (seg, role) => {
  if (!seg || typeof seg !== 'object') return null;
  if (role === 'from') {
    return (
      pickLngLat(seg.from || seg.start) ||
      (() => {
        const lng = toNum(seg.from_lng ?? seg.start_lng);
        const lat = toNum(seg.from_lat ?? seg.start_lat);
        return lng != null && lat != null ? [lng, lat] : null;
      })()
    );
  }
  return (
    pickLngLat(seg.to || seg.end) ||
    (() => {
      const lng = toNum(seg.to_lng ?? seg.end_lng);
      const lat = toNum(seg.to_lat ?? seg.end_lat);
      return lng != null && lat != null ? [lng, lat] : null;
    })()
  );
};

const segmentLineCoordinates = (seg) => {
  const raw =
    (Array.isArray(seg?.coordinates) && seg.coordinates) ||
    (Array.isArray(seg?.geometry?.coordinates) && seg.geometry.coordinates);
  if (raw?.length >= 2) {
    const coords = raw
      .map((c) => (Array.isArray(c) && c.length >= 2 ? [toNum(c[0]), toNum(c[1])] : pickLngLat(c)))
      .filter((c) => c && c[0] != null && c[1] != null);
    if (coords.length >= 2) return coords;
  }
  const from = pickSegmentEndpoint(seg, 'from');
  const to = pickSegmentEndpoint(seg, 'to');
  if (!from || !to) return null;
  return [from, to];
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
  const maxDepth = result?.vehicle?.maxWadingDepthCm || 10;
  const features = segments
    .map((seg, idx) => {
      const lineCoords = segmentLineCoordinates(seg);
      if (!lineCoords || lineCoords.length < 2) return null;
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
      // depthRatio: 0 = dry, 0-0.5 = light flood, 0.5-1 = near limit
      const depthRatio = depthCm != null && depthCm > 0 ? Math.min(depthCm / maxDepth, 1) : 0;
      return {
        type: 'Feature',
        id: `seg-${idx}`,
        properties: { idx, edgeId, depthCm, depthRatio, status },
        geometry: { type: 'LineString', coordinates: lineCoords }
      };
    })
    .filter(Boolean);
  return { type: 'FeatureCollection', features };
}

function newExtraStop() {
  return {
    id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    query: '',
    lat: null,
    lng: null,
    locked: false,
    options: []
  };
}

/** Gộp nhiều chặng safe-path (A→B, B→C, …) thành một object hiển thị giống một lần gọi API */
function mergeSafePathLegs(legResults) {
  if (!Array.isArray(legResults) || legResults.length === 0) return null;
  const found = legResults.every((r) => r?.found === true);
  const segments = legResults.flatMap((r) =>
    r?.found === true && Array.isArray(r?.route?.segments) ? r.route.segments : []
  );
  const total_cost_sec = legResults.reduce(
    (acc, r) => acc + (r?.found === true ? Number(r?.route?.total_cost_sec) || 0 : 0),
    0
  );
  const total_distance_m = legResults.reduce(
    (acc, r) => acc + (r?.found === true ? Number(r?.route?.total_distance_m) || 0 : 0),
    0
  );
  const first = legResults[0];
  const last = legResults[legResults.length - 1];
  const baseRoute = first?.route && typeof first.route === 'object' ? first.route : {};
  return {
    found,
    route: {
      ...baseRoute,
      segments,
      total_cost_sec,
      total_distance_m
    },
    start_node: first?.start_node,
    end_node: last?.end_node,
    node_path: legResults.flatMap((r) => (Array.isArray(r?.node_path) ? r.node_path : [])),
    vehicle: last?.vehicle,
    flood_sources: last?.flood_sources,
    avoided: last?.avoided
  };
}

export default function RoutingPage() {
  const { t, i18n } = useTranslation();
  const transportTabs = useMemo(
    () => [
      { id: 'motorbike', label: t('routing.vehicleMotorbike'), icon: FaMotorcycle, note: 'max 10cm' },
      { id: 'car', label: t('routing.vehicleCar'), icon: FaCarSide, note: 'max 20cm' },
      { id: 'suv', label: t('routing.vehicleSuv'), icon: FaTruck, note: 'max 40cm' }
    ],
    [t]
  );
  const floodSourceLabels = useMemo(
    () => ({
      crowd_report_hours: t('routing.floodSource.crowd_report_hours'),
      crowd_edge_buffer_m: t('routing.floodSource.crowd_edge_buffer_m'),
      crowd_recency_half_life_hours: t('routing.floodSource.crowd_recency_half_life_hours'),
      crowd_min_reliability: t('routing.floodSource.crowd_min_reliability'),
      crowd_max_boost: t('routing.floodSource.crowd_max_boost'),
      sensor_flood_radius_m: t('routing.floodSource.sensor_flood_radius_m'),
      sensor_flood_decay: t('routing.floodSource.sensor_flood_decay')
    }),
    [t]
  );
  const [startLat, setStartLat] = useState(null);
  const [startLng, setStartLng] = useState(null);
  const [endLat, setEndLat] = useState(null);
  const [endLng, setEndLng] = useState(null);
  const [pickMode, setPickMode] = useState('none');
  /** Khi pickMode === 'extra': id dòng đang chọn trên bản đồ */
  const [pickExtraId, setPickExtraId] = useState(null);
  const [vehicleType, setVehicleType] = useState('motorbike');
  const [nearestNodeMaxM, setNearestNodeMaxM] = useState(1200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [swapIconOrder, setSwapIconOrder] = useState(false);
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromLocked, setFromLocked] = useState(false);
  const [toLocked, setToLocked] = useState(false);
  const [fromOptions, setFromOptions] = useState([]);
  const [toOptions, setToOptions] = useState([]);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(ROUTING_SEARCH_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [searchingFrom, setSearchingFrom] = useState(false);
  const [searchingTo, setSearchingTo] = useState(false);
  const [searchingExtra, setSearchingExtra] = useState(false);
  /** Các điểm đến bổ sung (sau điểm đến chính), thứ tự trên tuyến */
  const [extraStops, setExtraStops] = useState([]);
  const [floodData, setFloodData] = useState([]);
  const [crowdReports, setCrowdReports] = useState([]);
  const endpointRef = useRef(null);
  const mapRef = useRef(null);
  const routeTooltipMoveRafRef = useRef(null);
  const routeToastTimeoutRef = useRef(null);
  const fromAutoCompleteRef = useRef(null);
  const toAutoCompleteRef = useRef(null);
  /** PrimeReact gọi focus() sau khi chọn gợi ý — bỏ qua onFocus một lần để không gọi show() lại ngay */
  const skipIdleOpenOnFocusFromRef = useRef(false);
  const skipIdleOpenOnFocusToRef = useRef(false);
  const skipIdleOpenOnFocusExtraRef = useRef({});
  const extraStopAutocompleteRefs = useRef({});
  const routingMapSectionRef = useRef(null);
  useMapboxGlResize(mapRef, routingMapSectionRef);
  const MY_LOCATION_OPTION = useMemo(
    () => ({
      id: '__my_location__',
      name: t('routing.myLocation'),
      fullAddress: t('routing.myLocation'),
      isMyLocation: true
    }),
    [t]
  );

  const persistSearchHistory = useCallback((nextHistory) => {
    setSearchHistory(nextHistory);
    try {
      localStorage.setItem(ROUTING_SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
    } catch {
      // ignore storage errors (private mode / quota)
    }
  }, []);

  const pushHistoryOption = useCallback(
    (option) => {
      if (!option || option.isMyLocation) return;
      const fullAddress = String(option.fullAddress || option.name || '').trim();
      const lat = Number(option.lat);
      const lng = Number(option.lng);
      if (!fullAddress || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const normalized = {
        id: String(option.id || `${lat},${lng}`),
        name: String(option.name || fullAddress),
        fullAddress,
        lat,
        lng
      };
      const deduped = searchHistory.filter(
        (h) =>
          !(String(h.fullAddress || '').toLowerCase() === fullAddress.toLowerCase() && Number(h.lat) === lat && Number(h.lng) === lng)
      );
      persistSearchHistory([normalized, ...deduped].slice(0, 8));
    },
    [searchHistory, persistSearchHistory]
  );

  const getIdleSuggestions = useCallback(() => {
    const historySuggestions = searchHistory.map((h, idx) => ({
      ...h,
      id: h.id || `history-${idx}`,
      isHistory: true
    }));
    return [MY_LOCATION_OPTION, ...historySuggestions];
  }, [MY_LOCATION_OPTION, searchHistory]);

  const openIdleSuggestions = useCallback(
    (type) => {
      const idle = getIdleSuggestions();
      if (type === 'from') {
        setFromOptions(idle);
        setTimeout(() => fromAutoCompleteRef.current?.show?.(), 0);
      } else {
        setToOptions(idle);
        setTimeout(() => toAutoCompleteRef.current?.show?.(), 0);
      }
    },
    [getIdleSuggestions]
  );

  const routeGeoJSON = useMemo(() => buildRouteGeoJSON(result), [result]);
  /** BE: HTTP 200 + data.found — chỉ vẽ route khi found === true */
  const found = result?.found === true;
  const etaMin =
    result?.route?.total_cost_sec != null ? Math.max(1, Math.round(Number(result.route.total_cost_sec) / 60)) : null;
  const distanceKm =
    result?.route?.total_distance_m != null ? Number(result.route.total_distance_m) / 1000 : null;
  const numberFormatter = useMemo(
    () =>
      typeof Intl !== 'undefined'
        ? new Intl.NumberFormat(i18n.language === 'en' ? 'en-US' : 'vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })
        : { format: (v) => (typeof v === 'number' ? v.toFixed(2) : String(v)) },
    [i18n.language]
  );
  const floodSources = result?.flood_sources;
  const floodSourcesSummary = useMemo(() => {
    if (!floodSources || typeof floodSources !== 'object') return [];
    if (Array.isArray(floodSources)) {
      return floodSources.map((item, idx) => ({
        label: item?.source || item?.name || t('routing.sourceFallback', { n: idx + 1 }),
        value: item?.count ?? item?.value ?? JSON.stringify(item)
      }));
    }
    return Object.entries(floodSources).map(([k, v]) => {
      if (typeof v === 'object' && v != null) {
        return {
          label: floodSourceLabels[k] || k,
          value: JSON.stringify(v)
        };
      }
      if (v == null) {
        return { label: floodSourceLabels[k] || k, value: '—' };
      }
      let formatted;
      const num = Number(v);
      switch (k) {
        case 'crowd_min_reliability':
          formatted = Number.isFinite(num) ? `${num}%` : String(v);
          break;
        case 'crowd_report_hours':
          formatted = Number.isFinite(num) ? t('routing.unitHours', { n: num }) : String(v);
          break;
        case 'crowd_edge_buffer_m':
          formatted = Number.isFinite(num) ? t('routing.unitMeters', { n: num }) : String(v);
          break;
        case 'crowd_max_boost':
          formatted = Number.isFinite(num) ? `x${num}` : String(v);
          break;
        case 'sensor_flood_radius_m':
          formatted = Number.isFinite(num) ? t('routing.unitMeters', { n: num }) : String(v);
          break;
        case 'sensor_flood_decay': {
          const decayMap = { linear: 'Tuyến tính', plateau: 'Bậc thang' };
          formatted = decayMap[String(v)] || String(v);
          break;
        }
        default:
          formatted = Number.isFinite(num) ? String(num) : String(v);
      }
      return {
        label: floodSourceLabels[k] || k,
        value: formatted
      };
    });
  }, [floodSources, floodSourceLabels, t]);
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
  const [showRouteToast, setShowRouteToast] = useState(false);
  /** Tooltip ETA theo chuột khi hover polyline tuyến xanh */
  const [routeHoverTooltip, setRouteHoverTooltip] = useState({
    visible: false,
    lng: 0,
    lat: 0
  });
  const [userLocation, setUserLocation] = useState(null);
  const nonExpiredCrowdReports = useMemo(
    () => filterNonExpiredReports(crowdReports, CROWD_REPORT_MAP_DISPLAY_HOURS),
    [crowdReports]
  );
  const hasChosenStart = useMemo(
    () => startLat != null && startLng != null,
    [startLat, startLng]
  );

  const hasPrimaryDestination = useMemo(
    () => endLat != null && endLng != null,
    [endLat, endLng]
  );

  const canFocusExtraStop = useCallback(
    (index) => {
      if (!hasChosenStart || !hasPrimaryDestination) return false;
      for (let i = 0; i < index; i += 1) {
        const s = extraStops[i];
        if (s?.lat == null || s?.lng == null) return false;
      }
      return true;
    },
    [extraStops, hasChosenStart, hasPrimaryDestination]
  );

  const setMyLocationTo = (type = 'from', extraStopId = null) => {
    if (!navigator.geolocation) {
      setError(t('routing.geoNotSupported'));
      return;
    }
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coordLabel = t('routing.myLocationCoords', { lat: lat.toFixed(5), lng: lng.toFixed(5) });
        if (type === 'from') {
          setStartLat(lat);
          setStartLng(lng);
          setFromQuery(coordLabel);
          setFromLocked(true);
          setFromOptions([]);
          fetchAddressFromCoords(lat, lng, { mapboxToken: MAPBOX_TOKEN })
            .then((addr) => {
              if (addr) setFromQuery(addr);
            })
            .catch(() => {});
        } else if (type === 'to') {
          setEndLat(lat);
          setEndLng(lng);
          setToQuery(coordLabel);
          setToLocked(true);
          setToOptions([]);
          fetchAddressFromCoords(lat, lng, { mapboxToken: MAPBOX_TOKEN })
            .then((addr) => {
              if (addr) setToQuery(addr);
            })
            .catch(() => {});
        } else if (type === 'extra' && extraStopId) {
          setExtraStops((rows) =>
            rows.map((r) =>
              r.id === extraStopId
                ? { ...r, lat, lng, query: coordLabel, locked: true, options: [] }
                : r
            )
          );
          fetchAddressFromCoords(lat, lng, { mapboxToken: MAPBOX_TOKEN })
            .then((addr) => {
              if (addr) {
                setExtraStops((rows) =>
                  rows.map((r) => (r.id === extraStopId ? { ...r, query: addr } : r))
                );
              }
            })
            .catch(() => {});
        }
      },
      () => setError(t('routing.geoError')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
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
    } else if (pickMode === 'extra' && pickExtraId) {
      const id = pickExtraId;
      setExtraStops((rows) =>
        rows.map((r) =>
          r.id === id ? { ...r, lat: p.lat, lng: p.lng, locked: false, options: [] } : r
        )
      );
      fetchAddressFromCoords(p.lat, p.lng, { mapboxToken: MAPBOX_TOKEN })
        .then((addr) => {
          if (addr) {
            setExtraStops((rows) =>
              rows.map((r) =>
                r.id === id ? { ...r, query: addr, locked: true, options: [] } : r
              )
            );
          }
        })
        .catch(() => {});
    } else {
      return;
    }
    setPickMode('none');
    setPickExtraId(null);
  };

  // Load cảm biến mực nước (giống trang bản đồ chính)
  useEffect(() => {
    const loadData = async () => {
      const result = await fetchFloodData(endpointRef);
      if (result.success && result.data) {
        setFloodData(result.data);
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

  // GPS local (trình duyệt đang mở): hiển thị chấm vị trí người dùng trên map routing.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: Number(pos.coords.latitude),
          lng: Number(pos.coords.longitude),
          accuracy: pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null,
          source: 'gps'
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 25000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const extraStopsRoutingKey = useMemo(
    () => extraStops.map((s) => [s.query, s.lat, s.lng].join('\t')).join('|'),
    [extraStops]
  );

  useEffect(() => {
    if (!result) return;
    queueMicrotask(() => setResult(null));
    // Bỏ qua `result` trong deps: chỉ xóa route khi người dùng đổi điểm / ô tìm, không phản ứng mỗi lần API trả `result` mới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromQuery, toQuery, startLat, startLng, endLat, endLng, extraStopsRoutingKey]);

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

  // Tooltip ETA: chỉ khi hover đúng polyline tuyến xanh (layer route-normal)
  useEffect(() => {
    if (!MAPBOX_TOKEN || !found || !routeGeoJSON.features.length) {
      return undefined;
    }

    let cancelled = false;
    let attached = false;
    let map = null;

    const clearMoveRaf = () => {
      if (routeTooltipMoveRafRef.current != null) {
        cancelAnimationFrame(routeTooltipMoveRafRef.current);
        routeTooltipMoveRafRef.current = null;
      }
    };

    const detach = () => {
      clearMoveRaf();
      if (!map) return;
      try {
        map.off('mouseenter', ROUTE_NORMAL_LAYER_ID, onEnter);
        map.off('mousemove', ROUTE_NORMAL_LAYER_ID, onMove);
        map.off('mouseleave', ROUTE_NORMAL_LAYER_ID, onLeave);
      } catch {
        // layer có thể đã bị gỡ
      }
      try {
        map.getCanvas().style.cursor = '';
      } catch {
        // ignore
      }
      attached = false;
    };

    const onEnter = (e) => {
      if (!map) return;
      map.getCanvas().style.cursor = 'pointer';
      const ll = e.lngLat;
      if (ll) {
        setRouteHoverTooltip({ visible: true, lng: ll.lng, lat: ll.lat });
      } else {
        setRouteHoverTooltip((s) => ({ ...s, visible: true }));
      }
    };

    const onMove = (e) => {
      if (!e.lngLat) return;
      const { lng, lat } = e.lngLat;
      if (routeTooltipMoveRafRef.current != null) return;
      routeTooltipMoveRafRef.current = requestAnimationFrame(() => {
        routeTooltipMoveRafRef.current = null;
        if (cancelled) return;
        setRouteHoverTooltip({ visible: true, lng, lat });
      });
    };

    const onLeave = () => {
      clearMoveRaf();
      if (map) map.getCanvas().style.cursor = '';
      setRouteHoverTooltip((s) => ({ ...s, visible: false }));
    };

    const tryAttach = () => {
      if (cancelled || attached) return;
      const inst = mapRef.current?.getMap?.();
      if (!inst || !inst.getLayer?.(ROUTE_NORMAL_LAYER_ID)) return;
      map = inst;
      map.on('mouseenter', ROUTE_NORMAL_LAYER_ID, onEnter);
      map.on('mousemove', ROUTE_NORMAL_LAYER_ID, onMove);
      map.on('mouseleave', ROUTE_NORMAL_LAYER_ID, onLeave);
      attached = true;
    };

    let rafAttempts = 0;
    const pollAttach = () => {
      if (cancelled || attached) return;
      tryAttach();
      if (!attached && rafAttempts < 180) {
        rafAttempts += 1;
        requestAnimationFrame(pollAttach);
      }
    };

    pollAttach();

    return () => {
      cancelled = true;
      detach();
    };
  }, [found, routeGeoJSON]);

  const searchFromPlaces = useCallback(
    (event) => {
      const q = event.query.trim();
      if (!q) {
        // focus/open dropdown: luôn hiển thị "Dùng vị trí của tôi" + lịch sử
        setFromOptions(getIdleSuggestions());
        return;
      }
      // người dùng bắt đầu gõ: ẩn lịch sử để tập trung vào gợi ý tìm kiếm mới
      if (q.length < 2) {
        setFromOptions([MY_LOCATION_OPTION]);
        return;
      }
      setSearchingFrom(true);
      searchPlacesUnified(q, { mapboxToken: MAPBOX_TOKEN, limit: 8, ...GEOCODE_SEARCH_BIAS })
        .then((list) => setFromOptions([MY_LOCATION_OPTION, ...list]))
        .finally(() => setSearchingFrom(false));
    },
    [MY_LOCATION_OPTION, getIdleSuggestions]
  );

  const searchToPlaces = useCallback(
    (event) => {
      const q = event.query.trim();
      if (!q) {
        // focus/open dropdown: luôn hiển thị "Dùng vị trí của tôi" + lịch sử
        setToOptions(getIdleSuggestions());
        return;
      }
      // người dùng bắt đầu gõ: ẩn lịch sử để tập trung vào gợi ý tìm kiếm mới
      if (q.length < 2) {
        setToOptions([MY_LOCATION_OPTION]);
        return;
      }
      setSearchingTo(true);
      searchPlacesUnified(q, { mapboxToken: MAPBOX_TOKEN, limit: 8, ...GEOCODE_SEARCH_BIAS })
        .then((list) => setToOptions([MY_LOCATION_OPTION, ...list]))
        .finally(() => setSearchingTo(false));
    },
    [MY_LOCATION_OPTION, getIdleSuggestions]
  );

  const openIdleSuggestionsForExtra = useCallback(
    (stopId) => {
      const idle = getIdleSuggestions();
      setExtraStops((rows) => rows.map((r) => (r.id === stopId ? { ...r, options: idle } : r)));
      setTimeout(() => extraStopAutocompleteRefs.current[stopId]?.show?.(), 0);
    },
    [getIdleSuggestions]
  );

  const searchExtraPlaces = useCallback(
    (stopId, event) => {
      const q = event.query.trim();
      const setOpts = (opts) =>
        setExtraStops((rows) => rows.map((r) => (r.id === stopId ? { ...r, options: opts } : r)));
      if (!q) {
        setOpts(getIdleSuggestions());
        return;
      }
      if (q.length < 2) {
        setOpts([MY_LOCATION_OPTION]);
        return;
      }
      setSearchingExtra(true);
      searchPlacesUnified(q, { mapboxToken: MAPBOX_TOKEN, limit: 8, ...GEOCODE_SEARCH_BIAS })
        .then((list) => setOpts([MY_LOCATION_OPTION, ...list]))
        .finally(() => setSearchingExtra(false));
    },
    [MY_LOCATION_OPTION, getIdleSuggestions]
  );

  const applySuggestion = async (type, option, extraStopId = null) => {
    if (option?.isMyLocation) {
      if (extraStopId) setMyLocationTo('extra', extraStopId);
      else setMyLocationTo(type);
      return;
    }
    if (!option) return;

    const optionLng = option.lng ?? option.lon;
    const coordsReady =
      option.lat != null &&
      optionLng != null &&
      Number.isFinite(Number(option.lat)) &&
      Number.isFinite(Number(optionLng));
    const needsPlace = option.place_id && !coordsReady;

    let resolved = option;
    if (needsPlace) {
      if (extraStopId) setSearchingExtra(true);
      else if (type === 'from') setSearchingFrom(true);
      else setSearchingTo(true);
      try {
        const place = await resolveGeocodePlaceSelection(option);
        if (!place) return;
        const fullAddress = place.formatted_address || option.fullAddress || option.name;
        resolved = {
          ...option,
          lat: place.lat,
          lng: place.lng,
          fullAddress,
          name: fullAddress ? fullAddress.split(',')[0]?.trim() : option.name
        };
      } finally {
        if (extraStopId) setSearchingExtra(false);
        else if (type === 'from') setSearchingFrom(false);
        else setSearchingTo(false);
      }
    }

    if (resolved.lat == null || resolved.lng == null) return;
    if (extraStopId) {
      setExtraStops((rows) =>
        rows.map((r) =>
          r.id === extraStopId
            ? {
                ...r,
                lat: resolved.lat,
                lng: resolved.lng,
                query: resolved.fullAddress || resolved.name,
                locked: true,
                options: []
              }
            : r
        )
      );
      pushHistoryOption(resolved);
      return;
    }
    if (type === 'from') {
      setStartLat(resolved.lat);
      setStartLng(resolved.lng);
      setFromQuery(resolved.fullAddress || resolved.name);
      setFromLocked(true);
      setFromOptions([]);
      pushHistoryOption(resolved);
    } else {
      setEndLat(resolved.lat);
      setEndLng(resolved.lng);
      setToQuery(resolved.fullAddress || resolved.name);
      setToLocked(true);
      setToOptions([]);
      pushHistoryOption(resolved);
    }
  };

  const renderSuggestionItem = (option) => {
    if (option?.isMyLocation) {
      return (
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-[#202124]">
          <FaLocationCrosshairs className="text-[#1a73e8]" />
          <span>{t('routing.myLocation')}</span>
        </div>
      );
    }
    if (option?.isHistory) {
      return (
        <div className="px-3 py-2 text-sm text-[#202124]">
          <div className="truncate">{option?.fullAddress || option?.name || ''}</div>
          <div className="text-[11px] text-[#5f6368]">{t('routing.searchHistory')}</div>
        </div>
      );
    }
    return (
      <div className="px-3 py-2 text-sm text-[#202124]">
        {option?.fullAddress || option?.name || ''}
      </div>
    );
  };

  const renderLocationInput = (type) => {
    if (type === 'from') {
      return (
        <SearchAutoComplete
          ref={fromAutoCompleteRef}
          value={fromQuery}
          suggestions={fromOptions}
          completeMethod={searchFromPlaces}
          onChange={(ev) => {
            setFromLocked(false);
            const v = ev.value;
            setFromQuery(typeof v === 'string' ? v : '');
            if (typeof v === 'string' && v.trim().length > 0) {
              // Bắt đầu gõ => ẩn lịch sử, chỉ giữ mục "Dùng vị trí của tôi"
              setFromOptions([MY_LOCATION_OPTION]);
            }
          }}
          onSelect={(ev) => {
            skipIdleOpenOnFocusFromRef.current = true;
            void applySuggestion('from', ev.value);
          }}
          field="fullAddress"
          minLength={0}
          delay={350}
          placeholder={t('routing.placeholderFrom')}
          className="w-full"
          inputClassName="rounded-md border border-[#dadce0] bg-white px-3 py-2 text-sm"
          onFocus={() => {
            setPickMode('start');
            if (skipIdleOpenOnFocusFromRef.current) {
              skipIdleOpenOnFocusFromRef.current = false;
              return;
            }
            openIdleSuggestions('from');
          }}
          onClick={() => openIdleSuggestions('from')}
          itemTemplate={renderSuggestionItem}
        />
      );
    }
    return (
      <SearchAutoComplete
        ref={toAutoCompleteRef}
        value={toQuery}
        suggestions={toOptions}
        completeMethod={searchToPlaces}
        onChange={(ev) => {
          setToLocked(false);
          const v = ev.value;
          setToQuery(typeof v === 'string' ? v : '');
          if (typeof v === 'string' && v.trim().length > 0) {
            // Bắt đầu gõ => ẩn lịch sử, chỉ giữ mục "Dùng vị trí của tôi"
            setToOptions([MY_LOCATION_OPTION]);
          }
        }}
        onSelect={(ev) => {
          skipIdleOpenOnFocusToRef.current = true;
          void applySuggestion('to', ev.value);
        }}
        field="fullAddress"
        minLength={0}
        delay={350}
          placeholder={t('routing.placeholderTo')}
        className="w-full"
        inputClassName="rounded-md border border-[#dadce0] bg-white px-3 py-2 text-sm"
        onFocus={() => {
          if (!hasChosenStart) {
            setError(t('routing.errPickStartFirst'));
            return;
          }
          setPickMode('end');
          if (skipIdleOpenOnFocusToRef.current) {
            skipIdleOpenOnFocusToRef.current = false;
            return;
          }
          openIdleSuggestions('to');
        }}
        onClick={() => {
          if (!hasChosenStart) return;
          openIdleSuggestions('to');
        }}
        itemTemplate={renderSuggestionItem}
      />
    );
  };

  const searchRoute = async () => {
    if (startLat == null || startLng == null || endLat == null || endLng == null) {
      setError(t('routing.needBothPoints'));
      return;
    }
    if (extraStops.length > 0) {
      const incomplete = extraStops.some((s) => s.lat == null || s.lng == null);
      if (incomplete) {
        setError(t('routing.needAllExtraStops'));
        return;
      }
    }
    if (routeToastTimeoutRef.current) {
      clearTimeout(routeToastTimeoutRef.current);
      routeToastTimeoutRef.current = null;
    }
    setShowRouteToast(false);
    setRouteHoverTooltip({ visible: false, lng: 0, lat: 0 });
    setLoading(true);
    setError('');
    try {
      const chain = [{ lat: startLat, lng: startLng }, { lat: endLat, lng: endLng }];
      extraStops.forEach((s) => {
        if (s.lat != null && s.lng != null) chain.push({ lat: s.lat, lng: s.lng });
      });
      const legsData = [];
      let nearestM = nearestNodeMaxM;
      for (let i = 0; i < chain.length - 1; i += 1) {
        const a = chain[i];
        const b = chain[i + 1];
        const payload = {
          start_lng: a.lng,
          start_lat: a.lat,
          end_lng: b.lng,
          end_lat: b.lat,
          vehicle_type: vehicleType,
          nearest_node_max_m: nearestM
        };
        let res = await fetchSafePath(payload);
        if (!res.success && res.status === 400 && nearestM < 5000) {
          res = await fetchSafePath({ ...payload, nearest_node_max_m: 5000 });
          if (res.success) {
            nearestM = 5000;
            setNearestNodeMaxM(5000);
          }
        }
        if (!res.success) {
          // Gỡ overlay trước khi setResult — tránh React 18 batch chung một paint với bản đồ nặng
          flushSync(() => setLoading(false));
          setResult(legsData.length ? mergeSafePathLegs(legsData) : null);
          const base = getSafeUserFacingError(res.error, t('routing.safePathError'));
          const hint400 = res.status === 400 ? t('routing.safePathHint400') : '';
          setError(t('routing.legError', { n: i + 1, msg: `${base}${hint400}` }));
          return;
        }
        const data = res.data || null;
        legsData.push(data);
      }
      const merged = mergeSafePathLegs(legsData);
      flushSync(() => setLoading(false));
      setResult(merged);
      if (merged?.found === true) {
        setShowRouteToast(true);
        routeToastTimeoutRef.current = setTimeout(() => {
          setShowRouteToast(false);
          routeToastTimeoutRef.current = null;
        }, 5000);
      }
    } catch (e) {
      flushSync(() => setLoading(false));
      setResult(null);
      setError(getSafeUserFacingError(e, t('routing.routeProcessError')));
    } finally {
      setLoading(false);
    }
  };

  /* Tạm ẩn UI danh sách thẻ gợi ý tuyến (35/39/43 min...) — bật lại khi cần
  const routeCards = [
    {
      id: 'primary',
      name: found ? 'Tuyến an toàn hiện tại' : 'qua QL13 - Điện Biên Phủ',
      eta: etaMin != null ? `${etaMin} min` : '35 min',
      distance: distanceKm != null ? `${numberFormatter.format(distanceKm)} km` : '21.3 km',
      active: true,
      statusText: found ? 'Tuyến đường an toàn nhất (tránh ngập)' : 'Tuyến đường tốt nhất theo tình hình giao thông',
      toll: false
    },
    { id: 'alt-1', name: 'qua Xa lộ Hà Nội', eta: '39 min', distance: '23.8 km', active: false, statusText: 'Ít điểm ngập hơn', toll: true },
    { id: 'alt-2', name: 'qua Võ Văn Kiệt', eta: '43 min', distance: '24.9 km', active: false, statusText: 'Có thể kẹt xe', toll: false }
  ];
  */

  return (
    <div className="relative h-[calc(100vh-60px)] w-full overflow-hidden bg-[#f1f3f4]">
      {loading && (
        <div
          className="absolute inset-0 z-[10000] flex items-center justify-center bg-slate-900/[0.18] backdrop-blur-[10px] backdrop-saturate-150 transition-[backdrop-filter] duration-200"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="rounded-2xl bg-white/92 px-10 py-9 shadow-[0_12px_40px_rgba(15,23,42,0.18)]">
            <Slab color="#318dcc" size="medium" text={t('routing.loadingRoute')} textColor="" />
          </div>
        </div>
      )}
      {error && <ErrorToast message={error} onClose={() => setError('')} />}
      {showRouteToast && found && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-[2000] -translate-x-1/2 rounded-md bg-[#333] px-4 py-2 text-sm text-white shadow-lg transition-opacity duration-300">
          {t('routing.etaDistance', { eta: etaMin ?? '-', dist: distanceKm != null ? `${numberFormatter.format(distanceKm)} km` : '-' })}
        </div>
      )}
      <div className="flex h-full w-full">
        <aside className="h-full w-full max-w-[440px] shrink-0 overflow-y-auto border-r border-[#e8eaed] bg-white shadow-[2px_0_10px_rgba(60,64,67,0.18)]">
          <div className="flex items-start justify-between border-b border-[#e8eaed] px-4 pt-4">
            <div className="flex flex-1 items-center gap-4 overflow-x-auto pb-2">
              {transportTabs.map((tab) => {
                const Icon = tab.icon;
                const active = vehicleType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setVehicleType(tab.id)}
                    className={`flex min-w-[64px] flex-col items-center border-b-2 pb-1 text-xs ${active ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-[#5f6368]'}`}
                  >
                    <Icon className="text-base" />
                    <span className="mt-0.5 truncate">{tab.label}</span>
                    <span className="text-[10px]">{tab.note}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4]">
              <FaXmark />
            </button>
          </div>

          <div className="border-b border-[#e8eaed] bg-[#f8f9fa] px-4 py-3">
            <div className="relative pr-10">
              <button
                type="button"
                onClick={() => {
                  const nextFromQuery = toQuery;
                  const nextToQuery = fromQuery;
                  const nextStartLat = endLat;
                  const nextStartLng = endLng;
                  const nextEndLat = startLat;
                  const nextEndLng = startLng;
                  setFromQuery(nextFromQuery);
                  setToQuery(nextToQuery);
                  setStartLat(nextStartLat);
                  setStartLng(nextStartLng);
                  setEndLat(nextEndLat);
                  setEndLng(nextEndLng);
                  setFromLocked(toLocked);
                  setToLocked(fromLocked);
                  setFromOptions([]);
                  setToOptions([]);
                  setExtraStops((rows) => rows.map((r) => ({ ...r, options: [] })));
                  setSwapIconOrder((v) => !v);
                }}
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 text-[#5f6368] hover:bg-[#e8eaed]"
                title={t('routing.swapPoints')}
              >
                <FaArrowRightArrowLeft />
              </button>

              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <div className="flex w-5 justify-center text-[#5f6368]">
                    {swapIconOrder ? <FaLocationDot className="text-[#d93025]" /> : <span className="h-2.5 w-2.5 rounded-full border border-[#5f6368]" />}
                  </div>
                  <div className="min-w-0 flex-1">{renderLocationInput(swapIconOrder ? 'to' : 'from')}</div>
                </div>

                <div className="ml-2.5 flex h-4 w-1 flex-col items-center justify-center gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-[#9aa0a6]" />
                  <span className="h-1 w-1 rounded-full bg-[#9aa0a6]" />
                  <span className="h-1 w-1 rounded-full bg-[#9aa0a6]" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex w-5 justify-center text-[#5f6368]">
                    {swapIconOrder ? <span className="h-2.5 w-2.5 rounded-full border border-[#5f6368]" /> : <FaLocationDot className="text-[#d93025]" />}
                  </div>
                  <div className="min-w-0 flex-1">{renderLocationInput(swapIconOrder ? 'from' : 'to')}</div>
                </div>

                {extraStops.map((stop, idx) => (
                  <React.Fragment key={stop.id}>
                    <div className="ml-2.5 flex h-4 w-1 flex-col items-center justify-center gap-0.5">
                      <span className="h-1 w-1 rounded-full bg-[#9aa0a6]" />
                      <span className="h-1 w-1 rounded-full bg-[#9aa0a6]" />
                      <span className="h-1 w-1 rounded-full bg-[#9aa0a6]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex w-5 shrink-0 justify-center text-[#5f6368]">
                        <FaLocationDot className="text-[#d93025]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <SearchAutoComplete
                          ref={(r) => {
                            if (r) extraStopAutocompleteRefs.current[stop.id] = r;
                            else delete extraStopAutocompleteRefs.current[stop.id];
                          }}
                          value={stop.query}
                          suggestions={stop.options}
                          completeMethod={(ev) => searchExtraPlaces(stop.id, ev)}
                          onChange={(ev) => {
                            const v = ev.value;
                            setExtraStops((rows) =>
                              rows.map((r) =>
                                r.id === stop.id
                                  ? {
                                      ...r,
                                      locked: false,
                                      query: typeof v === 'string' ? v : '',
                                      options:
                                        typeof v === 'string' && v.trim().length > 0
                                          ? [MY_LOCATION_OPTION]
                                          : r.options
                                    }
                                  : r
                              )
                            );
                          }}
                          onSelect={(ev) => {
                            skipIdleOpenOnFocusExtraRef.current[stop.id] = true;
                            void applySuggestion('to', ev.value, stop.id);
                          }}
                          field="fullAddress"
                          minLength={0}
                          delay={350}
                          placeholder={t('routing.placeholderExtra', { n: idx + 2 })}
                          className="w-full"
                          inputClassName="rounded-md border border-[#dadce0] bg-white px-3 py-2 text-sm"
                          onFocus={() => {
                            if (!hasChosenStart) {
                              setError(t('routing.errPickStartFirst'));
                              return;
                            }
                            if (!hasPrimaryDestination) {
                              setError(t('routing.errPickMainDestFirst'));
                              return;
                            }
                            if (!canFocusExtraStop(idx)) {
                              setError(t('routing.errFillUpperStops'));
                              return;
                            }
                            setPickMode('extra');
                            setPickExtraId(stop.id);
                            if (skipIdleOpenOnFocusExtraRef.current[stop.id]) {
                              skipIdleOpenOnFocusExtraRef.current[stop.id] = false;
                              return;
                            }
                            openIdleSuggestionsForExtra(stop.id);
                          }}
                          onClick={() => {
                            if (!hasChosenStart || !hasPrimaryDestination || !canFocusExtraStop(idx)) return;
                            openIdleSuggestionsForExtra(stop.id);
                          }}
                          itemTemplate={renderSuggestionItem}
                        />
                      </div>
                      <button
                        type="button"
                        title={t('routing.removeStopTitle')}
                        onClick={() => {
                          delete skipIdleOpenOnFocusExtraRef.current[stop.id];
                          delete extraStopAutocompleteRefs.current[stop.id];
                          setExtraStops((rows) => rows.filter((r) => r.id !== stop.id));
                        }}
                        className="shrink-0 rounded-full p-2 text-[#5f6368] hover:bg-[#e8eaed]"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    </div>
                  </React.Fragment>
                ))}

                {(searchingFrom || searchingTo || searchingExtra) && (
                  <div className="pl-8 text-[11px] text-[#5f6368]">{t('routing.searchingPlaces')}</div>
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={extraStops.length >= 6}
              onClick={() => setExtraStops((prev) => [...prev, newExtraStop()])}
              className={`mt-2 inline-flex h-10 w-full items-center gap-3 border-0 bg-transparent px-0 text-sm font-medium shadow-none transition-colors ${
                extraStops.length >= 6
                  ? 'cursor-not-allowed text-[#9aa0a6]'
                  : 'text-[#5f6368] hover:text-[#202124]'
              }`}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#5f6368] text-[14px] leading-none">
                  +
                </span>
              </span>
              <span>{extraStops.length >= 6 ? t('routing.maxExtraStops') : t('routing.addStop')}</span>
            </button>
          </div>

          <div className="space-y-2 border-b border-[#e8eaed] px-4 py-3">
            <div className="group relative">
              <div className="flex items-center gap-2">
              <input
                type="number"
                min={150}
                max={5000}
                step={50}
                value={nearestNodeMaxM}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setNearestNodeMaxM(Math.min(5000, Math.max(150, n)));
                }}
                className="w-24 rounded-md border border-[#dadce0] px-2 py-1.5 text-xs text-[#3c4043]"
                title={t('routing.snapRadiusTitle')}
              />
              <button
                type="button"
                onClick={searchRoute}
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[#1a73e8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1558d6] disabled:opacity-60"
              >
                <FaRoute />
                {loading ? t('routing.finding') : t('routing.findSafeRoute')}
              </button>
              </div>
              <p className="text-[11px] text-[#5f6368]">{t('routing.snapHintLine')}</p>
              <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-[360px] rounded bg-[#333] px-3 py-2 text-[12px] leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {t('routing.snapTooltip')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-b border-[#e8eaed] px-4 py-3 text-xs text-[#1a73e8]">
            <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 opacity-50">
              <FaLocationCrosshairs /> {t('routing.sendToPhone')}
            </button>
            <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 opacity-50">
              <FaLink /> {t('routing.copyLink')}
            </button>
          </div>

          {/* Tạm ẩn danh sách thẻ gợi ý tuyến (QL13 / Xa lộ Hà Nội / Võ Văn Kiệt...)
          <div className="space-y-1 border-b border-[#e8eaed] px-2 py-2">
            {routeCards.map((card) => (
              <article
                key={card.id}
                className={`rounded-md border border-transparent px-3 py-3 ${card.active ? 'bg-[#e8f0fe] shadow-sm ring-1 ring-[#d2e3fc]' : 'hover:bg-[#f8f9fa]'}`}
                style={card.active ? { borderLeft: '4px solid #1a73e8' } : undefined}
              >
                <div className="mb-1 flex items-center justify-between text-[11px] text-[#5f6368]">
                  <span>{card.statusText}</span>
                  <span>{card.toll ? 'Có thu phí' : 'Không thu phí'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <FaCarSide className="mt-1 text-[#5f6368]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[#202124]">{card.name}</div>
                    <div className="mt-1 flex gap-3 text-xs">
                      <button type="button" className="text-[#1a73e8]">Chi tiết</button>
                      <button type="button" className="text-[#1a73e8]">Xem trước</button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-base font-semibold ${card.active ? 'text-[#188038]' : 'text-[#202124]'}`}>{card.eta}</div>
                    <div className="text-xs text-[#5f6368]">{card.distance}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          */}

          <div className="border-t border-[#e8eaed] px-4 py-3">
            {result && found && (
              <div className="space-y-2">
                <div className="rounded-lg border border-[#d2e3fc] bg-[#e8f0fe] px-3 py-2.5">
                  <div className="mb-1 text-xs font-medium text-[#1a73e8]">
                    {vehicleName && vehicleMaxDepthCm != null
                      ? t('routing.routeForVehicle', { name: vehicleName, depth: vehicleMaxDepthCm })
                      : t('routing.routeFound')}
                  </div>
                  <div className="flex items-center gap-4 text-sm font-semibold text-[#202124]">
                    <span>{distanceKm != null ? `${numberFormatter.format(distanceKm)} km` : '—'}</span>
                    <span className="text-[#5f6368]">·</span>
                    <span>{etaMin != null ? t('routing.minutesShort', { n: etaMin }) : '—'}</span>
                  </div>
                  {result.avoided && (
                    <div className="mt-1.5 text-xs text-[#5f6368]">
                      {t('routing.avoidedSegments', {
                        blocked: Array.isArray(result.avoided.blocked_edge_ids) ? result.avoided.blocked_edge_ids.length : 0,
                        nearLimit: Array.isArray(result.avoided.near_limit_edge_ids) ? result.avoided.near_limit_edge_ids.length : 0
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
            {result && !found && (
              <div className="space-y-2">
                <div className="rounded-md border border-[#f9ab00] bg-[#fef7e0] px-3 py-2 text-xs text-[#5f370e]">
                  <div className="font-medium">{t('routing.noSafeRouteTitle', { name: vehicleName || t('routing.vehicleMotorbike') })}</div>
                  <div className="mt-1">{result.reason || t('routing.noSafeRouteDesc')}</div>
                </div>
                <div className="rounded-md border border-[#e8eaed] bg-[#f8f9fa] px-3 py-2 text-xs text-[#5f6368]">
                  💡 {t('routing.noSafeRouteSuggestion')}
                </div>
              </div>
            )}
            <button type="button" onClick={() => setShowAdvancedInfo((v) => !v)} className="mt-2 text-[11px] text-[#5f6368] underline">
              {showAdvancedInfo ? t('routing.hideTech') : t('routing.showTech')}
            </button>
            {showAdvancedInfo && result && (
              <div className="mt-2 space-y-1 text-[11px] text-[#5f6368]">
                <div>{t('routing.techSegments')}: {Array.isArray(result?.route?.segments) ? result.route.segments.length : 0}</div>
                <div>{t('routing.techNodes')}: {nodePathCount}</div>
                <div>{t('routing.techStartNode')}: {startNodeInfo.id} | {t('routing.techEndNode')}: {endNodeInfo.id}</div>
                {vehicleName && <div>{t('routing.techVehicle')}: {vehicleName}</div>}
                {vehicleMaxDepthCm != null && <div>{t('routing.techMaxDepth')}: {numberFormatter.format(Number(vehicleMaxDepthCm))} cm</div>}
                {floodSourcesSummary.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    <div className="font-medium">{t('routing.techFloodSources')}:</div>
                    {floodSourcesSummary.map((item, i) => (
                      <div key={i} className="ml-2">• {item.label}: {item.value}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        <section ref={routingMapSectionRef} className="relative h-full flex-1 overflow-hidden bg-[#e5e3df]">
          {MAPBOX_TOKEN ? (
            <Map
              ref={mapRef}
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={{ longitude: defaultLng, latitude: defaultLat, zoom: DEFAULT_ZOOM }}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              style={{ width: '100%', height: '100%' }}
              onLoad={() => {
                mapRef.current?.getMap?.()?.resize?.();
              }}
              onClick={handleMapClick}
            >
              {startLat != null && startLng != null && (
                <Marker longitude={startLng} latitude={startLat} anchor="center">
                  <div className="h-4 w-4 rounded-full border-2 border-white bg-[#1a73e8]" title={t('routing.markerStart')} />
                </Marker>
              )}
              {userLocation &&
                userLocation.lat != null &&
                userLocation.lng != null &&
                Number.isFinite(userLocation.lat) &&
                Number.isFinite(userLocation.lng) && (
                  <UserLocationMarker
                    latitude={userLocation.lat}
                    longitude={userLocation.lng}
                    accuracy={userLocation.accuracy}
                    source={userLocation.source}
                    mapTheme="dark"
                  />
                )}
              {endLat != null && endLng != null && (
                <Marker longitude={endLng} latitude={endLat} anchor="bottom">
                  <FaLocationDot className="text-xl text-[#d93025]" title={t('routing.markerEnd')} />
                </Marker>
              )}
              {extraStops.map((stop) =>
                stop.lat != null &&
                stop.lng != null &&
                Number.isFinite(stop.lat) &&
                Number.isFinite(stop.lng) ? (
                  <Marker key={`extra-${stop.id}`} longitude={stop.lng} latitude={stop.lat} anchor="bottom">
                    <FaLocationDot className="text-lg text-[#d93025]" title={t('routing.markerExtra')} />
                  </Marker>
                ) : null
              )}
              {floodData.map((item, index) => {
                const status = item.status || 'normal';
                const color = statusColors[status] || statusColors.normal;
                const sensorId = item.sensor_id || `sensor-${index}`;
                const isOnline = status !== 'offline';
                return <SensorMarker key={sensorId} item={item} color={color} isOnline={isOnline} />;
              })}
              {nonExpiredCrowdReports.map((report) => {
                const lat = report.lat;
                const lng = report.lng;
                if (lat == null || lng == null) return null;
                const color = getCrowdMarkerColor(report);
                return (
                  <Marker key={`crowd-${report.id}`} longitude={lng} latitude={lat} anchor="bottom">
                    <div className="flex flex-col items-center" title={report.location_description || t('routing.crowdMarkerTitle')}>
                      <div className="rounded-full border-2 border-white" style={{ width: 18, height: 18, backgroundColor: color }} />
                      <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `8px solid ${color}`, marginTop: -2 }} />
                    </div>
                  </Marker>
                );
              })}
              {found && routeGeoJSON.features.length > 0 && (
                <Source id="safe-route" type="geojson" data={routeGeoJSON}>
                  <Layer
                    id="route-casing"
                    type="line"
                    beforeId={ROUTE_BEFORE_LAYER_ID}
                    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                    paint={{
                      'line-color': '#213a8f',
                      'line-width': 14,
                      'line-opacity': 0.9
                    }}
                  />
                  <Layer
                    id={ROUTE_NORMAL_LAYER_ID}
                    type="line"
                    beforeId={ROUTE_BEFORE_LAYER_ID}
                    filter={['==', ['get', 'status'], 'normal']}
                    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                    paint={{
                      'line-color': [
                        'interpolate', ['linear'], ['get', 'depthRatio'],
                        0, '#4CAF50',
                        0.5, '#FFEB3B',
                        1, '#FF9800'
                      ],
                      'line-width': 10,
                      'line-opacity': 0.98
                    }}
                  />
                  <Layer
                    id="route-near-limit"
                    type="line"
                    beforeId={ROUTE_BEFORE_LAYER_ID}
                    filter={['==', ['get', 'status'], 'near_limit']}
                    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                    paint={{
                      'line-color': '#FF9800',
                      'line-width': 10,
                      'line-opacity': 0.95,
                      'line-dasharray': [2, 1]
                    }}
                  />
                  <Layer
                    id="route-blocked"
                    type="line"
                    beforeId={ROUTE_BEFORE_LAYER_ID}
                    filter={['==', ['get', 'status'], 'blocked']}
                    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                    paint={{
                      'line-color': '#F44336',
                      'line-width': 10,
                      'line-opacity': 0.9,
                      'line-dasharray': [1, 1]
                    }}
                  />
                </Source>
              )}
              {found && routeHoverTooltip.visible && (
                <Popup
                  longitude={routeHoverTooltip.lng}
                  latitude={routeHoverTooltip.lat}
                  anchor="bottom"
                  offset={[0, -10]}
                  closeButton={false}
                  closeOnClick={false}
                  maxWidth="200px"
                  className="route-eta-hover-popup"
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="rounded-md border border-[#dadce0] bg-white px-2.5 py-1.5 text-xs shadow-md">
                    <div className="font-semibold leading-tight text-[#202124]">
                      {etaMin != null ? t('routing.minutesShort', { n: etaMin }) : '—'}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-tight text-[#5f6368]">
                      {distanceKm != null ? `${numberFormatter.format(distanceKm)} km` : '—'}
                    </div>
                  </div>
                </Popup>
              )}
            </Map>
          ) : (
            <div className="h-full w-full bg-[#e5e3df]" />
          )}

          <div className="absolute bottom-6 right-4 z-20 flex flex-col gap-2">
            <button type="button" className="rounded-md bg-white p-2 shadow-md hover:bg-[#f8f9fa]">+</button>
            <button type="button" className="rounded-md bg-white p-2 shadow-md hover:bg-[#f8f9fa]">-</button>
            <button type="button" className="rounded-md bg-white p-2 shadow-md hover:bg-[#f8f9fa]">
              <FaLocationCrosshairs className="text-[#3c4043]" />
            </button>
            <button type="button" className="rounded-md bg-white p-2 shadow-md hover:bg-[#f8f9fa]">L</button>
            <button type="button" className="rounded-md bg-white p-2 shadow-md hover:bg-[#f8f9fa]">
              <FaStreetView className="text-[#fbbc04]" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
