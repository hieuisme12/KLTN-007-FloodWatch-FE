# FLOODSIGHT TP.HCM — Kịch bản trình bày & demo (15 phút)

> **Mục đích:** Chuyển thành slide PowerPoint / Canva / Google Slides.  
> **Đơn vị:** Nhóm 007 — IUH · **Sản phẩm:** Hệ thống giám sát & cảnh báo ngập lụt TP.HCM  
> **URL demo gợi ý:** `https://floodsight.id.vn` (hoặc `localhost:5173` nếu demo local + API production)

---

## Phân bổ thời gian (tổng ~15 phút)

| Phút | Nội dung | Slide |
|------|----------|-------|
| 0:00–1:30 | Mở đầu, vấn đề, mục tiêu | 1–3 |
| 1:30–3:30 | Tổng quan hệ thống & kiến trúc | 4–5 |
| 3:30–11:30 | **Demo trực tiếp** (6 luồng) | (màn hình) |
| 11:30–13:30 | Công nghệ, vai trò, điểm nổi bật | 6–7 |
| 13:30–15:00 | Hạn chế, hướng phát triển, kết luận | 8–9 |

---

## SLIDE 1 — Tiêu đề (30 giây)

**Tiêu đề:** FLOODSIGHT — Hệ thống giám sát & cảnh báo ngập lụt Thành phố Hồ Chí Minh

**Phụ đề:**
- Đồ án / Khóa luận tốt nghiệp — Nhóm 007
- Trường Đại học Công nghiệp TP.HCM (IUH)
- Người trình bày: [Họ tên] · GVHD: [Họ tên]

**Nói nhanh:**  
*“Chúng em xây dựng nền tảng web tập trung bản đồ, cảm biến, báo cáo cộng đồng, tìm đường tránh ngập và cảnh báo khẩn qua Telegram — phục vụ người dân và điều phối viên trong mùa mưa & triều cường.”*

---

## SLIDE 2 — Bối cảnh & vấn đề (45 giây)

**Vấn đề thực tế**
- TP.HCM: ngập cục bộ, thông tin phân tán, khó dự đoán tuyến đi an toàn.
- Dữ liệu rời rạc: trạm đo, tin báo mạng xã hội, báo chí — thiếu một “mặt kính” thống nhất.

**Giải pháp đề xuất**
- **FLOODSIGHT:** gom **cảm biến IoT** + **báo cáo người dân (sau kiểm duyệt)** + **thời tiết / tin RSS** + **tìm đường AMC-A\*** + **cảnh báo vùng (Telegram)**.

**Ghi chú trình bày:** Nhấn mạnh *tham khảo*, không thay thế chỉ đạo chính quyền.

---

## SLIDE 3 — Mục tiêu hệ thống (45 giây)

| Mục tiêu | Cách đạt trên FLOODSIGHT |
|----------|---------------------------|
| Giám sát realtime | API cảm biến, polling 5–10s, trạng thái normal / warning / danger |
| Cộng đồng bổ sung | Gửi báo cáo + ảnh + GPS; moderator duyệt trước khi hiển thị công khai |
| Hỗ trợ di chuyển | Tìm đường an toàn (tránh cạnh ngập), xe máy / ô tô / SUV |
| Cảnh báo chủ động | Đăng ký vùng + bán kính → bot Telegram khi nguy cơ cao |
| Vận hành | Cổng Admin/Moderator: thiết bị, kiểm duyệt, thống kê |

---

## SLIDE 4 — Tổng quan chức năng (1 phút)

**Sơ đồ khối (vẽ trên slide):**

```text
┌─────────────┐     HTTPS/JWT      ┌──────────────────┐
│  Web / App  │ ◄──────────────► │  API Backend     │
│  (React)    │                  │  api.floodsight  │
└──────┬──────┘                  └────────┬─────────┘
       │ Mapbox / Geocode                 │
       ▼                                  ├── IoT sensors (HC-SR04, DHT22…)
  Người dân / Khách                       ├── PostgreSQL / business logic
  User / Moderator / Admin                ├── Open-Meteo (thời tiết)
                                          ├── OSM graph (routing AMC-A*)
                                          ├── RSS (VnExpress, Tuổi Trẻ, NLD)
                                          └── Telegram Bot (cảnh báo)
```

**Module người dùng (sidebar):**
1. Trang chủ (Dashboard)  
2. Bản đồ chi tiết  
3. Tìm đường an toàn  
4. Báo cáo & danh sách  
5. Cảnh báo khẩn theo vùng  
6. Hồ sơ · Đăng nhập / Đăng ký · VI/EN  

---

## SLIDE 5 — Vai trò & phân quyền (1 phút)

| Vai trò | Quyền chính |
|---------|-------------|
| **Khách** | Xem bản đồ, routing, danh sách báo cáo công khai |
| **User** | Gửi báo cáo ngập, cảnh báo Telegram, quản lý profile |
| **Moderator** | Kiểm duyệt báo cáo, cổng điều hành, xếp hạng tin cậy |
| **Admin** | Sức khỏe thiết bị, tổng hợp cảnh báo khẩn, cấu hình hạ tầng |

**RBAC:** JWT + refresh token; route `/admin`, `/moderation` tách biệt giao diện công khai.

---

# PHẦN DEMO TRỰC TIẾP (~8 phút)

> **Chuẩn bị trước khi lên sân khấu**
> - Tài khoản **user** + **moderator** (hoặc admin) đã login sẵn tab.
> - Có ít nhất 1 cảm biến online (hoặc chấp nhận demo “offline” + giải thích).
> - Telegram đã liên kết (tab Cảnh báo khẩn).
> - Tuyến routing test: 2 điểm quen thuộc (VD: Quận 1 → Quận 10).
> - Mạng ổn định; nếu API thời tiết 502 → nói “phụ thuộc Open-Meteo, đã có cache phía BE”.

---

## DEMO 1 — Trang chủ & bản đồ (1 phút 30 giây)

**Đường dẫn:** `/dashboard`

**Thao tác:**
1. Mở trang chủ → banner *“Xem bản đồ thông minh”*.
2. Chỉ **bản đồ Mapbox**: marker cảm biến (màu theo mực nước / trạng thái).
3. Click / hover cảm biến → panel phải: **ID, mực nước (cm), trạng thái, dự báo**.
4. (Nếu có) marker báo cáo cộng đồng đã duyệt → độ tin cậy, mức ngập.
5. Kéo xuống: **Thời tiết TP.HCM** + **Tin thời sự** (RSS 3 nguồn).

**Câu thoại mẫu:**  
*“Đây là màn hình tổng quan: realtime từ trạm IoT, lớp crowd sau kiểm duyệt, và hai widget tham khảo thời tiết / báo chí.”*

**Điểm nhấn kỹ thuật:** polling `flood-data` 5s, `crowd-reports` 10s; fusion có thể bật trên `/map`.

---

## DEMO 2 — Bản đồ chi tiết & lớp fusion (1 phút)

**Đường dẫn:** `/map`

**Thao tác:**
1. Bật/tắt lớp: cảm biến, báo cáo, **fusion** (trộn sensor + crowd).
2. Zoom khu vực ngập → giải thích màu / kích thước marker fusion.

**Câu thoại:**  
*“Trang map cho phép người dùng so sánh dữ liệu đo và cảm nhận cộng đồng trên cùng một nền.”*

---

## DEMO 3 — Báo cáo ngập từ người dân (1 phút 30 giây)

**Đường dẫn:** `/report/new` → sau đó `/reports`

**Thao tác:**
1. **Tạo báo cáo:** chọn mức ngập, mô tả, ảnh (tùy chọn), chọn vị trí trên map / tìm địa chỉ.
2. Gửi → thông báo thành công (chờ duyệt).
3. Sang **Danh sách báo cáo:** lọc trạng thái, thời hạn, độ tin, tìm kiếm.

**Câu thoại:**  
*“Mọi báo cáo công khai đều qua moderator — đảm bảo chất lượng trước khi lên bản đồ.”*

*(Tùy chọn 20s)* Mở tab moderator → duyệt 1 báo cáo pending.

---

## DEMO 4 — Tìm đường an toàn AMC-A* (2 phút)

**Đường dẫn:** `/routing`

**Thao tác:**
1. Chọn loại xe: **xe máy / ô tô / SUV**.
2. Nhập **điểm đi** & **điểm đến** (gợi ý địa chỉ hoặc “vị trí của tôi”).
3. (Tuỳ chọn) Thêm điểm dừng; chỉnh **bán kính snap** đường.
4. Bấm **Tìm đường an toàn** → hiển thị tuyến trên map (xanh = an toàn; tránh cạnh ngập / blocked).
5. Chỉ ETA, khoảng cách; (nếu có) nguồn flood: sensor / crowd / manual.

**Câu thoại:**  
*“Thuật toán AMC-A* trên đồ thị đường TP.HCM, loại trừ hoặc penalize các đoạn có nguy cơ ngập theo dữ liệu realtime.”*

**Lưu ý khi lỗi:** 502 routing → “backend/graph service”; vẫn giải thích được logic.

---

## DEMO 5 — Cảnh báo khẩn Telegram (1 phút 30 giây)

**Đường dẫn:** `/emergency-alerts`

**Thao tác:**
1. **Liên kết Telegram** → mở bot, `/start`.
2. **Đăng ký vùng mới:** chọn bán kính → đặt tên (tuỳ chọn) → chọn điểm trên map → Xong.
3. Danh sách đăng ký: bật/tắt, sửa, xóa.

**Câu thoại:**  
*“Người dùng chủ động khoanh vùng quan tâm — hệ thống đẩy cảnh báo khi nguy cơ ngập vượt ngưỡng trong bán kính đó.”*

---

## DEMO 6 — Đa ngôn ngữ & phụ trợ (30 giây)

**Thao tác:**
1. Header: đổi **cờ VN / Mỹ** → UI VI ↔ EN.
2. (Tuỳ chọn) Mở **ChatBot** góc màn hình — tính năng hỗ trợ / WIP.

**Câu thoại:**  
*“Giao diện i18n react-i18next; phù hợp demo cho hội đồng hoặc người dùng quốc tế.”*

---

## SLIDE 6 — Công nghệ sử dụng (1 phút)

| Tầng | Công nghệ |
|------|-----------|
| Frontend | React 18, Vite 7, React Router 6, Tailwind CSS |
| Bản đồ | Mapbox GL, react-map-gl |
| UI | PrimeReact, Headless UI, Recharts |
| i18n | i18next, react-i18next |
| HTTP | Axios, JWT refresh queue |
| Mobile | Capacitor (Android) |
| Backend (triển khai) | REST API `api.floodsight.id.vn` |
| Dữ liệu ngoài | Open-Meteo, Google Geocode (qua BE), RSS báo chí, Telegram Bot |

**Kiến trúc FE:** `pages/user`, `components/map`, `services/api.js`, `config/apiConfig.js`, context (Guest, Sidebar, Reporter ranking).

---

## SLIDE 7 — Điểm nổi bật & đóng góp (1 phút)

1. **Đa nguồn dữ liệu:** IoT + crowd + fusion + routing trên cùng hệ sinh thái.  
2. **Tìm đường có ý thức ngập:** AMC-A*, phương tiện, snap graph, nhiều chặng.  
3. **Tin cậy cộng đồng:** kiểm duyệt, badge độ tin, ranking reporter (admin/mod).  
4. **Cảnh báo chủ động:** đăng ký vùng + Telegram.  
5. **Sẵn sàng vận hành:** admin health devices, thống kê truy cập, song ngữ.

---

## SLIDE 8 — Hạn chế & hướng phát triển (1 phút)

**Hạn chế hiện tại**
- Phụ thuộc uptime API & rate limit (thời tiết Open-Meteo, gateway 502).
- Cảm biến offline → dữ liệu trễ; crowd cần kiểm duyệt → độ trễ hiển thị.
- Thông tin **tham khảo**, không thay cảnh báo chính thống.

**Hướng phát triển**
- Cache / CDN cho weather; mở rộng mạng cảm biến.
- Push notification (FCM) song song Telegram.
- ML dự báo ngập ngắn hạn; tối ưu graph routing theo thời gian thực.
- Hoàn thiện ChatBot / mobile app.

---

## SLIDE 9 — Kết luận & Q&A (30 giây)

**Kết luận**
- FLOODSIGHT là nền tảng **tích hợp** giám sát, cộng đồng, định tuyến và cảnh báo cho TP.HCM.
- Đã triển khai web production, RBAC, đa ngôn ngữ, sẵn sàng demo end-to-end.

**Lời cảm ơn** — Hội đồng, GVHD, IUH, nhóm 007.

**Q&A**

---

## Phụ lục A — Checklist slide PowerPoint (gợi ý 10–12 slide)

1. Tiêu đề  
2. Vấn đề  
3. Mục tiêu  
4. Kiến trúc (sơ đồ)  
5. Vai trò người dùng  
6. **Screenshot:** Dashboard + map  
7. **Screenshot:** Báo cáo + kiểm duyệt  
8. **Screenshot:** Routing + tuyến  
9. **Screenshot:** Cảnh báo Telegram  
10. Công nghệ  
11. Hạn chế & tương lai  
12. Cảm ơn / Q&A  

---

## Phụ lục B — Câu hỏi hội đồng thường gặp (chuẩn bị trước)

| Câu hỏi | Gợi ý trả lời ngắn |
|---------|---------------------|
| Khác app bản đồ thường? | Kết hợp **cảm biến + crowd đã duyệt + routing tránh ngập + Telegram**. |
| Độ tin báo cáo dân? | Moderation + confidence score + fusion với sensor gần đó. |
| AMC-A* là gì? | A* trên đồ thị đường có **chi phí theo độ ngập** cạnh (blocked / near limit). |
| Bảo mật? | JWT, refresh, RBAC; HTTPS; không lộ token Mapbox (env). |
| Scale? | Polling có interval; BE cache RSS/news; routing timeout 120s. |
| 502 weather? | BE proxy Open-Meteo bị 429 → cần cache phía server. |

---

## Phụ lục C — Lệnh chạy demo local (nếu cần)

```bash
# Frontend
npm install
cp .env.example .env   # VITE_API_BASE_URL, VITE_MAPBOX_TOKEN
npm run dev              # http://localhost:5173
```

**Biến môi trường quan trọng:** `VITE_API_BASE_URL`, `VITE_MAPBOX_TOKEN`

---

*Tài liệu tạo cho repo KLTN-DoAn — chỉnh tên nhóm, GVHD, screenshot trước ngày bảo vệ.*
