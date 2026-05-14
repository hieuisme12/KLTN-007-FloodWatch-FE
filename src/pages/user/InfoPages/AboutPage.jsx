import React from 'react';
import { Link } from 'react-router-dom';
const AboutPage = () => {
  return (
    <div className="info-page">
      <h1>Về FLOODSIGHT Thành phố Hồ Chí Minh</h1>
      <p className="info-lead">
        FLOODSIGHT là nền tảng giám sát và hỗ trợ thông tin ngập lụt, kết hợp dữ liệu cảm biến,
        báo cáo từ người dân và nội dung tham khảo nhằm giúp cộng đồng nắm bắt tình hình nhanh
        hơn trong mùa mưa và triều cường.
      </p>

      <h2>Sứ mệnh</h2>
      <p>
        Chúng tôi hướng tới việc tập trung thông tin liên quan đến ngập úng trên một giao diện
        trực quan — bản đồ, mức nước, cảnh báo và báo cáo cộng đồng — để người dùng có thêm
        dữ liệu phục vụ di chuyển, sinh hoạt và phối hợp với các kênh thông tin chính thống.
      </p>

      <h2>Những gì bạn có thể làm trên hệ thống</h2>
      <ul>
        <li>
          <strong>Trang chủ &amp; bản đồ:</strong> theo dõi điểm đo, trạng thái cảnh báo và báo cáo
          ngập đã được kiểm duyệt, xem tin tức thời tiết liên quan.
        </li>
        <li>
          <strong>Báo cáo cộng đồng:</strong> đăng nhập để gửi báo cáo kèm mô tả, hình ảnh và vị trí,
          góp phần bổ sung thông tin tại khu vực bạn quan sát được.
        </li>
        <li>
          <strong>Danh sách báo cáo:</strong> tra cứu, lọc và xem chi tiết các báo cáo đã công khai
          theo chính sách kiểm duyệt của hệ thống.
        </li>
        <li>
          <strong>Tài khoản cá nhân:</strong> quản lý thông tin hồ sơ, mật khẩu và các tùy chọn liên
          quan đến trải nghiệm đăng nhập.
        </li>
        <li>
          <strong>Kiểm duyệt (dành cho điều phối viên):</strong> xem xét báo cáo chờ duyệt, phê duyệt
          hoặc từ chối theo quy trình nội bộ nhằm duy trì chất lượng nội dung hiển thị công khai.
        </li>
      </ul>

      <h2>Đơn vị phát triển</h2>
      <p>
        Dự án được phát triển bởi <strong>Nhóm 007 — Trường Đại học Công nghiệp Thành phố Hồ Chí Minh
        (IUH)</strong>, trong khuôn khổ nghiên cứu và ứng dụng công nghệ vào quản lý rủi ro thiên tai
        đô thị.
      </p>

      <h2>Lưu ý quan trọng</h2>
      <p>
        Thông tin trên FLOODSIGHT mang tính hỗ trợ tham khảo, có độ trễ kỹ thuật và phụ thuộc vào
        nguồn dữ liệu, mạng truyền và hoạt động của thiết bị đo. Người dùng nên luôn theo dõi cảnh báo
        từ cơ quan nhà nước, đài truyền hình, phát thanh và ứng dụng chính thức của địa phương khi có
        mưa lớn, triều cường hoặc tình huống khẩn cấp.
      </p>

      <p className="info-muted">
        Cập nhật nội dung trang: tháng 3/2026. Mọi góp ý về sản phẩm, vui lòng xem mục{' '}
        <Link to="/contact">Liên hệ</Link>.
      </p>
    </div>
  );
};

export default AboutPage;
