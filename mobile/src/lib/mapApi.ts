import {
  API_ENDPOINTS,
  CROWD_REPORT_MAP_HOURS,
  HCM_MAP_CENTER
} from '@hcm-flood/shared';
import { apiClient } from './api';

export type SensorStatus =
  | 'normal'
  | 'warning'
  | 'elevated'
  | 'danger'
  | 'critical'
  | 'offline';

export type MapSensor = {
  sensor_id: string;
  location_name: string;
  lat: number;
  lng: number;
  water_level: number;
  status: SensorStatus;
};

export type MapCrowdReport = {
  id: number | string;
  lat: number;
  lng: number;
  flood_level?: string;
  reporter_name?: string;
  created_at?: string;
};

const WARNING_THRESHOLD = 10;
const ELEVATED_THRESHOLD = 20;
const DANGER_THRESHOLD = 30;
const CRITICAL_THRESHOLD = 50;

let floodEndpoint: 'realtime' | 'realtime_v1' | 'fallback' | null = null;

function normalizeSensor(item: Record<string, unknown>): MapSensor | null {
  const lat = Number(item.lat ?? HCM_MAP_CENTER.lat);
  const lng = Number(item.lng ?? HCM_MAP_CENTER.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const waterLevel = Number(item.water_level) || 0;
  const warningThreshold = Number(item.warning_threshold) || WARNING_THRESHOLD;
  const elevatedThreshold = Number(item.elevated_threshold) || ELEVATED_THRESHOLD;
  const dangerThreshold = Number(item.danger_threshold) || DANGER_THRESHOLD;
  const criticalThreshold = Number(item.critical_threshold) || CRITICAL_THRESHOLD;

  let status = item.status as SensorStatus | string | undefined;
  if (status == null || status === '') {
    status = item.sensor_status as string | undefined;
  }
  if (typeof status === 'string') {
    const t = status.trim().toLowerCase();
    if (t === 'offline' || t === 'disconnected' || t === 'inactive') {
      status = 'offline';
    } else if (t === 'online' || t === 'connected' || t === 'active' || t === 'live') {
      status = undefined;
    } else if (
      t === 'normal' ||
      t === 'warning' ||
      t === 'elevated' ||
      t === 'danger' ||
      t === 'critical'
    ) {
      status = t as SensorStatus;
    }
  }

  if (!status) {
    if (waterLevel >= criticalThreshold) status = 'critical';
    else if (waterLevel >= dangerThreshold) status = 'danger';
    else if (waterLevel >= elevatedThreshold) status = 'elevated';
    else if (waterLevel >= warningThreshold) status = 'warning';
    else status = 'normal';
  }

  return {
    sensor_id: String(item.sensor_id ?? item.id ?? `${lat},${lng}`),
    location_name: String(item.location_name ?? 'Cảm biến'),
    lat,
    lng,
    water_level: waterLevel,
    status: (status as SensorStatus) || 'normal'
  };
}

function isReportExpired(report: MapCrowdReport, maxAgeHours = CROWD_REPORT_MAP_HOURS) {
  if (!report.created_at) return false;
  const created = new Date(report.created_at).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created > maxAgeHours * 60 * 60 * 1000;
}

export async function fetchMapSensors(): Promise<MapSensor[]> {
  const tryPath = async (path: string) =>
    apiClient.get(`${path}?t=${Date.now()}`, { validateStatus: (s) => s < 500 });

  let response;
  if (floodEndpoint === null) {
    response = await tryPath(API_ENDPOINTS.FLOOD_DATA_REALTIME);
    if (response.status === 200) floodEndpoint = 'realtime';
    else if (response.status === 404) {
      response = await tryPath(API_ENDPOINTS.FLOOD_DATA_REALTIME_V1);
      if (response.status === 200) floodEndpoint = 'realtime_v1';
      else {
        floodEndpoint = 'fallback';
        response = await apiClient.get(`${API_ENDPOINTS.FLOOD_DATA}?t=${Date.now()}`);
      }
    } else {
      floodEndpoint = 'fallback';
      response = await apiClient.get(`${API_ENDPOINTS.FLOOD_DATA}?t=${Date.now()}`);
    }
  } else {
    const path =
      floodEndpoint === 'realtime'
        ? API_ENDPOINTS.FLOOD_DATA_REALTIME
        : floodEndpoint === 'realtime_v1'
          ? API_ENDPOINTS.FLOOD_DATA_REALTIME_V1
          : API_ENDPOINTS.FLOOD_DATA;
    response = await apiClient.get(`${path}?t=${Date.now()}`);
  }

  const rows = response.data?.success && Array.isArray(response.data.data)
    ? response.data.data
    : [];
  return rows
    .map((item: Record<string, unknown>) => normalizeSensor(item))
    .filter(Boolean) as MapSensor[];
}

export async function fetchMapCrowdReports(): Promise<MapCrowdReport[]> {
  const { data } = await apiClient.get(API_ENDPOINTS.CROWD_REPORTS, {
    params: { moderation_status: 'approved' }
  });
  const rows = data?.success && Array.isArray(data.data) ? data.data : [];
  return rows
    .map((r: Record<string, unknown>) => {
      const lat = Number(r.lat);
      const lng = Number(r.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        id: (r.id as number | string) ?? `${lat},${lng}`,
        lat,
        lng,
        flood_level: r.flood_level as string | undefined,
        reporter_name: r.reporter_name as string | undefined,
        created_at: r.created_at as string | undefined
      } satisfies MapCrowdReport;
    })
    .filter(Boolean)
    .filter((r: MapCrowdReport) => !isReportExpired(r)) as MapCrowdReport[];
}
