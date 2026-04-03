import React, { useEffect, useState } from 'react';
import { fetchForecastForSensor } from '../../services/api';
import { formatForecastConfidence } from '../../utils/scoringDisplay';
import { FaTriangleExclamation } from 'react-icons/fa6';
export default function SensorForecastSection({ sensorId }) {
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
          setError(res.error || 'Không tải được dự báo');
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [sensorId]);

  if (!sensorId) return null;

  return (
    <div className="sensor-forecast-section">
      <h4 className="sensor-forecast-heading">Dự báo ngắn hạn</h4>
      {loading && <p className="sensor-forecast-muted">Đang tải dự báo…</p>}
      {error && <p className="sensor-forecast-error">{error}</p>}
      {!loading && data && (
        <>
          {(data.confidence === 'low' || data.confidence === 'none') && (
            <div className="sensor-forecast-warn">
              <FaTriangleExclamation /> Độ tin dự báo {formatForecastConfidence(data.confidence)} — kết quả chỉ mang tính tham khảo.
            </div>
          )}
          <div className="sensor-forecast-grid">
            {data.current_water_level_cm != null && (
              <div className="sensor-forecast-cell">
                <span className="sensor-forecast-label">Hiện tại</span>
                <span className="sensor-forecast-val">{Number(data.current_water_level_cm).toFixed(1)} cm</span>
              </div>
            )}
            {data.predicted_water_level_cm != null && (
              <div className="sensor-forecast-cell">
                <span className="sensor-forecast-label">Dự kiến (trong cửa sổ)</span>
                <span className="sensor-forecast-val">{Number(data.predicted_water_level_cm).toFixed(1)} cm</span>
              </div>
            )}
            {data.velocity_cm_per_hour != null && (
              <div className="sensor-forecast-cell">
                <span className="sensor-forecast-label">Xu hướng</span>
                <span className="sensor-forecast-val">{Number(data.velocity_cm_per_hour).toFixed(2)} cm/giờ</span>
              </div>
            )}
            <div className="sensor-forecast-cell">
              <span className="sensor-forecast-label">Độ tin mô hình</span>
              <span className="sensor-forecast-val">{formatForecastConfidence(data.confidence)}</span>
            </div>
          </div>
          {(data.may_exceed_warning_within_horizon || data.may_exceed_danger_within_horizon) && (
            <ul className="sensor-forecast-alerts">
              {data.may_exceed_warning_within_horizon && (
                <li>
                  Có thể vượt <strong>ngưỡng cảnh báo</strong> ({data.warning_threshold_cm ?? '—'} cm) trong khoảng thời gian xem xét.
                  {data.estimated_minutes_to_warning != null && (
                    <> Ước tính ~<strong>{Math.round(data.estimated_minutes_to_warning)}</strong> phút.</>
                  )}
                </li>
              )}
              {data.may_exceed_danger_within_horizon && (
                <li>
                  Có thể vượt <strong>ngưỡng nguy hiểm</strong> ({data.danger_threshold_cm ?? '—'} cm).
                  {data.estimated_minutes_to_danger != null && (
                    <> Ước tính ~<strong>{Math.round(data.estimated_minutes_to_danger)}</strong> phút.</>
                  )}
                </li>
              )}
            </ul>
          )}
          {data.method && (
            <p className="sensor-forecast-meta">
              Phương pháp: {data.method}
              {data.sample_count != null && ` · ${data.sample_count} mẫu`}
              {data.span_minutes != null && ` · ${data.span_minutes} phút quan sát`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
