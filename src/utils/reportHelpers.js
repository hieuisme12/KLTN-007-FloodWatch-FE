/**
 * Kiểm tra báo cáo đã hết hạn (không hiển thị trên bản đồ).
 * - Nếu API trả expires_at: so sánh với thời điểm hiện tại.
 * - Ngược lại: so sánh created_at với maxAgeHours (mặc định 24h).
 * @param {Object} report - Báo cáo (có thể có expires_at, created_at)
 * @param {number} maxAgeHours - Số giờ tối đa hiển thị (dùng khi không có expires_at)
 * @returns {boolean} true nếu báo cáo đã hết hạn
 */
export const isReportExpired = (report, maxAgeHours = 24) => {
  if (!report) return true;
  const now = Date.now();
  if (report.expires_at) {
    const expiresAt = new Date(report.expires_at).getTime();
    return now > expiresAt;
  }
  if (report.created_at) {
    const createdAt = new Date(report.created_at).getTime();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    return now - createdAt > maxAgeMs;
  }
  return false;
};

/**
 * Lọc bỏ các báo cáo đã hết hạn (dùng cho danh sách hiển thị trên bản đồ).
 * @param {Array} reports - Mảng báo cáo
 * @param {number} maxAgeHours - Số giờ tối đa hiển thị
 * @returns {Array} Mảng báo cáo chưa hết hạn
 */
export const filterNonExpiredReports = (reports, maxAgeHours = 24) => {
  if (!Array.isArray(reports)) return [];
  return reports.filter((r) => !isReportExpired(r, maxAgeHours));
};
