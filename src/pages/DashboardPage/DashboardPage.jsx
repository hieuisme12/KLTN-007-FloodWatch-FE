import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFloodData, fetchCrowdReports } from '../../services/api';
import { POLLING_INTERVALS } from '../../config/apiConfig';
import MapView from '../../components/map/MapView';
import ChatBot from '../../components/common/ChatBot';
import SensorDetailPanel from '../../components/map/SensorDetailPanel';
import WeatherNewsSection from '../../components/news/WeatherNewsSection';
import { FaMap } from 'react-icons/fa6';
import './DashboardPage.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [floodData, setFloodData] = useState([]);
  const [crowdReports, setCrowdReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const endpointRef = useRef(null);

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

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <div className="dashboard-map-wrapper">
          <div className="dashboard-map">
            <MapView 
              floodData={floodData} 
              crowdReports={crowdReports} 
              onSensorSelect={setSelectedSensor}
            />
          </div>
        </div>
        <SensorDetailPanel sensor={selectedSensor} />
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

        {/* Weather and News Section */}
        <WeatherNewsSection />
      </div>

      <ChatBot />
    </div>
  );
};

export default DashboardPage;
