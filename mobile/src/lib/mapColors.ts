import type { SensorStatus } from './mapApi';

export const SENSOR_MARKER_COLORS: Record<SensorStatus, string> = {
  normal: '#16a34a',
  warning: '#eab308',
  danger: '#dc2626',
  offline: '#94a3b8'
};

const CROWD_LEVEL_COLORS: Record<string, string> = {
  Nặng: '#dc2626',
  'Trung bình': '#eab308',
  Nhẹ: '#0891b2'
};

export function crowdReportColor(level?: string) {
  if (level && CROWD_LEVEL_COLORS[level]) return CROWD_LEVEL_COLORS[level];
  return '#16a34a';
}
