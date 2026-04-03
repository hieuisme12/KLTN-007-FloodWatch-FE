import React, { useState, useEffect, useRef } from 'react';
import { fetchFloodData, fetchCrowdReports } from '../services/api';
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
    fusion: false
  });

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
        </div>

        {/* Map View - Right Side */}
        <div className="map-view-container">
          <MapView
            floodData={filteredFloodData}
            crowdReports={filteredCrowdReports}
            fusionEnabled={filters.fusion}
            onFusionEnabledChange={(v) => setFilters((prev) => ({ ...prev, fusion: v }))}
          />
        </div>
      </div>
    </div>
  );
};

export default MapPage;

