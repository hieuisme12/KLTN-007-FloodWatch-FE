import React, { useEffect, useState, useRef } from 'react';
import { fetchFloodData, fetchCrowdReports } from './services/api';
import SensorStats from './components/SensorStats';
import MapView from './components/MapView';
import AlertPanel from './components/AlertPanel';
import CrowdReportsList from './components/CrowdReportsList';
import ReportFloodForm from './components/ReportFloodForm';
import ChatBot from './components/ChatBot';
import './App.css';

function App() {
  const [floodData, setFloodData] = useState([]);
  const [crowdReports, setCrowdReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crowdReportsLoading, setCrowdReportsLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  // Lưu endpoint nào đang hoạt động (chỉ thử một lần)
  const endpointRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const result = await fetchFloodData(endpointRef);
      
      if (result.success && result.data) {
        setFloodData(result.data);
      } else if (result.data === null) {
        // Lỗi kết nối, giữ dữ liệu cũ
        console.warn('Giữ dữ liệu cũ do lỗi kết nối');
      } else {
        setFloodData([]);
      }
      
      setLoading(false);
    };

    loadData(); // Gọi ngay lần đầu khi load trang
    const interval = setInterval(loadData, 5000); // Tự động đo và cập nhật sau mỗi 5 giây

    return () => clearInterval(interval); // Xóa bộ đợi khi tắt trang để tránh tốn tài nguyên
  }, []);

  // Load crowd reports
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
    // Refresh crowd reports mỗi 30 giây
    const interval = setInterval(loadCrowdReports, 30000);

    return () => clearInterval(interval);
  }, []);

  // Handler khi báo cáo thành công
  const handleReportSuccess = async () => {
    // Refresh danh sách báo cáo
    const result = await fetchCrowdReports();
    if (result.success && result.data) {
      setCrowdReports(result.data);
    }
    // Đóng form sau 2 giây
    setTimeout(() => {
      setShowReportForm(false);
    }, 2000);
  };

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, overflow: 'hidden' }}>
      {/* Header với thống kê */}
      <SensorStats floodData={floodData} loading={loading} />

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Bản đồ - chiếm phần lớn không gian */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapView floodData={floodData} crowdReports={crowdReports} />
        </div>

        {/* Panel bên phải - Tab: Cảnh báo và Báo cáo */}
        <div 
          className="alert-panel-mobile"
          style={{ 
            width: '350px', 
            display: 'flex',
            flexDirection: 'column',
            background: '#f8f9fa',
            borderLeft: '1px solid #ddd'
          }}
        >
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #ddd',
            background: 'white'
          }}>
            <button
              onClick={() => setShowReportForm(false)}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'transparent',
                color: '#2c3e50',
                cursor: 'pointer',
                borderBottom: '2px solid transparent',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              🚨 Cảnh báo
            </button>
            <button
              onClick={() => setShowReportForm(false)}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'transparent',
                color: '#2c3e50',
                cursor: 'pointer',
                borderBottom: '2px solid transparent',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              📱 Báo cáo
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
            <AlertPanel floodData={floodData} />
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
              <CrowdReportsList reports={crowdReports} loading={crowdReportsLoading} />
            </div>
          </div>

          {/* Button báo cáo */}
          <div style={{ padding: '15px', borderTop: '1px solid #ddd', background: 'white' }}>
            <button
              onClick={() => setShowReportForm(true)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              📝 Báo cáo ngập lụt
            </button>
          </div>
        </div>
      </div>

      {/* Report Form Modal */}
      {showReportForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ReportFloodForm 
            onSuccess={handleReportSuccess}
            onClose={() => setShowReportForm(false)}
          />
        </div>
      )}

      {/* ChatBot - floating button */}
      <ChatBot />
    </div>
  );
}

export default App;
