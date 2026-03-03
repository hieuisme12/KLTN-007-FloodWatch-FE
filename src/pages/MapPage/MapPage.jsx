import React, { useState, useEffect, useRef } from 'react';
import { fetchFloodData, fetchCrowdReports } from '../../services/api';
import { POLLING_INTERVALS } from '../../config/apiConfig';
import MapHeader from '../../components/map/MapHeader';
import MapView from '../../components/map/MapView';
import './MapPage.css';

const MapPage = () => {
  const [floodData, setFloodData] = useState([]);
  const [crowdReports, setCrowdReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const endpointRef = useRef(null);

  // Filter states
  const [filters, setFilters] = useState({
    sensors: true,           // Cảm biến đo mực nước
    crowdReports: true,      // Báo cáo từ người dân
  });

  // Tự động chọn sensor đầu tiên khi có dữ liệu
  useEffect(() => {
    if (floodData.length > 0 && !selectedSensor) {
      setSelectedSensor(floodData[0]);
    }
  }, [floodData, selectedSensor]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const result = await fetchFloodData(endpointRef);
      
      if (result.success && result.data) {
        setFloodData(result.data);
      } else if (result.data === null) {
      } else {
        setFloodData([]);
      }
      
      setLoading(false);
    };

    loadData();
    const interval = setInterval(loadData, POLLING_INTERVALS.FLOOD_DATA);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadCrowdReports = async () => {
      const result = await fetchCrowdReports();
      
      if (result.success && result.data) {
        setCrowdReports(result.data);
      }
    };

    loadCrowdReports();
    const interval = setInterval(loadCrowdReports, POLLING_INTERVALS.CROWD_REPORTS);
    
    // Listen for refresh event từ ModerationPage
    const handleReportsUpdated = () => {
      loadCrowdReports();
    };
    window.addEventListener('reportsUpdated', handleReportsUpdated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('reportsUpdated', handleReportsUpdated);
    };
  }, []);

  const handleFilterChange = (filterKey) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  // Filter data based on selected filters
  const filteredFloodData = filters.sensors ? floodData : [];
  const filteredCrowdReports = filters.crowdReports ? crowdReports : [];

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
          </div>

          {/* Statistics */}
          <div className="filter-statistics">
            <div className="stat-item">
              <span className="stat-label">Cảm biến:</span>
              <span className="stat-value">{floodData.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Báo cáo:</span>
              <span className="stat-value">{crowdReports.length}</span>
            </div>
          </div>
        </div>

        {/* Map View - Right Side */}
        <div className="map-view-container">
          <MapView 
            floodData={filteredFloodData} 
            crowdReports={filteredCrowdReports} 
            onSensorSelect={setSelectedSensor}
          />
        </div>
      </div>
    </div>
  );
};

export default MapPage;

