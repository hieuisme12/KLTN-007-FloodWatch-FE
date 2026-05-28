import type { SensorStatus } from './mapApi';
export { crowdReportColor, FLOOD_LEVEL_COLORS, getFloodLevelLabel } from './floodLevels';

export const SENSOR_MARKER_COLORS: Record<SensorStatus, string> = {
  normal: '#4CAF50',
  warning: '#FFEB3B',
  elevated: '#FF9800',
  danger: '#F44336',
  critical: '#B71C1C',
  offline: '#6c757d'
};
