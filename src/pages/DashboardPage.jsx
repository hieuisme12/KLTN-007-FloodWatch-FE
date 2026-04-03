import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFloodData, fetchCrowdReports } from '../services/api';
import { POLLING_INTERVALS, CROWD_REPORT_MAP_DISPLAY_HOURS } from '../config/apiConfig';
import { filterNonExpiredReports } from '../utils/reportHelpers';
import MapView from '../components/map/MapView';
import ChatBot from '../components/common/ChatBot';
import SensorDetailPanel from '../components/map/SensorDetailPanel';
import WeatherNewsSection from '../components/news/WeatherNewsSection';
import { FaMap } from 'react-icons/fa6';
const DashboardPage = () => {
  const navigate = useNavigate();
  const [floodData, setFloodData] = useState([]);
  const [crowdReports, setCrowdReports] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedCrowdReport, setSelectedCrowdReport] = useState(null);
  const endpointRef = useRef(null);

  // Tự động chọn sensor đầu tiên khi có dữ liệu (tránh setState đồng bộ trong effect)
  useEffect(() => {
    if (floodData.length === 0 || selectedSensor) return;
    const id = window.setTimeout(() => setSelectedSensor(floodData[0]), 0);
    return () => window.clearTimeout(id);
  }, [floodData, selectedSensor]);

  useEffect(() => {
    const loadData = async () => {
      const result = await fetchFloodData(endpointRef);

      if (result.success && result.data) {
        setFloodData(result.data);
      } else if (result.data === null) {
        // Giữ floodData hiện tại khi API trả null
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

  const nonExpiredCrowdReports = filterNonExpiredReports(crowdReports, CROWD_REPORT_MAP_DISPLAY_HOURS);

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <div className="dashboard-map-wrapper">
          <div className="dashboard-map">
            <MapView
              floodData={floodData}
              crowdReports={nonExpiredCrowdReports}
              showFusionLayer={false}
              onSensorSelect={(s) => {
                setSelectedSensor(s);
                setSelectedCrowdReport(null);
              }}
              onCrowdReportSelect={(r) => {
                setSelectedCrowdReport(r);
                setSelectedSensor(null);
              }}
            />
          </div>
        </div>
        <SensorDetailPanel
          key={
            selectedCrowdReport?.id != null
              ? `crowd-${selectedCrowdReport.id}`
              : selectedSensor?.sensor_id != null
                ? `sensor-${selectedSensor.sensor_id}`
                : 'empty'
          }
          sensor={selectedSensor}
          crowdReport={selectedCrowdReport}
        />
      </div>

      <div className="dashboard-content-wrapper">
        {/* Banner Section */}
        <div className="dashboard-banner">
          <div className="dashboard-banner-content">
            <h2 className="dashboard-banner-title">Truy cập bản đồ chi tiết</h2>
            <button 
              className="dashboard-banner-button"
              onClick={() => navigate('/map')}
            >
              Xem bản đồ thông minh
            </button>
          </div>
        </div>

        {/* Thời tiết (API BE) + thống kê mực nước */}
        <WeatherNewsSection />
      </div>

      <ChatBot />
    </div>
  );
};

export default DashboardPage;
