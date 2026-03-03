import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../../utils/auth';
import { FaLock, FaPenToSquare } from 'react-icons/fa6';
import axios from 'axios';
import { API_CONFIG } from '../../config/apiConfig';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const authenticated = isAuthenticated();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [totalVisits, setTotalVisits] = useState(0);
  const [monthlyVisits, setMonthlyVisits] = useState(0);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch statistics - TEMPORARILY DISABLED until backend is ready
  // useEffect(() => {
  //   const fetchStats = async () => {
  //     try {
  //       // Fetch total visits
  //       const totalResponse = await axios.get(`${API_CONFIG.BASE_URL}/api/stats/total-visits`, {
  //         timeout: 3000,
  //         validateStatus: () => true
  //       }).catch(() => null);
  //       
  //       if (totalResponse && totalResponse.status === 200 && totalResponse.data && totalResponse.data.success) {
  //         setTotalVisits(totalResponse.data.data.totalVisits || 0);
  //       } else {
  //         setTotalVisits(0);
  //       }

  //       // Fetch monthly visits
  //       const monthlyResponse = await axios.get(`${API_CONFIG.BASE_URL}/api/stats/monthly-visits`, {
  //         timeout: 3000,
  //         validateStatus: () => true
  //       }).catch(() => null);
  //       
  //       if (monthlyResponse && monthlyResponse.status === 200 && monthlyResponse.data && monthlyResponse.data.success) {
  //         setMonthlyVisits(monthlyResponse.data.data.monthlyVisits || 0);
  //       } else {
  //         setMonthlyVisits(0);
  //       }
  //     } catch (error) {
  //       setTotalVisits(0);
  //       setMonthlyVisits(0);
  //     }
  //   };

  //   fetchStats();
  //   // Update every 5 minutes
  //   const interval = setInterval(fetchStats, 300000);
  //   return () => clearInterval(interval);
  // }, []);

  // Format date in Vietnamese
  const formatDate = (date) => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = days[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${dayName}, ngày ${day} tháng ${month}, năm ${year}`;
  };

  // Format time
  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Logo/Brand - nằm ở phần màu xanh của banner */}
        <div className="header-brand" onClick={() => navigate('/')}>
          <div className="brand-icon-circle">
            <img src="/iuh.png" alt="IUH Logo" className="brand-icon-img" />
          </div>
          <span className="brand-text">FLOODSIGHT TP HỒ CHÍ MINH</span>
        </div>

        {/* Statistics Section - nằm ở phần màu trắng của banner */}
        <div className="header-right-section">
          <div className="header-stats">
            {/* Date and Time */}
            <div className="header-date-time">
              <div className="header-date">{formatDate(currentTime)}</div>
              <div className="header-time">{formatTime(currentTime)}</div>
            </div>

            {/* Total Visits */}
            <div className="header-stat-item">
              <div className="header-stat-label">Lượt truy cập</div>
              <div className="header-stat-value">{formatNumber(totalVisits)}</div>
            </div>

            {/* Monthly Visits */}
            <div className="header-stat-item">
              <div className="header-stat-label">Lượt truy cập tháng</div>
              <div className="header-stat-value">{formatNumber(monthlyVisits)}</div>
            </div>
          </div>

          {/* User Actions - chỉ hiển thị khi chưa đăng nhập */}
          {!authenticated && (
            <div className="header-actions">
              <button
                className="header-action-btn"
                onClick={() => navigate('/login')}
              >
                <FaLock /> Đăng nhập
              </button>
              <button
                className="header-action-btn header-register-btn"
                onClick={() => navigate('/register')}
              >
                <FaPenToSquare /> Đăng ký
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

