import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getResearchColdStartHotspots, getResearchEvaluation } from '../services/api';
import { hasRole } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const calcImprovementPct = (baseline, fused) => {
  if (!Number.isFinite(baseline) || baseline === 0 || !Number.isFinite(fused)) return null;
  return ((baseline - fused) / baseline) * 100;
};

const ResearchAnalyticsPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    crowd_hours: 72,
    sensor_hours: 6,
    report_hours: 72,
    no_sensor_radius_m: 1500,
    min_reports: 2
  });
  const [evaluation, setEvaluation] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  const canAccess = hasRole(['admin', 'moderator']);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    const [evalRes, hotspotRes] = await Promise.all([
      getResearchEvaluation({
        crowd_hours: filters.crowd_hours,
        sensor_hours: filters.sensor_hours
      }),
      getResearchColdStartHotspots({
        report_hours: filters.report_hours,
        no_sensor_radius_m: filters.no_sensor_radius_m,
        min_reports: filters.min_reports
      })
    ]);

    if (!evalRes.success || !hotspotRes.success) {
      setError(evalRes.error || hotspotRes.error || 'Không tải được dữ liệu Research');
      setEvaluation(evalRes.data || null);
      setHotspots(hotspotRes.data || []);
      setLoading(false);
      return;
    }

    const sortedHotspots = [...(hotspotRes.data || [])].sort(
      (a, b) => toNumber(b.report_count) - toNumber(a.report_count)
    );
    setEvaluation(evalRes.data || null);
    setHotspots(sortedHotspots);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    if (!canAccess) {
      navigate('/', { replace: true });
      return;
    }
    queueMicrotask(() => loadData());
  }, [canAccess, loadData, navigate]);

  const metrics = useMemo(() => {
    const baseline = evaluation?.baseline_crowd_only || {};
    const fused = evaluation?.fused_model || {};
    return [
      {
        key: 'mae',
        label: 'MAE (cm)',
        baseline: baseline.mae_cm,
        fused: fused.mae_cm,
        improvement: calcImprovementPct(toNumber(baseline.mae_cm, NaN), toNumber(fused.mae_cm, NaN))
      },
      {
        key: 'rmse',
        label: 'RMSE (cm)',
        baseline: baseline.rmse_cm,
        fused: fused.rmse_cm,
        improvement: calcImprovementPct(toNumber(baseline.rmse_cm, NaN), toNumber(fused.rmse_cm, NaN))
      },
      {
        key: 'bias',
        label: 'Bias (cm)',
        baseline: baseline.bias_cm,
        fused: fused.bias_cm,
        improvement: calcImprovementPct(Math.abs(toNumber(baseline.bias_cm, NaN)), Math.abs(toNumber(fused.bias_cm, NaN)))
      }
    ];
  }, [evaluation]);

  const onFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onResetFilters = () => {
    setFilters({
      crowd_hours: 72,
      sensor_hours: 6,
      report_hours: 72,
      no_sensor_radius_m: 1500,
      min_reports: 2
    });
  };

  const hasNoData = !loading && (!evaluation || toNumber(evaluation.sample_count) === 0) && hotspots.length === 0;

  return (
    <div style={{ padding: '16px' }}>
      <h1 style={{ margin: '0 0 12px', fontSize: '28px', fontWeight: 700 }}>Research Analytics</h1>
      <p style={{ margin: '0 0 16px', color: '#666' }}>
        Đánh giá D1 (MAE/RMSE/Bias) và phân tích D2 Cold-start hotspots.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          marginBottom: '14px',
          background: '#fff'
        }}
      >
        <label>
          Crowd hours
          <input type="number" min="1" value={filters.crowd_hours} onChange={(e) => onFilterChange('crowd_hours', Number(e.target.value))} />
        </label>
        <label>
          Sensor hours
          <input type="number" min="1" value={filters.sensor_hours} onChange={(e) => onFilterChange('sensor_hours', Number(e.target.value))} />
        </label>
        <label>
          Report hours
          <input type="number" min="1" value={filters.report_hours} onChange={(e) => onFilterChange('report_hours', Number(e.target.value))} />
        </label>
        <label>
          No-sensor radius (m)
          <input type="number" min="100" value={filters.no_sensor_radius_m} onChange={(e) => onFilterChange('no_sensor_radius_m', Number(e.target.value))} />
        </label>
        <label>
          Min reports
          <input type="number" min="1" value={filters.min_reports} onChange={(e) => onFilterChange('min_reports', Number(e.target.value))} />
        </label>
        <div style={{ display: 'flex', alignItems: 'end', gap: '8px' }}>
          <button type="button" onClick={loadData}>Áp dụng</button>
          <button type="button" onClick={onResetFilters}>Reset</button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '12px', background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '8px' }}>
          {error} <button type="button" onClick={loadData}>Thử lại</button>
        </div>
      )}

      {loading && <div>Đang tải dữ liệu research...</div>}
      {hasNoData && !error && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
          Chưa đủ dữ liệu trong khoảng thời gian đã chọn.
        </div>
      )}

      {!loading && evaluation && (
        <>
          <h2 style={{ margin: '12px 0 8px' }}>D1 - Evaluation</h2>
          <div style={{ marginBottom: '8px', color: '#475569' }}>
            sample_count: <strong>{toNumber(evaluation.sample_count)}</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {metrics.map((m) => {
              const improved = m.improvement != null ? m.improvement > 0 : null;
              return (
                <div key={m.key} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px', background: '#fff' }}>
                  <div style={{ fontWeight: 700 }}>{m.label}</div>
                  <div style={{ marginTop: '6px', fontSize: '14px' }}>Baseline: <strong>{m.baseline ?? '—'}</strong></div>
                  <div style={{ fontSize: '14px' }}>Fused: <strong>{m.fused ?? '—'}</strong></div>
                  <div style={{ marginTop: '8px', color: improved == null ? '#64748b' : improved ? '#166534' : '#b45309' }}>
                    Improvement: {m.improvement == null ? '—' : `${m.improvement.toFixed(2)}%`}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && (
        <>
          <h2 style={{ margin: '16px 0 8px' }}>D2 - Cold-start Hotspots</h2>
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '10px' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Tọa độ</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Reports</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Avg cm</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Max cm</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Nearest sensor (m)</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Latest report</th>
                </tr>
              </thead>
              <tbody>
                {hotspots.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '12px', color: '#64748b' }}>Không có hotspot trong bộ lọc hiện tại.</td></tr>
                ) : hotspots.map((h, idx) => (
                  <tr
                    key={`${h.hotspot_lng}-${h.hotspot_lat}-${idx}`}
                    onClick={() => setSelectedHotspot(h)}
                    style={{ cursor: 'pointer', borderTop: '1px solid #f1f5f9', background: selectedHotspot === h ? '#eff6ff' : '#fff' }}
                  >
                    <td style={{ padding: '10px' }}>{idx + 1}</td>
                    <td style={{ padding: '10px' }}>{toNumber(h.hotspot_lat).toFixed(6)}, {toNumber(h.hotspot_lng).toFixed(6)}</td>
                    <td style={{ padding: '10px' }}>{toNumber(h.report_count)}</td>
                    <td style={{ padding: '10px' }}>{toNumber(h.avg_crowd_cm).toFixed(2)}</td>
                    <td style={{ padding: '10px' }}>{toNumber(h.max_crowd_cm).toFixed(2)}</td>
                    <td style={{ padding: '10px' }}>{toNumber(h.nearest_sensor_min_dist_m).toFixed(1)}</td>
                    <td style={{ padding: '10px' }}>{h.latest_report_at ? new Date(h.latest_report_at).toLocaleString('vi-VN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ResearchAnalyticsPage;
