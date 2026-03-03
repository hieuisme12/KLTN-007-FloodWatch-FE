# Components Structure

Cấu trúc components được tổ chức theo chức năng để dễ quản lý và bảo trì.

## 📁 Cấu trúc thư mục

### `/layout`
Components cho bố cục chính của ứng dụng
- `Layout.jsx` - Component layout chính wrap tất cả pages
- `Header.jsx` - Header với thông tin và thống kê
- `Sidebar.jsx` - Navigation sidebar với menu
- `Footer.jsx` - Footer với thông tin bản quyền và links

### `/common`
Components dùng chung được sử dụng ở nhiều nơi
- `UserDropdown.jsx` - Dropdown menu cho user
- `ChatBot.jsx` - AI Chatbot hỗ trợ người dùng
- `GuestLoginPrompt.jsx` - Prompt đăng nhập cho guest user

### `/map`
Components liên quan đến bản đồ và hiển thị dữ liệu địa lý
- `MapView.jsx` - Component hiển thị bản đồ chính với markers
- `MapHeader.jsx` - Header cho map page với filters
- `SensorDetailPanel.jsx` - Panel hiển thị chi tiết sensor
- `AlertPanel.jsx` - Panel cảnh báo ngập lụt

### `/reports`
Components xử lý báo cáo ngập lụt
- `CrowdReportsList.jsx` - Danh sách báo cáo từ người dân
- `ReportFloodForm.jsx` - Form tạo báo cáo ngập lụt mới

### `/stats`
Components hiển thị thống kê và dữ liệu
- `SensorStats.jsx` - Thống kê tổng quan về sensors
- `WaterLevelStatistics.jsx` - Biểu đồ và thống kê mực nước

### `/news`
Components tin tức và thông tin thời tiết
- `WeatherNewsSection.jsx` - Section hiển thị thời tiết và tin tức

## 🔧 Import Examples

```jsx
// Layout components
import Layout from '@/components/layout/Layout';
import Header from '@/components/layout/Header';

// Common components
import ChatBot from '@/components/common/ChatBot';
import UserDropdown from '@/components/common/UserDropdown';

// Map components
import MapView from '@/components/map/MapView';
import SensorDetailPanel from '@/components/map/SensorDetailPanel';

// Reports components
import ReportFloodForm from '@/components/reports/ReportFloodForm';

// Stats components
import SensorStats from '@/components/stats/SensorStats';

// News components
import WeatherNewsSection from '@/components/news/WeatherNewsSection';
```

## 📝 Notes

- Tất cả components có CSS riêng được đặt cùng thư mục với component
- Một số CSS shared được đặt trong `/src/styles/components/`
- Components được tổ chức theo Single Responsibility Principle
- Mỗi component nên độc lập và có thể tái sử dụng
