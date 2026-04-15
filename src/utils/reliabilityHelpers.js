import { FaStar, FaCircle } from 'react-icons/fa6';

/**
 * Badge độ tin cậy theo điểm (báo cáo / hiển thị chung)
 * @param {number} score 0-100
 * @returns {{ color: string, text: string, icon: Component }}
 */
export function getReliabilityBadge(score) {
  if (score >= 81) return { color: '#28a745', text: 'Rất cao', icon: FaStar };
  if (score >= 61) return { color: '#17a2b8', text: 'Cao', icon: FaCircle };
  if (score >= 31) return { color: '#ffc107', text: 'Trung bình', icon: FaCircle };
  return { color: '#dc3545', text: 'Thấp', icon: FaCircle };
}

/**
 * Phân tầng tin cậy reporter (Đồng / Bạc / Vàng) – dùng cho admin, xếp hạng
 * @param {number} score 0-100 (reporter_reliability hoặc reliability_score)
 * @returns {{ tier: string, color: string, bgLight: string }}
 */
export function getReporterReliabilityTier(score) {
  const s = Number(score);
  if (s >= 71) return { tier: 'Vàng', color: '#d4a017', bgLight: '#fef9e7' };
  if (s >= 41) return { tier: 'Bạc', color: '#6c757d', bgLight: '#f0f0f0' };
  return { tier: 'Đồng', color: '#cd7f32', bgLight: '#faf0e6' };
}
