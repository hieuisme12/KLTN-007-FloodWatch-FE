import type { SensorStatus } from './mapApi';
export { crowdReportColor, FLOOD_LEVEL_COLORS, getFloodLevelLabel } from './floodLevels';

export const SENSOR_MARKER_COLORS: Record<SensorStatus, string> = {
  normal: '#16a34a',
  warning: '#eab308',
  danger: '#dc2626',
  offline: '#94a3b8'
};
