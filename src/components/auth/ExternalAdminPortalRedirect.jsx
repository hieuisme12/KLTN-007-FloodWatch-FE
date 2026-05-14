import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FLOODSIGHT_ADMIN_PORTAL_URL } from '@/config/adminPortal';

/** Chuyển hẳn sang cổng quản trị / điều hành (FE riêng) — khôi phục hành vi cũ của các đường dẫn staff. */
export default function ExternalAdminPortalRedirect() {
  const { t } = useTranslation();
  useEffect(() => {
    window.location.replace(FLOODSIGHT_ADMIN_PORTAL_URL);
  }, []);
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-8 text-center text-slate-600">
      <p className="text-sm font-medium text-slate-800">{t('externalAdmin.title')}</p>
      <p className="max-w-md text-xs">{t('externalAdmin.hint')}</p>
    </div>
  );
}
