import React from 'react';
import { FaEnvelope, FaPhone } from 'react-icons/fa6';
import { MdLocationOn } from 'react-icons/md';
const ContactPage = () => {
  return (
    <div className="info-page">
      <h1>Liên hệ</h1>
      <p className="info-lead">
        FLOODSIGHT Thành phố Hồ Chí Minh được phát triển trong môi trường học thuật và hợp tác với
        Trường Đại học Công nghiệp TP. HCM (IUH). Dưới đây là các kênh liên hệ chính thức cho góp ý sản
        phẩm, hợp tác hoặc hỗ trợ kỹ thuật (trong khả năng của nhóm).
      </p>

      <div className="contact-grid">
        <div className="contact-card">
          <h3>
            <MdLocationOn style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Địa chỉ
          </h3>
          <p>
            Số 12 Nguyễn Văn Bảo, phường Hạnh Thông, Thành phố Hồ Chí Minh
            <br />
            <span style={{ color: '#546e7a', fontSize: '0.88rem' }}>Trường Đại học Công nghiệp TP. HCM (IUH)</span>
          </p>
        </div>

        <div className="contact-card">
          <h3>
            <FaPhone style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Điện thoại
          </h3>
          <p>
            Hotline:{' '}
            <a href="tel:02838940390">0283.8940 390</a>
          </p>
        </div>

        <div className="contact-card">
          <h3>
            <FaEnvelope style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Email
          </h3>
          <p>
            <a href="mailto:dhcn@iuh.edu.vn">dhcn@iuh.edu.vn</a>
          </p>
        </div>

        <div className="contact-card">
          <h3>Mạng xã hội</h3>
          <p>
            Facebook:{' '}
            <a href="https://www.facebook.com/trieuminh1003" target="_blank" rel="noopener noreferrer">
              Kênh liên kết dự án
            </a>
          </p>
        </div>
      </div>

      <h2>Gửi góp ý nhanh</h2>
      <p>
        Để tiện theo dõi, bạn có thể gửi email với tiêu đề rõ ràng, ví dụ:{' '}
        <em>[FLOODSIGHT] Góp ý giao diện</em>, <em>[FLOODSIGHT] Lỗi đăng nhập</em>, hoặc{' '}
        <em>[FLOODSIGHT] Hợp tác dữ liệu</em>. Nội dung nên mô tả bước tái hiện lỗi (nếu có), trình
        duyện và thời điểm xảy ra để nhóm xử lý hiệu quả hơn.
      </p>

      <h2>Thời gian phản hồi</h2>
      <p>
        Đây là dự án nghiên cứu/triển khai có giới hạn nguồn lực; thời gian phản hồi email có thể từ
        vài ngày đến vài tuần tùy giai đoạn học kỳ và ưu tiên bảo trì hệ thống. Các sự cố nghiêm trọng
        ảnh hưởng an toàn thông tin sẽ được ưu tiên xem xét.
      </p>

      <p className="info-muted">
        Đối với tình huống khẩn cấp về ngập lụt, an toàn tính mạng và tài sản, vui lòng gọi các đường
        dây nóng của cơ quan chức năng và tuân thủ hướng dẫn sơ tán tại địa phương — không sử dụng
        email dự án làm kênh báo động khẩn cấp.
      </p>
    </div>
  );
};

export default ContactPage;
