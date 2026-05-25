// Màu sắc theo trạng thái (5 mức BE + offline)
export const statusColors = {
  normal: '#4CAF50',
  warning: '#FFEB3B',
  elevated: '#FF9800',
  danger: '#F44336',
  critical: '#B71C1C',
  offline: '#6c757d',
};

// Nhãn trạng thái
export const statusLabels = {
  normal: 'Bình thường',
  warning: 'Cảnh báo',
  elevated: 'Nâng cao',
  danger: 'Nguy hiểm',
  critical: 'Nghiêm trọng',
  offline: 'Mất kết nối'
};

// Tọa độ mặc định (TP.HCM)
export const DEFAULT_CENTER = [10.776, 106.701];
export const DEFAULT_ZOOM = 13;

export { FLOOD_LEVELS, FLOOD_LEVEL_VALUES } from './floodLevels';
