// Authentication Helper Functions
// RBAC: Admin (hạ tầng, user, sensor, audit) ≠ Moderator (kiểm duyệt, thống kê). Admin không kế thừa quyền Moderator.

/**
 * Lấy thông tin user hiện tại từ localStorage
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Lấy token từ localStorage
 */
export const getToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * Kiểm tra xem user đã đăng nhập chưa
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Kiểm tra xem user có phải admin không (chỉ role 'admin')
 * Admin: hạ tầng (sensor, user, cấu hình, audit). Không duyệt báo cáo.
 */
export const isAdmin = () => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

/**
 * Kiểm tra xem user có phải moderator không (chỉ role 'moderator')
 * Admin KHÔNG được coi là moderator. Moderator: kiểm duyệt báo cáo, cảnh báo, thống kê nghiệp vụ.
 */
export const isModerator = () => {
  const user = getCurrentUser();
  return user?.role === 'moderator';
};

/**
 * Kiểm tra xem user có phải user thường không
 */
export const isUser = () => {
  const user = getCurrentUser();
  return user?.role === 'user';
};

/**
 * Kiểm tra xem user có một trong các roles được chỉ định không
 * @param {string[]} roles - Mảng các roles cần kiểm tra (vd: ['admin'], ['moderator'], ['admin', 'moderator'])
 * @returns {boolean}
 */
export const hasRole = (roles) => {
  const user = getCurrentUser();
  if (!user || !user.role) return false;
  return roles.includes(user.role);
};

/**
 * Kiểm tra xem user có đúng role được yêu cầu không (không có thứ bậc kế thừa)
 * @param {string} role - 'admin' | 'moderator' | 'user'
 * @returns {boolean}
 */
export const hasPermission = (role) => {
  const user = getCurrentUser();
  if (!user || !user.role) return false;
  return user.role === role;
};


