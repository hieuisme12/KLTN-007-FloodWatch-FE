import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { clearGuestExploreMode } from '../utils/guestSession';
import { GuestExploreContext } from './guestExploreContext';

function GuestModalPortal({ open, title, description, primaryLabel, onPrimary, secondaryLabel, onSecondary }) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Đóng hộp thoại"
        onClick={onSecondary}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-modal-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="guest-modal-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <div className="mt-3 text-sm leading-relaxed text-slate-600">{description}</div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={onSecondary}
          >
            {secondaryLabel}
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#1976d2] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1565c0]"
            onClick={onPrimary}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function GuestExploreProvider({ children }) {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null);

  const closeDialog = useCallback(() => setDialog(null), []);

  const openWelcome = useCallback(() => {
    setDialog({ kind: 'welcome' });
  }, []);

  const openRequireLogin = useCallback((payload) => {
    const defaultMsg =
      'Bạn cần đăng nhập để dùng tính năng này. Đăng nhập để gửi báo cáo, quản lý tài khoản và nhận cảnh báo khẩn.';
    if (payload && typeof payload === 'object' && typeof payload.featureLabel === 'string') {
      setDialog({ kind: 'requireLogin', featureLabel: payload.featureLabel.trim() || 'Tính năng này' });
      return;
    }
    const msg = typeof payload === 'string' && payload.trim() ? payload : defaultMsg;
    setDialog({ kind: 'requireLogin', message: msg });
  }, []);

  const goLogin = useCallback(() => {
    clearGuestExploreMode();
    closeDialog();
    navigate('/login');
  }, [navigate, closeDialog]);

  const value = useMemo(
    () => ({
      openWelcome,
      openRequireLogin,
      closeDialog,
      goLogin,
    }),
    [openWelcome, openRequireLogin, closeDialog, goLogin]
  );

  const open = dialog != null;
  const isWelcome = dialog?.kind === 'welcome';
  const isRequire = dialog?.kind === 'requireLogin';

  return (
    <GuestExploreContext.Provider value={value}>
      {children}
      <GuestModalPortal
        open={open && isWelcome}
        title="Đang xem với tư cách khách"
        description="Giao diện hiển thị đầy đủ các mục như khi đã đăng nhập. Các thao tác như tạo báo cáo mới, hồ sơ cá nhân, cảnh báo khẩn hoặc tin tức chi tiết chỉ thực hiện được sau khi đăng nhập — hệ thống sẽ nhắc và có thể chuyển bạn tới trang đăng nhập."
        primaryLabel="Đăng nhập"
        onPrimary={goLogin}
        secondaryLabel="Đã hiểu, tiếp tục xem"
        onSecondary={closeDialog}
      />
      <GuestModalPortal
        open={open && isRequire}
        title="Cần đăng nhập"
        description={
          dialog?.featureLabel ? (
            <>
              Tính năng{' '}
              <strong className="font-bold text-slate-900">{dialog.featureLabel}</strong> cần đăng nhập (và đúng
              quyền tài khoản nếu có). Bạn có thể đăng nhập để tiếp tục.
            </>
          ) : (
            dialog?.message || ''
          )
        }
        primaryLabel="Đăng nhập"
        onPrimary={goLogin}
        secondaryLabel="Đóng"
        onSecondary={closeDialog}
      />
    </GuestExploreContext.Provider>
  );
}
