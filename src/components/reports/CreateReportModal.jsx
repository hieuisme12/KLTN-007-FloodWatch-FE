import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaXmark } from 'react-icons/fa6';
import { Modal } from '../common/Modal';
import { NewReportForm } from '../../pages/user/NewReportPage';

export default function CreateReportModal({ open, onClose, onSuccess, formKey = 0 }) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      className="create-report-modal !max-w-none overflow-hidden !p-0"
    >
      <div className="create-report-modal-header">
        <div>
          <h2 className="create-report-modal-title">{t('newReport.pageTitle')}</h2>
          <p className="create-report-modal-subtitle">{t('newReport.pageSubtitle')}</p>
        </div>
        <button
          type="button"
          className="create-report-modal-close"
          onClick={onClose}
          aria-label={t('newReport.cancelBtn')}
        >
          <FaXmark className="create-report-modal-close__icon" aria-hidden />
        </button>
      </div>

      <div className="create-report-modal-body">
        <NewReportForm
          key={formKey}
          onCancel={onClose}
          onSuccess={() => {
            onSuccess?.();
            onClose();
          }}
        />
      </div>
    </Modal>
  );
}
