import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { fetchFloodData, fetchCrowdReports, fetchHeatmapTimeline24h } from '../services/api';
import { POLLING_INTERVALS, CROWD_REPORT_MAP_DISPLAY_HOURS } from '../config/apiConfig';
import { filterNonExpiredReports } from '../utils/reportHelpers';
import MapHeader from '../components/map/MapHeader';
import MapView from '../components/map/MapView';
const MapPage = () => {
  const [floodData, setFloodData] = useState([]);
  const [crowdReports, setCrowdReports] = useState([]);
  const endpointRef = useRef(null);

  // Filter states
  const [filters, setFilters] = useState({
    sensors: true,
    crowdReports: true,
    fusion: false,
    heatmap: false,
    timeline24h: false
  });
  const [timelineChart, setTimelineChart] = useState([]);
  const [timelineError, setTimelineError] = useState('');
  const [timelineLoading, setTimelineLoading] = useState(false);

  const loadTimeline = useCallback(async () => {
    setTimelineError('');
    setTimelineLoading(true);
    const res = await fetchHeatmapTimeline24h();
    if (!res.success) {
      setTimelineChart([]);
      setTimelineError(res.error || 'Không tải được timeline 24h');
      setTimelineLoading(false);
      return;
    }
    const rows = Array.isArray(res.data) ? res.data : [];
    const chartData = rows.map((row, i) => {
      const label =
        row.hour_label ??
        (row.hour != null ? `${String(row.hour).padStart(2, '0')}h` : row.label ?? `#${i + 1}`);
      let value = 0;
      if (typeof row === 'number') value = row;
      else if (row && typeof row === 'object') {
        value = Number(
          row.total ?? row.count ?? row.sum ?? row.value ?? row.events ?? row.reports ?? row.intensity ?? 0
        );
        if (!Number.isFinite(value) || value === 0) {
          const s = Number(row.sensor_count);
          const c = Number(row.crowd_count);
          if (Number.isFinite(s) || Number.isFinite(c)) {
            value = (Number.isFinite(s) ? s : 0) + (Number.isFinite(c) ? c : 0);
          }
        }
      }
      return { name: String(label), value: Number.isFinite(value) ? value : 0 };
    });
    setTimelineChart(chartData);
    setTimelineLoading(false);
  }, []);

  useEffect(() => {
    if (!filters.timeline24h) {
      queueMicrotask(() => {
        setTimelineChart([]);
        setTimelineError('');
      });
      return;
    }
    queueMicrotask(() => void loadTimeline());
    const iv = setInterval(() => queueMicrotask(() => void loadTimeline()), 300000);
    return () => clearInterval(iv);
  }, [filters.timeline24h, loadTimeline]);

  useEffect(() => {
    const loadData = async () => {
      const result = await fetchFloodData(endpointRef);
      
      if (result.success && result.data) {
        setFloodData(result.data);
      } else if (result.data === null) {
        // keep current floodData when API returns null payload
      } else {
        setFloodData([]);
      }
    };

    loadData();
    const interval = setInterval(loadData, POLLING_INTERVALS.FLOOD_DATA);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadCrowdReports = async () => {
      const result = await fetchCrowdReports({ moderation_status: 'approved' });
      if (result.success && result.data) {
        setCrowdReports(result.data);
      }
    };

    loadCrowdReports();
    const interval = setInterval(loadCrowdReports, POLLING_INTERVALS.CROWD_REPORTS);
    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (filterKey) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  // Báo cáo chưa hết hạn (ẩn báo cáo đã hết hạn khỏi bản đồ)
  const nonExpiredCrowdReports = filterNonExpiredReports(crowdReports, CROWD_REPORT_MAP_DISPLAY_HOURS);
  // Filter data based on selected filters
  const filteredFloodData = filters.sensors ? floodData : [];
  const filteredCrowdReports = filters.crowdReports ? nonExpiredCrowdReports : [];

  return (
    <div className="map-page-layout">
      <MapHeader />
      <div className="map-page-container">
        {/* Filter Panel - Left Side */}
        <div className="map-filter-panel">
          <div className="filter-panel-header">
            <h3 className="filter-title">Bộ lọc</h3>
          </div>
          
          <div className="filter-options">
            <div className="filter-option">
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.sensors}
                  onChange={() => handleFilterChange('sensors')}
                  className="filter-checkbox"
                />
                <span className="filter-checkbox-custom"></span>
                <div className="filter-option-content">
                  <span className="filter-option-text">Cảm biến đo mực nước</span>
                </div>
              </label>
            </div>

            <div className="filter-option">
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.crowdReports}
                  onChange={() => handleFilterChange('crowdReports')}
                  className="filter-checkbox"
                />
                <span className="filter-checkbox-custom"></span>
                <div className="filter-option-content">
                  <span className="filter-option-text">Báo cáo từ người dân</span>
                </div>
              </label>
            </div>

            <div className="filter-option">
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.fusion}
                  onChange={() => handleFilterChange('fusion')}
                  className="filter-checkbox"
                />
                <span className="filter-checkbox-custom"></span>
                <div className="filter-option-content">
                  <span className="filter-option-text">Lớp trộn dữ liệu</span>
                </div>
              </label>
            </div>

            <div className="filter-option">
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.heatmap}
                  onChange={() => handleFilterChange('heatmap')}
                  className="filter-checkbox"
                />
                <span className="filter-checkbox-custom"></span>
                <div className="filter-option-content">
                  <span className="filter-option-text">Heatmap kết hợp (24h)</span>
                </div>
              </label>
            </div>

            <div className="filter-option">
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.timeline24h}
                  onChange={() => handleFilterChange('timeline24h')}
                  className="filter-checkbox"
                />
                <span className="filter-checkbox-custom"></span>
                <div className="filter-option-content">
                  <span className="filter-option-text">Biểu đồ mật độ 24h</span>
                </div>
              </label>
            </div>
          </div>

          {/* Statistics */}
          <div className="filter-statistics">
            <div className="stat-item">
              <span className="stat-label">Cảm biến:</span>
              <span className="stat-value">{floodData.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Báo cáo:</span>
              <span className="stat-value">{nonExpiredCrowdReports.length}</span>
            </div>
          </div>

          {filters.timeline24h && (
            <div className="map-timeline-panel" style={{ marginTop: '14px' }}>
              <div className="filter-panel-header" style={{ marginBottom: '8px' }}>
                <h4 className="filter-title" style={{ fontSize: '14px' }}>
                  Mật độ theo giờ (24h)
                </h4>
              </div>
              {timelineError && (
                <p style={{ fontSize: '12px', color: '#b91c1c', marginBottom: '8px' }}>{timelineError}</p>
              )}
              {timelineChart.length > 0 ? (
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timelineChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} width={28} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#1976d2" radius={[4, 4, 0, 0]} name="Mật độ" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                !timelineError && (
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    {timelineLoading ? 'Đang tải…' : 'Chưa có dữ liệu trong 24h gần đây.'}
                  </p>
                )
              )}
            </div>
          )}
        </div>

        {/* Map View - Right Side */}
        <div className="map-view-container">
          <MapView
            floodData={filteredFloodData}
            crowdReports={filteredCrowdReports}
            fusionEnabled={filters.fusion}
            onFusionEnabledChange={(v) => setFilters((prev) => ({ ...prev, fusion: v }))}
            heatmapEnabled={filters.heatmap}
          />
        </div>
      </div>
    </div>
  );
};

export default MapPage;

