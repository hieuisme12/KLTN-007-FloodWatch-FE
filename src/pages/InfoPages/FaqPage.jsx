import React from 'react';
import { Link } from 'react-router-dom';
const FAQ_ITEMS = [
  {
    q: 'FLOODSIGHT dùng để làm gì?',
    a: (
      <>
        <p>
          FLOODSIGHT giúp bạn theo dõi thông tin liên quan đến ngập lụt trên khu vực Thành phố Hồ Chí
          Minh: vị trí cảm biến, mức nước và cảnh báo trên bản đồ, đồng thời xem báo cáo từ cộng đồng
          sau khi được kiểm duyệt và các tin thời tiết tham khảo trên trang chủ.
        </p>
      </>
    )
  },
  {
    q: 'Tôi có bắt buộc phải đăng ký tài khoản không?',
    a: (
      <>
        <p>
          Bạn có thể xem nhiều nội dung công khai như trang chủ, bản đồ và danh sách báo cáo mà không
          cần đăng nhập. Để <strong>gửi báo cáo ngập mới</strong> hoặc quản lý hồ sơ cá nhân, bạn cần
          tạo tài khoản và đăng nhập.
        </p>
      </>
    )
  },
  {
    q: 'Tại sao báo cáo của tôi ở trạng thái “chờ duyệt”?',
    a: (
      <>
        <p>
          Hệ thống áp dụng <strong>kiểm duyệt</strong> nhằm giảm thông tin sai lệch, trùng lặp hoặc
          không phù hợp trước khi hiển thị công khai trên bản đồ. Thời gian xử lý phụ thuộc khối lượng
          báo cáo và lịch làm việc của điều phối viên.
        </p>
      </>
    )
  },
  {
    q: 'Màu / trạng thái cảnh báo trên bản đồ có nghĩa là gì?',
    a: (
      <>
        <p>
          Điểm đo thường được gắn với <strong>ngưỡng cảnh báo</strong> và <strong>nguy hiểm</strong> do
          hệ thống cấu hình (theo mức nước đo được). Khi mực nước vượt ngưỡng, trạng thái hiển thị sẽ
          phản ánh mức độ cần chú ý — chi tiết có thể xem tại ô thông tin từng điểm khi bạn chọn trên
          bản đồ.
        </p>
        <p>
          Đây là công cụ hỗ trợ; luôn kết hợp với thông tin từ cơ quan nhà nước khi ra quyết định an
          toàn.
        </p>
      </>
    )
  },
  {
    q: 'Bản đồ không hiển thị hoặc báo lỗi token Mapbox?',
    a: (
      <>
        <p>
          Phần bản đồ cần <strong>VITE_MAPBOX_TOKEN</strong> hợp lệ trong file <code>.env</code> khi
          build/chạy ứng dụng. Nếu thiếu token hoặc token hết hạn/bị thu hồi, giao diện bản đồ sẽ không
          tải được. Hãy tạo token công khai (public) tại tài khoản Mapbox và cập nhật theo hướng dẫn
          trong <code>.env.example</code>, sau đó khởi động lại máy chủ phát triển.
        </p>
      </>
    )
  },
  {
    q: 'Dữ liệu trên web có thay thế cảnh báo chính thức không?',
    a: (
      <>
        <p>
          <strong>Không.</strong> FLOODSIGHT cung cấp thông tin tham khảo, có thể có độ trễ hoặc sai
          số kỹ thuật. Trong tình huống mưa lớn, triều cường hoặc khẩn cấp, hãy làm theo hướng dẫn của
          chính quyền địa phương, cơ quan phòng chống thiên tai và các kênh truyền thông chính thống.
        </p>
      </>
    )
  },
  {
    q: 'Ai có quyền vào trang “Kiểm duyệt”?',
    a: (
      <>
        <p>
          Chỉ tài khoản được cấp vai trò <strong>điều phối viên (moderator)</strong> mới truy cập được
          luồng kiểm duyệt báo cáo. Tài khoản quản trị viên (admin) có thể có quyền khác theo cấu hình
          hệ thống — nếu bạn cần quyền này cho công việc chính thức, hãy liên hệ đơn vị vận hành.
        </p>
      </>
    )
  },
  {
    q: 'Làm sao để đổi mật khẩu hoặc cập nhật hồ sơ?',
    a: (
      <>
        <p>
          Sau khi đăng nhập, vào mục <strong>Tài khoản / Hồ sơ</strong> trên giao diện để chỉnh sửa
          thông tin và thực hiện đổi mật khẩu theo các trường có sẵn. Nếu gặp lỗi kỹ thuật, vui lòng
          liên hệ qua trang <Link to="/contact">Liên hệ</Link>.
        </p>
      </>
    )
  }
];

const FaqPage = () => {
  return (
    <div className="info-page">
      <h1>Câu hỏi thường gặp (FAQ)</h1>
      <p className="info-lead">
        Tổng hợp các thắc mắc phổ biến khi sử dụng FLOODSIGHT. Nếu chưa thấy câu trả lời phù hợp, bạn
        có thể gửi yêu cầu qua trang <Link to="/contact">Liên hệ</Link>.
      </p>

      <div className="faq-list">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="faq-item">
            <summary>{item.q}</summary>
            <div className="faq-answer">{item.a}</div>
          </details>
        ))}
      </div>

      <p className="info-muted">
        Nội dung FAQ có thể được cập nhật theo từng phiên bản hệ thống. Cập nhật gần nhất: tháng 3/2026.
      </p>
    </div>
  );
};

export default FaqPage;
