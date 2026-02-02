import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import SensorStats from '../components/SensorStats';

const MainLayout = ({ floodData, loading }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  return (
    <div style={{ 
      height: '100vh', 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      margin: 0, 
      padding: 0, 
      overflow: 'hidden' 
    }}>
      {/* Header - chỉ hiển thị ở dashboard */}
      {isDashboard && <SensorStats floodData={floodData} loading={loading} />}

      {/* Main Content */}
      <Outlet />
    </div>
  );
};

export default MainLayout;
