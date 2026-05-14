import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearGuestExploreMode } from '../utils/guestSession';
import { GuestExploreContext } from './guestExploreContext';

function GuestModalPortal({ open, title, description, primaryLabel, onPrimary, secondaryLabel, onSecondary }) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
      role="presentation"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.88)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onSecondary();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-modal-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)]"
        onMouseDown={(e) => e.stopPropagation()}
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null);

  const closeDialog = useCallback(() => setDialog(null), []);

  const openWelcome = useCallback(() => {
    setDialog({ kind: 'welcome' });
  }, []);

  const openRequireLogin = useCallback(
    (payload) => {
      const defaultMsg = t('guest.requireDefault');
      if (payload && typeof payload === 'object' && typeof payload.featureLabel === 'string') {
        setDialog({
          kind: 'requireLogin',
          featureLabel: payload.featureLabel.trim() || t('guest.defaultFeature'),
        });
        return;
      }
      const msg = typeof payload === 'string' && payload.trim() ? payload : defaultMsg;
      setDialog({ kind: 'requireLogin', message: msg });
    },
    [t]
  );

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
        title={t('guest.welcomeTitle')}
        description={t('guest.welcomeDesc')}
        primaryLabel={t('guest.login')}
        onPrimary={goLogin}
        secondaryLabel={t('guest.welcomeContinue')}
        onSecondary={closeDialog}
      />
      <GuestModalPortal
        open={open && isRequire}
        title={t('guest.requireTitle')}
        description={
          dialog?.featureLabel
            ? t('guest.requireFeatureBody', { label: dialog.featureLabel })
            : dialog?.message || ''
        }
        primaryLabel={t('guest.login')}
        onPrimary={goLogin}
        secondaryLabel={t('guest.close')}
        onSecondary={closeDialog}
      />
    </GuestExploreContext.Provider>
  );
}
