import React, { useEffect, useState, useRef } from 'react';
import { fetchFloodData, fetchCrowdReports, isAuthenticated } from '../../services/api';
import { POLLING_INTERVALS } from '../../config/apiConfig';
import { useNavigate } from 'react-router-dom';
import SensorStats from '../../components/SensorStats';
import MapView from '../../components/MapView';
import AlertPanel from '../../components/AlertPanel';
import CrowdReportsList from '../../components/CrowdReportsList';
import ChatBot from '../../components/ChatBot';
import GuestLoginPrompt from '../../components/GuestLoginPrompt';
import './DashboardPage.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [floodData, setFloodData] = useState([]);
  const [crowdReports, setCrowdReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crowdReportsLoading, setCrowdReportsLoading] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const endpointRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const result = await fetchFloodData(endpointRef);
      
      if (result.success && result.data) {
        setFloodData(result.data);
      } else if (result.data === null) {
        console.warn('Giữ dữ liệu cũ do lỗi kết nối');
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
      setCrowdReportsLoading(true);
      const result = await fetchCrowdReports();
      
      if (result.success && result.data) {
        setCrowdReports(result.data);
      }
      
      setCrowdReportsLoading(false);
    };

    loadCrowdReports();
    const interval = setInterval(loadCrowdReports, POLLING_INTERVALS.CROWD_REPORTS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      <SensorStats floodData={floodData} loading={loading} />

      <div className="dashboard-main">
        <div className="dashboard-map">
          <MapView floodData={floodData} crowdReports={crowdReports} />
        </div>

        <div className="dashboard-sidebar">
          <div className="dashboard-tabs">
            <button
              className="dashboard-tab active"
              style={{ cursor: 'default' }}
            >
              🚨 Cảnh báo
            </button>
          </div>

          <div className="dashboard-content">
            <AlertPanel floodData={floodData} />
            <div className="dashboard-divider">
              <CrowdReportsList reports={crowdReports.slice(0, 5)} loading={crowdReportsLoading} />
              {crowdReports.length > 5 && (
                <button
                  onClick={() => navigate('/reports')}
                  className="dashboard-view-all-btn"
                >
                  Xem tất cả báo cáo ({crowdReports.length})
                </button>
              )}
            </div>
          </div>

          <div className="dashboard-footer">
            <button
              onClick={() => {
                if (!isAuthenticated()) {
                  setShowLoginPrompt(true);
                } else {
                  navigate('/report/new');
                }
              }}
              className="dashboard-report-btn"
            >
              📝 Báo cáo ngập lụt
            </button>
          </div>
        </div>
      </div>

      <ChatBot />
      
      {showLoginPrompt && (
        <GuestLoginPrompt 
          message="Vui lòng đăng nhập để báo cáo tình trạng ngập lụt. Thông tin của bạn giúp cộng đồng cập nhật tình hình thời tiết thực tế!"
          onClose={() => setShowLoginPrompt(false)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
