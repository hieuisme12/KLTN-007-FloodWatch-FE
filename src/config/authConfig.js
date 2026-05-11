/**
 * URL bắt đầu luồng đăng nhập Google: BE nhận request rồi redirect sang Google (Authorization Code).
 *
 * - `VITE_GOOGLE_AUTH_START_URL` — URL đầy đủ nếu BE đặt path khác mặc định.
 * - Mặc định: `{VITE_API_BASE_URL}/api/v1/auth/google` (khớp callback đã cấu hình trên Google Cloud).
 *
 * `VITE_GOOGLE_CLIENT_ID` chỉ cần khi dùng Google Identity Services / One Tap trên FE; luồng redirect thuần không dùng.
 */
export function getGoogleOAuthStartUrl() {
  const override = (import.meta.env.VITE_GOOGLE_AUTH_START_URL || '').trim();
  if (override) return override;
  const base = (import.meta.env.VITE_API_BASE_URL || 'https://api.floodsight.id.vn').replace(/\/$/, '');
  return `${base}/api/v1/auth/google`;
}
