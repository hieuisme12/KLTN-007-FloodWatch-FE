import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGuestExplore } from '../../hooks/useGuestExplore';
import { fetchFloodData, fetchCrowdReports } from '../../services/api';
import { POLLING_INTERVALS, CROWD_REPORT_MAP_DISPLAY_HOURS } from '../../config/apiConfig';
import { filterNonExpiredReports } from '../../utils/reportHelpers';
import MapView from '../../components/map/MapView';
import ChatBot from '../../components/common/ChatBot';
import SensorDetailPanel from '../../components/map/SensorDetailPanel';
import WeatherNewsSection from '../../components/news/WeatherNewsSection';
import { PrimaryButton } from '../../components/common/Button';
const DashboardPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { openWelcome } = useGuestExplore();
  const [floodData, setFloodData] = useState([]);
  const [crowdReports, setCrowdReports] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedCrowdReport, setSelectedCrowdReport] = useState(null);
  const endpointRef = useRef(null);

  const guestWelcome = Boolean(location.state?.guestWelcome);
  useEffect(() => {
    if (!guestWelcome) return;
    openWelcome();
    navigate(location.pathname, { replace: true, state: {} });
  }, [guestWelcome, location.pathname, navigate, openWelcome]);

  // Khi floodData cập nhật từ polling: đồng bộ selectedSensor với dữ liệu mới nhất
  useEffect(() => {
    if (floodData.length === 0) return;
    if (!selectedSensor) {
      const id = window.setTimeout(() => setSelectedSensor(floodData[0]), 0);
      return () => window.clearTimeout(id);
    }
    const fresh = floodData.find((s) => s.sensor_id === selectedSensor.sensor_id);
    if (fresh && fresh !== selectedSensor) {
      setSelectedSensor(fresh);
    }
  }, [floodData]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const onReportCreated = () => {
      void loadCrowdReports();
    };
    window.addEventListener('floodsight:crowd-report-created', onReportCreated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('floodsight:crowd-report-created', onReportCreated);
    };
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
              sensorPopupTrigger="hover"
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
            <h2 className="dashboard-banner-title">{t('dashboard.mapBannerTitle')}</h2>
            <PrimaryButton type="button" size="lg" onClick={() => navigate('/map')}>
              {t('dashboard.mapBannerCta')}
            </PrimaryButton>
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
