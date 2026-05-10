import { Mosaic } from 'react-loading-indicators';

/**
 * Loading phiên đăng nhập / bootstrap session.
 * @param {{ overlay?: boolean }} props — overlay: full-screen phủ lên form đăng nhập khi đang xử lý
 */
export default function AuthLoadingScreen({ overlay = false }) {
  const style = overlay
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc'
      }
    : {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc'
      };

  return (
    <div style={style}>
      <Mosaic color="#318dcc" size="medium" text="Đang tải..." textColor="" />
    </div>
  );
}
