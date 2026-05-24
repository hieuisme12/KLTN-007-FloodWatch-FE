// Màu sắc theo trạng thái
export const statusColors = {
  normal: '#28a745',    // Xanh lá
  warning: '#ffc107',   // Vàng
  danger: '#dc3545',    // Đỏ
  offline: '#6c757d',   // Xám
};

// Nhãn trạng thái (không có icon, icon sẽ được xử lý ở component)
export const statusLabels = {
  normal: 'Bình thường',
  warning: 'Cảnh báo',
  danger: 'Nguy hiểm',
  offline: 'Mất kết nối'
};

// Tọa độ mặc định (TP.HCM)
export const DEFAULT_CENTER = [10.776, 106.701];
export const DEFAULT_ZOOM = 13;

export { FLOOD_LEVELS, FLOOD_LEVEL_VALUES } from './floodLevels';
