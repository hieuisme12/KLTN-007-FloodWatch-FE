# FloodSight — KLTN-007 (FloodWatch FE)

Giao diện **người dân** cho hệ thống theo dõi ngập lụt TP.HCM: bản đồ realtime, báo cáo cộng đồng, tìm đường an toàn, cảnh báo khẩn và ứng dụng **mobile Expo** trong cùng monorepo.

**React · Vite · Mapbox · Expo · i18n (vi/en)**

> **Admin / Moderator:** kiểm duyệt và quản trị user nằm ở repo riêng  
> [KLTN-007-FloodWatch-Admin-FE](https://github.com/hieuisme12/KLTN-007-FloodWatch-Admin-FE) (hoặc repo admin của nhóm).

---

## Tính năng chính (Web — người dùng)

| Module | Mô tả | Ghi chú |
|--------|--------|---------|
| **Dashboard** | Bản đồ tổng quan, cảm biến + báo cáo, panel chi tiết, tin tức & thời tiết TP.HCM | Khách (guest) hoặc đã đăng nhập |
| **Bản đồ** | Mapbox: cảm biến, báo cáo đã duyệt, heatmap / fusion (tùy lớp), timeline 24h | `/map` |
| **Báo cáo** | Danh sách báo cáo, lọc/tìm kiếm, độ tin cậy, **popup chi tiết** (ảnh, người duyệt, kiểm duyệt) | `/reports` |
| **Tạo báo cáo** | Form ngập + ảnh (upload), chọn vị trí trên map mini, xác thực gần cảm biến | `/report/new` |
| **Tìm đường** | Gợi ý đường an toàn (AMC-A*), geocode TP.HCM, tránh vùng ngập | `/routing` |
| **Cảnh báo khẩn** | Đăng ký khu vực, bản đồ cảnh báo, marker người dùng | JWT — `/emergency-alerts` |
| **Hồ sơ** | Sửa thông tin, avatar (icon), đổi mật khẩu, Telegram link | JWT — `/profile` |
| **Xác thực** | Đăng ký OTP, đăng nhập, refresh token, quên mật khẩu, Google OAuth (tùy cấu hình BE) | |
| **Khách (guest)** | Xem dashboard/bản đồ/báo cáo không cần đăng nhập (giới hạn theo BE) | |
| **Đa ngôn ngữ** | Tiếng Việt / English (`i18next`) | |
| **Chatbot** | Hỗ trợ trên dashboard | |

### Ảnh báo cáo (Web)

- Upload: `POST /api/upload/report-image` → dùng `absolute_url` khi gửi báo cáo.
- Hiển thị: URL từ API (`photo_url` / `photo_urls`), chuẩn hoá host qua `PUBLIC_BASE_URL` (`VITE_PUBLIC_BASE_URL`).
- Popup chi tiết: thumbnail, mở ảnh tab mới; không gửi Bearer trên thẻ `<img>`.

### Admin trong repo này

- Route `/admin` chỉ có dashboard vận hành nội bộ; **kiểm duyệt / user / audit** chuyển sang **cổng admin riêng** (`ExternalAdminPortalRedirect`).

---

## Tính năng chính (Mobile — Expo Go)

| Tab | Mô tả |
|-----|--------|
| **Trang chủ** | Trạng thái API, số cảnh báo đang hoạt động |
| **Bản đồ** | `react-native-maps`: cảm biến + báo cáo đã duyệt, GPS, poll realtime |
| **Báo cáo** | Danh sách, lọc trạng thái, sheet chi tiết (ảnh, kiểm duyệt) |
| **Tài khoản** | Đăng nhập / hồ sơ / đăng xuất |

```bash
# Từ thư mục gốc repo
npm run mobile          # expo start
npm run mobile:tunnel   # quét QR qua tunnel
```

Cấu hình: `mobile/.env` — `EXPO_PUBLIC_API_BASE_URL`, tuỳ chọn `EXPO_PUBLIC_MAPBOX_TOKEN`.

---

## Công nghệ

| Thành phần | Công nghệ |
|------------|-----------|
| Web SPA | React 18 + **Vite 7**, HMR, deploy Vercel |
| Mobile | **Expo SDK 54**, expo-router, React Native |
| Monorepo | `packages/shared` (API endpoints, constants) |
| Routing | React Router 6, route guard (JWT / guest / admin) |
| UI | Tailwind CSS 3, PrimeReact, Headless UI |
| Bản đồ Web | Mapbox GL (`react-map-gl`), Leaflet (một số màn) |
| Bản đồ Mobile | `react-native-maps` (+ Mapbox tiles nếu có token) |
| HTTP | Axios — interceptors (access + refresh, 401 retry) |
| Biểu đồ | Recharts |
| Geocode | BE Google Places + Mapbox + Nominatim (TP.HCM) |
| Native shell | Capacitor (Android) — tùy chọn build APK |
| i18n | i18next + react-i18next |

---

## Yêu cầu hệ thống

- **Node.js 18+**
- Backend API chạy và cấu hình đúng `VITE_API_BASE_URL` (mặc định production: `https://api.floodsight.id.vn`)
- **Mapbox:** token public cho bản đồ / geocode phía client (`VITE_MAPBOX_TOKEN`)
- Mobile: điện thoại và máy dev **cùng mạng** (hoặc dùng `npm run mobile:tunnel`)

---

## Cài đặt & chạy (Web)

### 1. Clone & cài đặt

```bash
git clone https://github.com/hieuisme12/KLTN-007-FloodWatch-FE.git
cd KLTN-007-FloodWatch-FE
npm install
```

### 2. Cấu hình môi trường

Tạo `.env` tại thư mục gốc (tham khảo `.env.example`):

```env
VITE_API_BASE_URL=https://api.floodsight.id.vn
VITE_MAPBOX_TOKEN=pk....

# Tuỳ chọn — khớp BE PUBLIC_BASE_URL cho ảnh /uploads/*
# VITE_PUBLIC_BASE_URL=https://api.floodsight.id.vn
```

### 3. Development

```bash
npm run dev
```

Mở URL Vite (vd. `http://localhost:5173`). Đăng nhập hoặc **khám phá với tư cách khách** trên dashboard.

### 4. Build production

```bash
npm run build
npm run preview   # tùy chọn
```

Thư mục `dist/` deploy lên **Vercel** (đã có `vercel.json` SPA fallback). Thư mục `mobile/` được `.vercelignore` — không ảnh hưởng build web.

---

## Cài đặt & chạy (Mobile)

```bash
cd mobile
npm install
cp .env.example .env   # chỉnh EXPO_PUBLIC_API_BASE_URL
cd ..
npm run mobile
```

Quét QR bằng **Expo Go** (iOS/Android).

---

## Cấu trúc dự án (tóm tắt)

```
hcm-flood-frontend/
├── src/                          # Web Vite + React
│   ├── config/apiConfig.js       # BASE_URL, endpoints, polling
│   ├── services/api.js           # flood, reports, routing, auth, weather, news...
│   ├── utils/                    # geocode, mediaUrl, reportHelpers, auth...
│   ├── components/
│   │   ├── map/                  # MapView, SensorDetailPanel, ...
│   │   └── reports/              # ReportDetailModal, CreateReportModal, ...
│   ├── pages/user/               # Dashboard, Reports, Map, Routing, ...
│   └── App.jsx                   # Routes
├── mobile/                       # Expo (cài deps riêng)
│   └── app/(tabs)/               # Trang chủ | Bản đồ | Báo cáo | Tài khoản
├── packages/shared/              # API_ENDPOINTS, constants dùng chung
├── android/                      # Capacitor Android (tùy chọn)
├── .env.example
└── vercel.json
```

---

## API sử dụng (tóm tắt)

| Nhóm | Endpoint (ví dụ) |
|------|-------------------|
| Auth | `POST /api/auth/login`, register/OTP, refresh, profile |
| Flood | `GET /api/flood-data/realtime`, `/api/v1/flood-data` |
| Báo cáo | `GET /api/crowd-reports`, `/api/crowd-reports/all`, `POST /api/report-flood` |
| Upload ảnh | `POST /api/upload/report-image` |
| Routing | `GET /api/v1/routing/safe-path` |
| Fusion / heatmap | `/api/v1/fusion/points`, `/api/heatmap/combined` |
| Thời tiết / tin | `GET /api/v1/weather/hcm`, `/api/v1/news/hcm` |
| Geocode | `/api/v1/geocode/search`, `place`, `forward` |
| Cảnh báo | `/api/alerts/active`, `/api/emergency-subscriptions` |

Chi tiết đầy đủ: `src/config/apiConfig.js` và backend KLTN-007.

---

## Scripts hữu ích

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Web development |
| `npm run build` | Build web production |
| `npm run lint` | ESLint |
| `npm run mobile` | Expo dev server |
| `npm run cap:sync` | Build web + đồng bộ Capacitor |

---

## Đóng góp & liên hệ

- **Khoá luận / Đồ án:** KLTN-007 — FloodWatch / FloodSight (Nhóm 007)
- **Repository FE người dùng:** [KLTN-007-FloodWatch-FE](https://github.com/hieuisme12/KLTN-007-FloodWatch-FE)
- **Repository Admin:** repo admin riêng của nhóm (kiểm duyệt, quản lý user, audit log)

Clone repo → tạo branch → commit → mở Pull Request theo quy trình nhóm.

---

**FloodSight** — Theo dõi ngập TP.HCM trên web và mobile, gắn dữ liệu cảm biến và báo cáo cộng đồng theo thời gian thực.
