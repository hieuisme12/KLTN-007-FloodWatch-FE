import React, { useState, useEffect } from 'react';
import { fetchFloodData } from '../../services/api';
import { POLLING_INTERVALS } from '../../config/apiConfig';
import { FaChartColumn } from 'react-icons/fa6';
import './WaterLevelStatistics.css';

const WaterLevelStatistics = () => {
  const [waterLevelData, setWaterLevelData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchFloodData(null);
        
        if (result.success && result.data) {
          // Nhóm dữ liệu theo ngày và tính trung bình mực nước
          const groupedByDate = {};
          
          result.data.forEach(sensor => {
            if (sensor.water_level !== undefined && sensor.last_data_time) {
              const date = new Date(sensor.last_data_time).toISOString().split('T')[0];
              
              if (!groupedByDate[date]) {
                groupedByDate[date] = {
                  date: date,
                  values: [],
                  sensors: []
                };
              }
              
              groupedByDate[date].values.push(sensor.water_level);
              groupedByDate[date].sensors.push({
                name: sensor.location_name,
                level: sensor.water_level
              });
            }
          });
          
          // Tính trung bình mực nước cho mỗi ngày
          const dailyData = Object.values(groupedByDate)
            .map(group => ({
              date: group.date,
              averageLevel: group.values.reduce((a, b) => a + b, 0) / group.values.length,
              maxLevel: Math.max(...group.values),
              minLevel: Math.min(...group.values),
              sensorCount: group.sensors.length,
              sensors: group.sensors
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 7); // Lấy 7 ngày gần nhất
          
          setWaterLevelData(dailyData);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, POLLING_INTERVALS.FLOOD_DATA);
    return () => clearInterval(interval);
  }, []);

  // Tính toán chiều cao cho biểu đồ cột
  const getMaxLevel = () => {
    if (waterLevelData.length === 0) return 100;
    return Math.max(...waterLevelData.map(d => d.maxLevel), 100);
  };

  const maxLevel = getMaxLevel();

  // Format ngày
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
  };

  // Lấy dữ liệu cho ngày được chọn
  const selectedDayData = waterLevelData.find(d => d.date === selectedDate);

  return (
    <div className="water-level-statistics">
      <h3 className="statistics-title">
        <FaChartColumn /> THỐNG KÊ NỘI DUNG
      </h3>
      
      {loading ? (
        <div className="statistics-loading">Đang tải dữ liệu...</div>
      ) : waterLevelData.length === 0 ? (
        <div className="statistics-empty">Chưa có dữ liệu mực nước</div>
      ) : (
        <>
          {/* Biểu đồ cột */}
          <div className="statistics-chart">
            <div className="chart-container">
              <div className="chart-bars">
                {waterLevelData.map((data, index) => {
                  const height = (data.averageLevel / maxLevel) * 100;
                  const isSelected = data.date === selectedDate;
                  
                  return (
                    <div
                      key={index}
                      className={`chart-bar-wrapper ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedDate(data.date)}
                      title={`Ngày ${formatDate(data.date)}: ${data.averageLevel.toFixed(1)} cm`}
                    >
                      <div className="chart-bar-container">
                        <div
                          className="chart-bar"
                          style={{ height: `${height}%` }}
                        >
                          <span className="chart-bar-value">
                            {data.averageLevel.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="chart-bar-label">
                        {formatDate(data.date)}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Trục Y */}
              <div className="chart-y-axis">
                <div className="y-axis-label">{maxLevel.toFixed(0)}</div>
                <div className="y-axis-label">{(maxLevel * 0.75).toFixed(0)}</div>
                <div className="y-axis-label">{(maxLevel * 0.5).toFixed(0)}</div>
                <div className="y-axis-label">{(maxLevel * 0.25).toFixed(0)}</div>
                <div className="y-axis-label">0</div>
              </div>
            </div>
            
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color" style={{ background: '#2196f3' }}></span>
                Mực nước trung bình (cm)
              </span>
            </div>
          </div>

          {/* Chi tiết ngày được chọn */}
          {selectedDayData && (
            <div className="statistics-details">
              <h4 className="details-title">
                Chi tiết ngày {formatDate(selectedDayData.date)}
              </h4>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Mực nước trung bình:</span>
                  <span className="detail-value">{selectedDayData.averageLevel.toFixed(1)} cm</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mực nước cao nhất:</span>
                  <span className="detail-value">{selectedDayData.maxLevel.toFixed(1)} cm</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mực nước thấp nhất:</span>
                  <span className="detail-value">{selectedDayData.minLevel.toFixed(1)} cm</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Số lượng sensor:</span>
                  <span className="detail-value">{selectedDayData.sensorCount}</span>
                </div>
              </div>
              
              {/* Danh sách sensor */}
              {selectedDayData.sensors.length > 0 && (
                <div className="sensors-list">
                  <h5 className="sensors-list-title">Mực nước theo sensor:</h5>
                  <div className="sensors-grid">
                    {selectedDayData.sensors.map((sensor, idx) => (
                      <div key={idx} className="sensor-item">
                        <span className="sensor-name">{sensor.name}</span>
                        <span className="sensor-level">{sensor.level.toFixed(1)} cm</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WaterLevelStatistics;

