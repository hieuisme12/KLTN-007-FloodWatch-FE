import React from 'react';
import { Link } from 'react-router-dom';
const TermsPage = () => {
  return (
    <div className="info-page">
      <h1>Điều khoản sử dụng</h1>
      <p className="info-lead">
        Vui lòng đọc kỹ các điều khoản dưới đây trước khi sử dụng FLOODSIGHT Thành phố Hồ Chí Minh.
        Bằng việc truy cập hoặc sử dụng dịch vụ, bạn xác nhận đã hiểu và đồng ý bị ràng buộc bởi các
        điều khoản này.
      </p>

      <h2>1. Mô tả dịch vụ</h2>
      <p>
        FLOODSIGHT cung cấp giao diện web để xem bản đồ, dữ liệu liên quan đến ngập lụt, báo cáo cộng
        đồng (sau kiểm duyệt), tin tức tham khảo và các chức năng tài khoản theo từng vai trò. Dịch vụ
        có thể thay đổi, tạm ngưng hoặc giới hạn tính năng để bảo trì hoặc nâng cấp mà không cần báo
        trước trong từng trường hợp khẩn cấp.
      </p>

      <h2>2. Điều kiện sử dụng</h2>
      <ul>
        <li>Bạn cam kết cung cấp thông tin chính xác ở mức hợp lý khi đăng ký và khi gửi báo cáo.</li>
        <li>
          Bạn không được cố ý gây hại cho hệ thống, can thiệp trái phép, thu thập dữ liệu tự động trái
          phép hoặc sử dụng dịch vụ cho mục đích vi phạm pháp luật.
        </li>
        <li>
          Mật khẩu và phiên đăng nhập thuộc trách nhiệm của bạn; hãy thông báo cho đơn vị vận hành nếu
          nghi ngờ tài khoản bị lộ.
        </li>
      </ul>

      <h2>3. Nội dung do người dùng gửi</h2>
      <p>
        Khi gửi báo cáo, hình ảnh hoặc mô tả, bạn tuyên bố có quyền cấp phép hiển thị nội dung đó
        trong phạm vi vận hành ứng dụng (bao gồm hiển thị công khai sau khi được kiểm duyệt). Bạn không
        được đăng nội dung xúc phạm, sai sự thật có chủ ý gây hoang mang, quảng cáo trái phép, vi phạm
        bản quyền hoặc trái với pháp luật Việt Nam.
      </p>

      <h2>4. Kiểm duyệt và gỡ bỏ nội dung</h2>
      <p>
        Hệ thống áp dụng quy trình kiểm duyệt đối với báo cáo cộng đồng. Điều phối viên có thể từ chối
        hoặc gỡ bỏ nội dung không đạt tiêu chí mà không cần giải thích chi tiết trong từng trường hợp.
        Quyết định cuối cùng thuộc đơn vị vận hành, phù hợp với mục tiêu an toàn thông tin và chất lượng
        dữ liệu hiển thị.
      </p>

      <h2>5. Miễn trừ trách nhiệm</h2>
      <ul>
        <li>
          <strong>Dữ liệu tham khảo:</strong> thông tin mực nước, cảnh báo, bản đồ và báo cáo hiển thị
          trên nền tảng không thay thế cảnh báo, chỉ đạo hoặc hướng dẫn từ cơ quan có thẩm quyền.
        </li>
        <li>
          <strong>Độ chính xác và độ trễ:</strong> dữ liệu phụ thuộc thiết bị đo, kết nối mạng và xử lý
          phía máy chủ; có thể có sai lệch hoặc chậm trễ so với thực tế tại hiện trường.
        </li>
        <li>
          <strong>Thiệt hại gián tiếp:</strong> trong giới hạn pháp luật cho phép, đơn vị phát triển
          không chịu trách nhiệm đối với thiệt hại gián tiếp phát sinh từ việc sử dụng hoặc không thể
          sử dụng dịch vụ.
        </li>
      </ul>

      <h2>6. Sở hữu trí tuệ</h2>
      <p>
        Giao diện, mã nguồn phía client (theo giấy phép dự án), logo và tài liệu thuộc quyền của nhóm
        phát triển và/hoặc IUH trừ khi có thỏa thuận khác. Không sao chép hoặc tái sử dụng thương mại
        trái phép.
      </p>

      <h2>7. Chấm dứt truy cập</h2>
      <p>
        Chúng tôi có thể tạm khóa hoặc chấm dứt quyền sử dụng tài khoản nếu phát hiện vi phạm điều
        khoản, hành vi lạm dụng hoặc yêu cầu từ cơ quan chức năng.
      </p>

      <h2>8. Luật áp dụng</h2>
      <p>
        Các tranh chấp phát sinh (nếu có) được ưu tiên giải quyết trên cơ sở pháp luật Việt Nam và thẩm
        quyền của tòa án có thẩm quyền tại Việt Nam, trừ khi quy định bắt buộc khác.
      </p>

      <h2>9. Liên hệ</h2>
      <p>
        Mọi câu hỏi về điều khoản sử dụng có thể gửi qua trang{' '}
        <Link to="/contact">Liên hệ</Link> hoặc email{' '}
        <a href="mailto:dhcn@iuh.edu.vn">dhcn@iuh.edu.vn</a>.
      </p>

      <p className="info-muted">
        Hiệu lực: tháng 3/2026. Chúng tôi có thể sửa đổi điều khoản; phiên bản mới sẽ được công bố trên
        trang này.
      </p>
    </div>
  );
};

export default TermsPage;
