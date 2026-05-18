import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaMobileScreen, FaXmark } from 'react-icons/fa6';
import { WiFlood } from 'react-icons/wi';
import { MdLocationOn } from 'react-icons/md';
import { Modal } from '../common/Modal';
import { PrimaryButton } from '../common/Button';
import ConfidenceBadge from '../common/ConfidenceBadge';
import ReportEvaluationWidget from './ReportEvaluationWidget';
import { getReportContent, getReportPhotoUrls } from '../../utils/reportHelpers';
import {
  fetchAddressFromCoords,
  formatAddressForUiDisplay
} from '../../utils/geocode';

function formatReportDate(value, locale) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN');
}

function looksLikeCoordsOnly(text) {
  if (!text || typeof text !== 'string') return false;
  return /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(text.trim());
}

function ModerationBlock({ report, t, locale }) {
  const { moderation_status, moderated_by_name, moderated_at, rejection_reason } =
    report ?? {};

  if (moderation_status === 'pending') {
    return (
      <p className="report-detail-moderation-status report-detail-moderation-status--pending">
        {t('reportUi.moderation.pending')}
      </p>
    );
  }

  if (moderation_status === 'approved') {
    return (
      <div className="report-detail-moderation-body">
        <p className="report-detail-moderation-status report-detail-moderation-status--approved">
          {t('reportUi.moderation.approved')}
        </p>
        {moderated_by_name ? (
          <p className="report-detail-moderation-meta">
            {t('reportsPage.detailModerator')}: <strong>{moderated_by_name}</strong>
          </p>
        ) : (
          <p className="report-detail-moderation-meta report-detail-moderation-meta--muted">
            {t('reportsPage.detailApprovedNoName')}
          </p>
        )}
        {moderated_at ? (
          <p className="report-detail-moderation-meta">
            {t('reportsPage.detailModeratedAt')}: {formatReportDate(moderated_at, locale)}
          </p>
        ) : null}
      </div>
    );
  }

  if (moderation_status === 'rejected') {
    return (
      <div className="report-detail-moderation-body">
        <p className="report-detail-moderation-status report-detail-moderation-status--rejected">
          {t('reportUi.moderation.rejected')}
        </p>
        {moderated_by_name ? (
          <p className="report-detail-moderation-meta">
            {t('reportsPage.detailHandler')}: <strong>{moderated_by_name}</strong>
          </p>
        ) : null}
        {rejection_reason ? (
          <p className="report-detail-moderation-meta">
            {t('reportsPage.detailRejectionReason')}: {rejection_reason}
          </p>
        ) : null}
        {moderated_at ? (
          <p className="report-detail-moderation-meta">
            {t('reportsPage.detailModeratedAt')}: {formatReportDate(moderated_at, locale)}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <p className="report-detail-moderation-meta report-detail-moderation-meta--muted">
      {t('reportUi.moderation.unknown')}
    </p>
  );
}

function ReportPhoto({ url, alt }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="report-detail-photo report-detail-photo--error" title={url}>
        ?
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className="report-detail-photo"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export default function ReportDetailModal({
  open,
  report,
  onClose,
  locationText = '',
  reporterReliability = null
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [addressLine, setAddressLine] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);

  useEffect(() => {
    if (!open || !report) {
      setAddressLine('');
      setAddressLoading(false);
      return undefined;
    }

    const desc = report.location_description?.trim();
    if (desc) {
      setAddressLine(formatAddressForUiDisplay(desc) || desc);
      setAddressLoading(false);
      return undefined;
    }

    const lat = Number(report.lat);
    const lng = Number(report.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setAddressLine(locationText && !looksLikeCoordsOnly(locationText) ? locationText : '—');
      setAddressLoading(false);
      return undefined;
    }

    if (locationText && !looksLikeCoordsOnly(locationText)) {
      setAddressLine(locationText);
    } else {
      setAddressLine(t('reportUi.addressLoading'));
    }
    setAddressLoading(true);

    let cancelled = false;
    fetchAddressFromCoords(lat, lng, { skipBackend: true }).then((addr) => {
      if (cancelled) return;
      const formatted = addr ? formatAddressForUiDisplay(addr) || addr : null;
      setAddressLine(
        formatted ||
          t('reportUi.coordLabel', { lat: lat.toFixed(6), lng: lng.toFixed(6) })
      );
    }).catch(() => {
      if (!cancelled) {
        setAddressLine(
          t('reportUi.coordLabel', { lat: lat.toFixed(6), lng: lng.toFixed(6) })
        );
      }
    }).finally(() => {
      if (!cancelled) setAddressLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, report, locationText, t]);

  if (!report) {
    return (
      <Modal open={open} onClose={onClose} size="lg" className="report-detail-modal">
        <div />
      </Modal>
    );
  }

  const content = getReportContent(report);
  const photos = getReportPhotoUrls(report);
  const floodLevelDesc = t(`reportUi.floodDepth.${report.flood_level}`, {
    defaultValue: report.flood_level || '—'
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      className="report-detail-modal report-detail-modal--shell !p-0 overflow-hidden"
    >
      <div className="report-detail-modal-inner">
      <div className="report-detail-modal-header">
        <div>
          <h2 className="report-detail-modal-title">{t('reportsPage.detailTitle')}</h2>
          {report.id != null ? (
            <p className="report-detail-id">
              {t('reportsPage.detailReportId')}: #{report.id}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="create-report-modal-close"
          onClick={onClose}
          aria-label={t('reportsPage.detailCloseAria')}
        >
          <FaXmark className="create-report-modal-close__icon" aria-hidden />
        </button>
      </div>

      <div className="report-detail-modal-body">
        <div className="report-detail-layout">
          <div className="report-detail-badge-row">
            <span className="report-detail-type-badge">
              <FaMobileScreen aria-hidden /> {t('reportUi.crowdReport')}
            </span>
            {report.verified_by_sensor ? (
              <span className="report-detail-sensor-badge">
                <FaCheck aria-hidden /> {t('reportUi.sensorVerified')}
              </span>
            ) : null}
          </div>

          <div className="report-detail-grid">
            <div className="report-detail-field report-detail-field--full">
              <span className="report-detail-label">
                <MdLocationOn aria-hidden /> {t('reportUi.address')}
              </span>
              <span className="report-detail-value">
                {addressLoading ? t('reportUi.addressLoading') : addressLine || '—'}
              </span>
            </div>

            <div className="report-detail-field">
              <span className="report-detail-label">{t('reportUi.reporter')}</span>
              <span className="report-detail-value">
                {report.reporter_name || t('reportUi.anonymous')}
              </span>
            </div>

            <div className="report-detail-field">
              <span className="report-detail-label">{t('reportUi.reportTime')}</span>
              <span className="report-detail-value">
                {formatReportDate(report.created_at, locale) || '—'}
              </span>
            </div>

            <div className="report-detail-field">
              <span className="report-detail-label">
                <WiFlood aria-hidden /> {t('reportUi.floodLevel')}
              </span>
              <span className="report-detail-value report-detail-value--strong">
                {report.flood_level || '—'}
              </span>
            </div>

            <div className="report-detail-field">
              <span className="report-detail-label">{t('reportUi.levelDescLabel')}</span>
              <span className="report-detail-value">{floodLevelDesc}</span>
            </div>

            {reporterReliability != null ? (
              <div className="report-detail-field">
                <span className="report-detail-label">{t('reportUi.reporterConfidence')}</span>
                <span className="report-detail-value">
                  {typeof reporterReliability === 'number'
                    ? reporterReliability.toFixed(1)
                    : reporterReliability}
                  /100
                </span>
              </div>
            ) : null}

            {report.confidence != null ? (
              <div className="report-detail-field report-detail-field--full">
                <span className="report-detail-label">{t('reportsPage.colConfidence')}</span>
                <ConfidenceBadge
                  confidence={report.confidence}
                  breakdown={report.confidence_breakdown}
                  showBreakdownToggle
                />
              </div>
            ) : null}
          </div>

          {content ? (
            <div className="report-detail-section">
              <h3 className="report-detail-section-title">{t('reportsPage.detailContent')}</h3>
              <p className="report-detail-content-text">{content}</p>
            </div>
          ) : null}

          {photos.length > 0 ? (
            <div className="report-detail-section">
              <h3 className="report-detail-section-title">{t('reportsPage.detailPhotos')}</h3>
              <div className="report-detail-photos">
                {photos.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="report-detail-photo-link"
                  >
                    <ReportPhoto url={url} alt={t('reportsPage.detailPhotos')} />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="report-detail-section report-detail-section--moderation">
            <h3 className="report-detail-section-title">{t('reportsPage.detailModeration')}</h3>
            <ModerationBlock report={report} t={t} locale={locale} />
          </div>

          {report.id ? (
            <ReportEvaluationWidget
              reportId={report.id}
              reporterId={report.reporter_id}
              compact={false}
            />
          ) : null}
        </div>
      </div>

      <div className="report-detail-modal-footer">
        <PrimaryButton type="button" onClick={onClose}>
          {t('reportsPage.detailClose')}
        </PrimaryButton>
      </div>
      </div>
    </Modal>
  );
}

