import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submitFloodReport } from '../../services/api';
import { isAuthenticated } from '../../utils/auth';
import {
  FLOOD_LEVELS,
  isValidFloodLevel,
  normalizeFloodLevel,
  getFloodLevelLabel
} from '../../utils/floodLevels';
import {
  buildReportSubmitSuccessCopy,
  getReportValidationSubline,
  pickDisplayLabel
} from '../../utils/reportDisplayStatus';

export default function ChatReportDraftCard({ draft, onSubmitted }) {
  const { t } = useTranslation();
  const authenticated = isAuthenticated();
  const [selectedLevel, setSelectedLevel] = useState(
    () => normalizeFloodLevel(draft?.level) || ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!draft) return null;

  const handleSubmit = async () => {
    if (!isValidFloodLevel(selectedLevel)) {
      setError(t('newReport.errLevel'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        level: selectedLevel,
        lat: draft.lat,
        lng: draft.lng,
        ...(draft.location_description && {
          location_description: draft.location_description
        })
      };
      if (!authenticated && draft.name) {
        payload.name = draft.name;
      }
      const response = await submitFloodReport(payload);
      if (response.success) {
        setResult(response);
        onSubmitted?.(response);
      } else {
        setError(response.error || t('newReport.errGeneric'));
      }
    } catch (err) {
      setError(err?.message || t('newReport.errNetwork'));
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.success) {
    return (
      <div className="chatbot-draft chatbot-draft--success">
        <p className="chatbot-draft__success-title">
          {t('newReport.successTitle')}
        </p>
        <p>{buildReportSubmitSuccessCopy(result, t)}</p>
        {(pickDisplayLabel(result.data?.display_validation) ||
          getReportValidationSubline(result.data, t)) && (
          <p className="chatbot-draft__validation-sub">
            {pickDisplayLabel(result.data?.display_validation) ||
              getReportValidationSubline(result.data, t)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="chatbot-draft">
      <p className="chatbot-draft__title">{t('chatbot.draftTitle')}</p>
      {draft.location_description ? (
        <p className="chatbot-draft__location">{draft.location_description}</p>
      ) : (
        <p className="chatbot-draft__location chatbot-draft__location--muted">
          {t('chatbot.draftCoords', {
            lat: draft.lat.toFixed(5),
            lng: draft.lng.toFixed(5)
          })}
        </p>
      )}
      <p className="chatbot-draft__level-label">{t('chatbot.draftPickLevel')}</p>
      <div className="chatbot-draft__levels" role="group" aria-label={t('chatbot.draftPickLevel')}>
        {FLOOD_LEVELS.map((level) => {
          const active = selectedLevel === level.value;
          return (
            <button
              key={level.value}
              type="button"
              className={`chatbot-draft__level-btn${active ? ' chatbot-draft__level-btn--active' : ''}`}
              style={{
                borderColor: active ? level.color : undefined,
                background: active ? `${level.color}18` : undefined
              }}
              disabled={submitting}
              onClick={() => setSelectedLevel(level.value)}
            >
              {getFloodLevelLabel(level.value, t)}
            </button>
          );
        })}
      </div>
      {error ? <p className="chatbot-draft__error">{error}</p> : null}
      <button
        type="button"
        className="chatbot-draft__submit"
        disabled={submitting || !isValidFloodLevel(selectedLevel)}
        onClick={handleSubmit}
      >
        {submitting ? t('newReport.sending') : t('chatbot.draftSubmit')}
      </button>
    </div>
  );
}
