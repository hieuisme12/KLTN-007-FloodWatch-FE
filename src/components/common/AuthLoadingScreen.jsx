import { Mosaic } from 'react-loading-indicators';

/**
 * Loading phiên đăng nhập / bootstrap session.
 * @param {{ overlay?: boolean }} props — overlay: phủ mờ lên form (nhìn xuyên được nền)
 */
export default function AuthLoadingScreen({ overlay = false }) {
  if (overlay) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/[0.22] backdrop-blur-[10px] backdrop-saturate-150">
        <div className="rounded-2xl bg-white/92 px-10 py-9 shadow-[0_12px_40px_rgba(15,23,42,0.18)]">
          <Mosaic color="#318dcc" size="medium" text="Đang tải..." textColor="" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-sky-50/90">
      <div className="rounded-2xl bg-white/85 px-10 py-9 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
        <Mosaic color="#318dcc" size="medium" text="Đang tải..." textColor="" />
      </div>
    </div>
  );
}
