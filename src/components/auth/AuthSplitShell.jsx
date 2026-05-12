function AuthPanelSkyline() {
  return (
    <svg
      className="login-panel-skyline"
      viewBox="0 0 480 72"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="auth-sky-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8e4f2" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#eef3f9" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path
        fill="url(#auth-sky-fade)"
        d="M0,72 L0,52 L12,52 L12,38 L22,38 L22,48 L36,48 L36,32 L48,32 L48,44 L62,44 L62,28 L78,28 L78,50 L92,50 L92,36 L104,36 L104,46 L118,46 L118,30 L132,30 L132,48 L148,48 L148,34 L162,34 L162,52 L176,52 L176,40 L190,40 L190,28 L204,28 L204,44 L220,44 L220,32 L236,32 L236,50 L252,50 L252,36 L268,36 L268,46 L284,46 L284,30 L300,30 L300,48 L316,48 L316,38 L332,38 L332,52 L348,52 L348,42 L364,42 L364,28 L380,28 L380,46 L396,46 L396,34 L412,34 L412,50 L428,50 L428,40 L444,40 L444,32 L460,32 L460,54 L480,54 L480,72 Z"
      />
      <path
        fill="#c5d6ea"
        opacity="0.55"
        d="M388,54 L388,44 L394,44 L394,38 L400,38 L400,44 L406,44 L406,36 L412,36 L412,54 Z"
      />
      <circle cx="118" cy="22" r="3" fill="#b8cce0" />
      <circle cx="290" cy="18" r="2.5" fill="#b8cce0" />
      <path
        fill="none"
        stroke="#b8cce0"
        strokeWidth="1.2"
        d="M340,26 Q352,14 364,26"
        opacity="0.7"
      />
    </svg>
  );
}

/**
 * Khung tách đôi (hero + form) dùng chung đăng nhập / đăng ký.
 */
export default function AuthSplitShell({ children, panelInnerClassName = '' }) {
  return (
    <div className="login-split">
      <aside className="login-hero">
        <div className="login-hero-overlay" aria-hidden />
        <div className="login-hero-inner">
          <h1 className="login-hero-title login-hero-title--with-logo">
            <span className="login-hero-logo-ring" aria-hidden>
              <img src="/iuh.png" alt="" className="login-hero-brand-logo" />
            </span>
            <span className="login-hero-title-line1">HỆ THỐNG CẢNH BÁO NGẬP LỤT FLOODSIGHT</span>
            <span className="login-hero-title-line2">THÀNH PHỐ HỒ CHÍ MINH</span>
          </h1>
        </div>
      </aside>

      <main className="login-panel">
        <div className={`login-panel-inner ${panelInnerClassName}`.trim()}>
          {children}
        </div>
        <AuthPanelSkyline />
      </main>
    </div>
  );
}
