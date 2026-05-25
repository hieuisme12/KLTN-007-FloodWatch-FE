import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchForecastForSensor } from '../../services/api';
import { formatForecastConfidence } from '../../utils/scoringDisplay';
import { FaTriangleExclamation } from 'react-icons/fa6';

const FORECAST_METHOD_LABELS = {
  linear_trend: 'Xu hướng tuyến tính',
  linear_regression: 'Hồi quy tuyến tính',
  moving_average: 'Trung bình trượt',
  exponential_smoothing: 'San mũ',
  last_value: 'Giá trị cuối',
  none: 'Không xác định'
};

export default function SensorForecastSection({ sensorId }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sensorId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      fetchForecastForSensor(sensorId, { horizon: 60, sample_minutes: 90 }).then((res) => {
        if (cancelled) return;
        setLoading(false);
        if (res.success && res.data) {
          setData(res.data);
          setError(null);
        } else {
          setData(null);
          setError(res.error || t('reportUi.sensorForecast.errorFallback'));
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [sensorId, t]);

  if (!sensorId) return null;

  const confText = data?.confidence != null ? formatForecastConfidence(data.confidence, t) : '';

  return (
    <div className="sensor-forecast-section">
      <h4 className="sensor-forecast-heading">{t('reportUi.sensorForecast.title')}</h4>
      {loading && <p className="sensor-forecast-muted">{t('reportUi.sensorForecast.loading')}</p>}
      {error && <p className="sensor-forecast-error">{error}</p>}
      {!loading && data && (
        <>
          {(data.confidence === 'low' || data.confidence === 'none') && (
            <div className="sensor-forecast-warn">
              <FaTriangleExclamation /> {t('reportUi.sensorForecast.warnLine', { conf: confText })}
            </div>
          )}
          <div className="sensor-forecast-grid">
            {data.current_water_level_cm != null && (
              <div className="sensor-forecast-cell">
                <span className="sensor-forecast-label">{t('reportUi.sensorForecast.current')}</span>
                <span className="sensor-forecast-val">{Number(data.current_water_level_cm).toFixed(1)} cm</span>
              </div>
            )}
            {data.predicted_water_level_cm != null && (
              <div className="sensor-forecast-cell">
                <span className="sensor-forecast-label">{t('reportUi.sensorForecast.predicted')}</span>
                <span className="sensor-forecast-val">{Number(data.predicted_water_level_cm).toFixed(1)} cm</span>
              </div>
            )}
            {data.velocity_cm_per_hour != null && (
              <div className="sensor-forecast-cell">
                <span className="sensor-forecast-label">{t('reportUi.sensorForecast.trend')}</span>
                <span className="sensor-forecast-val">
                  {Number(data.velocity_cm_per_hour).toFixed(2)} {t('reportUi.sensorForecast.velocityUnit')}
                </span>
              </div>
            )}
            <div className="sensor-forecast-cell">
              <span className="sensor-forecast-label">{t('reportUi.sensorForecast.modelConfidence')}</span>
              <span className="sensor-forecast-val">{formatForecastConfidence(data.confidence, t)}</span>
            </div>
          </div>
          {(data.may_exceed_warning_within_horizon || data.may_exceed_danger_within_horizon) && (
            <ul className="sensor-forecast-alerts">
              {data.may_exceed_warning_within_horizon && (
                <li>
                  {t('reportUi.sensorForecast.mayExceedWarning', { cm: data.warning_threshold_cm ?? '—' })}
                  {data.estimated_minutes_to_warning != null &&
                    t('reportUi.sensorForecast.mayExceedWarningEta', { min: Math.round(data.estimated_minutes_to_warning) })}
                </li>
              )}
              {data.may_exceed_danger_within_horizon && (
                <li>
                  {t('reportUi.sensorForecast.mayExceedDanger', { cm: data.danger_threshold_cm ?? '—' })}
                  {data.estimated_minutes_to_danger != null &&
                    t('reportUi.sensorForecast.mayExceedDangerEta', { min: Math.round(data.estimated_minutes_to_danger) })}
                </li>
              )}
            </ul>
          )}
          {data.method && (
            <p className="sensor-forecast-meta">
              {t('reportUi.sensorForecast.method', { method: FORECAST_METHOD_LABELS[data.method] || data.method.replace(/_/g, ' ') })}
              {data.sample_count != null && t('reportUi.sensorForecast.samplesSuffix', { n: data.sample_count })}
              {data.span_minutes != null && t('reportUi.sensorForecast.spanSuffix', { n: data.span_minutes })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
