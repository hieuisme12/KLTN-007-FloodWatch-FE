import React from 'react';
import { Link } from 'react-router-dom';
const PrivacyPage = () => {
  return (
    <div className="info-page">
      <h1>Chính sách bảo mật</h1>
      <p className="info-lead">
        FLOODSIGHT Thành phố Hồ Chí Minh cam kết tôn trọng quyền riêng tư của người dùng. Chính sách
        này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ thông tin khi bạn truy cập website và các
        chức năng liên quan.
      </p>

      <h2>1. Phạm vi áp dụng</h2>
      <p>
        Chính sách áp dụng cho trải nghiệm trên nền tảng web FLOODSIGHT (giao diện người dùng kết nối
        tới máy chủ và dịch vụ bản đồ). Khi bạn sử dụng liên kết ra bên thứ ba (mạng xã hội, Mapbox,
        v.v.), điều khoản của bên đó sẽ được áp dụng thêm.
      </p>

      <h2>2. Thông tin chúng tôi có thể thu thập</h2>
      <ul>
        <li>
          <strong>Tài khoản:</strong> khi đăng ký/đăng nhập, hệ thống có thể lưu tên đăng nhập, thông tin
          hồ sơ bạn cung cấp (ví dụ họ tên hiển thị, ảnh đại diện theo cấu hình ứng dụng) và dữ liệu
          xác thực cần thiết cho phiên làm việc.
        </li>
        <li>
          <strong>Báo cáo ngập lụt:</strong> nội dung văn bản, hình ảnh, thời gian gửi và tọa độ/vị trí
          bạn chọn khi tạo báo cáo — để phục vụ hiển thị trên bản đồ sau khi được kiểm duyệt (theo quy
          trình nội bộ).
        </li>
        <li>
          <strong>Kỹ thuật &amp; thiết bị:</strong> nhật ký truy cập cơ bản, loại trình duyệt, thời điểm
          truy vấn có thể được ghi trên máy chủ nhằm vận hành, bảo mật và khắc phục sự cố.
        </li>
      </ul>

      <h2>3. Lưu trữ trên trình duyệt</h2>
      <p>
        Ứng dụng có thể sử dụng bộ nhớ cục bộ của trình duyệt (ví dụ <code>localStorage</code>) để lưu
        mã phiên đăng nhập (token) và thông tin hiển thị nhanh, giúp bạn không phải đăng nhập lại mỗi
        lần tải trang. Bạn có thể xóa dữ liệu trang web trong cài đặt trình duyệt để đăng xuất và xóa
        các giá trị này.
      </p>

      <h2>4. Bản đồ và dịch vụ bên thứ ba</h2>
      <p>
        Hiển thị bản đồ có thể sử dụng Mapbox hoặc dịch vụ tương tự theo cấu hình dự án. Các nhà cung
        cấp này có thể nhận các yêu cầu mạng tiêu chuẩn (địa chỉ IP, thông tin kỹ thuật của yêu cầu
        tải ô bản đồ). Vui lòng đọc chính sách riêng của Mapbox tại{' '}
        <a href="https://www.mapbox.com/legal/privacy" target="_blank" rel="noopener noreferrer">
          mapbox.com/legal/privacy
        </a>
        .
      </p>

      <h2>5. Mục đích sử dụng</h2>
      <ul>
        <li>Cung cấp và cải thiện chức năng giám sát, bản đồ và báo cáo.</li>
        <li>Xác thực tài khoản, kiểm duyệt nội dung và ngăn lạm dụng.</li>
        <li>Bảo trì hệ thống, phân tích lỗi và tăng độ tin cậy dịch vụ.</li>
      </ul>

      <h2>6. Chia sẻ thông tin</h2>
      <p>
        Chúng tôi không bán dữ liệu cá nhân. Thông tin có thể được chia sẻ trong phạm vi tối thiểu với
        nhà cung cấp hạ tầng (máy chủ, lưu trữ) hoặc khi luật pháp yêu cầu. Nội dung báo cáo đã được
        phê duyệt có thể hiển thị công khai trên bản đồ và danh sách theo thiết kế ứng dụng.
      </p>

      <h2>7. Bảo mật</h2>
      <p>
        Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp với quy mô dự án (mã hóa kênh
        truyền HTTPS, kiểm soát truy cập máy chủ, v.v.). Không phương thức truyền tải hoặc lưu trữ nào
        đảm bảo tuyệt đối an toàn; vui lòng bảo vệ mật khẩu và thiết bị của bạn.
      </p>

      <h2>8. Quyền của người dùng</h2>
      <p>
        Tùy quy định pháp luật hiện hành, bạn có thể yêu cầu truy cập, chỉnh sửa hoặc xóa một số thông
        tin hồ sơ thông qua chức năng tài khoản, hoặc liên hệ đơn vị vận hành qua kênh{' '}
        <Link to="/contact">Liên hệ</Link> để được hướng dẫn.
      </p>

      <h2>9. Thay đổi chính sách</h2>
      <p>
        Chúng tôi có thể cập nhật văn bản này khi có thay đổi về tính năng hoặc pháp lý. Phiên bản mới
        sẽ được đăng kèm ngày hiệu lực trên trang này. Tiếp tục sử dụng dịch vụ sau khi cập nhật đồng
        nghĩa bạn đã nắm các điều chỉnh quan trọng.
      </p>

      <p className="info-muted">
        Hiệu lực: tháng 3/2026. Thắc mắc về bảo mật: <a href="mailto:dhcn@iuh.edu.vn">dhcn@iuh.edu.vn</a>
      </p>
    </div>
  );
};

export default PrivacyPage;
