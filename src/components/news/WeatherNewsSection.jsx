import React, { useState, useEffect } from 'react';
import { fetchWeatherApi } from 'openmeteo';
import { WiDaySunnyOvercast, WiHumidity, WiStrongWind, WiDaySunny, WiCloudy, WiRain, WiDayRain, WiThunderstorm, WiFog } from 'react-icons/wi';
import WaterLevelStatistics from '../stats/WaterLevelStatistics';
import './WeatherNewsSection.css';

const WeatherNewsSection = () => {
  const [weatherData, setWeatherData] = useState({
    temperature: 0,
    condition: 'Đang tải...',
    humidity: 0,
    wind: 0,
    updated: 'Đang tải...',
    cloudCover: 0,
    weatherCode: 0,
    lastUpdate: null
  });
  const [loading, setLoading] = useState(true);

  // Tọa độ Thành phố Hồ Chí Minh
  const HCM_LATITUDE = 10.8231;
  const HCM_LONGITUDE = 106.6297;

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        
        // Lấy dữ liệu thời tiết hiện tại
        const params = {
          latitude: HCM_LATITUDE,
          longitude: HCM_LONGITUDE,
          current: ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m', 'cloud_cover', 'weather_code'],
          timezone: 'Asia/Ho_Chi_Minh',
        };
        
        const url = 'https://api.open-meteo.com/v1/forecast';
        const responses = await fetchWeatherApi(url, params);
        
        if (responses && responses.length > 0) {
          const response = responses[0];
          const current = response.current();
          
          // Lấy dữ liệu từ response
          const temperature = Math.round(current.variables(0).value());
          const humidity = Math.round(current.variables(1).value());
          const windSpeed = current.variables(2).value();
          const cloudCover = Math.round(current.variables(3).value());
          const weatherCode = current.variables(4).value();
          
          // Chuyển đổi weather code thành mô tả
          const condition = getWeatherCondition(weatherCode, cloudCover);
          
          // Tính thời gian cập nhật
          const updateTime = new Date();
          const updated = 'Vừa cập nhật';
          
          setWeatherData({
            temperature,
            condition,
            humidity,
            wind: windSpeed.toFixed(2),
            updated,
            cloudCover,
            weatherCode,
            lastUpdate: updateTime
          });
        }
      } catch (error) {
        setWeatherData({
          temperature: 0,
          condition: 'Không thể tải dữ liệu',
          humidity: 0,
          wind: 0,
          updated: 'Lỗi',
          cloudCover: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    // Cập nhật mỗi 30 phút
    const interval = setInterval(fetchWeather, 1800000);
    return () => clearInterval(interval);
  }, []);

  // Hàm chuyển đổi weather code thành mô tả tiếng Việt
  const getWeatherCondition = (code, cloudCover) => {
    // Weather code mapping từ WMO Weather interpretation codes
    const conditions = {
      0: 'Trời quang',
      1: 'Chủ yếu quang đãng',
      2: 'Mây thưa',
      3: 'Nhiều mây',
      45: 'Sương mù',
      48: 'Sương mù đóng băng',
      51: 'Mưa phùn nhẹ',
      53: 'Mưa phùn vừa',
      55: 'Mưa phùn dày đặc',
      56: 'Mưa phùn đóng băng nhẹ',
      57: 'Mưa phùn đóng băng dày đặc',
      61: 'Mưa nhẹ',
      63: 'Mưa vừa',
      65: 'Mưa nặng',
      66: 'Mưa đóng băng nhẹ',
      67: 'Mưa đóng băng nặng',
      71: 'Tuyết nhẹ',
      73: 'Tuyết vừa',
      75: 'Tuyết nặng',
      77: 'Hạt tuyết',
      80: 'Mưa rào nhẹ',
      81: 'Mưa rào vừa',
      82: 'Mưa rào nặng',
      85: 'Mưa tuyết nhẹ',
      86: 'Mưa tuyết nặng',
      95: 'Dông',
      96: 'Dông với mưa đá',
      99: 'Dông với mưa đá nặng'
    };
    
    return conditions[code] || (cloudCover > 50 ? 'Nhiều mây' : 'Mây thưa');
  };

  // Chọn icon dựa trên weather code và cloud cover
  const getWeatherIcon = (code, cloudCover) => {
    if (code === 0) return WiDaySunny;
    if (code >= 1 && code <= 3) return cloudCover > 50 ? WiCloudy : WiDaySunnyOvercast;
    if (code >= 45 && code <= 48) return WiFog;
    if (code >= 51 && code <= 67) return WiDayRain;
    if (code >= 71 && code <= 77) return WiDayRain;
    if (code >= 80 && code <= 86) return WiRain;
    if (code >= 95 && code <= 99) return WiThunderstorm;
    return WiDaySunnyOvercast;
  };

  const WeatherIcon = getWeatherIcon(weatherData.weatherCode, weatherData.cloudCover);

  return (
    <div className="weather-news-section">
      {/* Weather Widget - Left */}
      <div className="weather-widget">
        <h3 className="weather-news-title">THỜI TIẾT THÀNH PHỐ HỒ CHÍ MINH</h3>
        <div className="weather-content">
          <div className="weather-icon-container">
            {loading ? (
              <div className="weather-loading">...</div>
            ) : (
              <WeatherIcon className="weather-icon" />
            )}
          </div>
          <div className="weather-main-info">
            <div className="weather-temperature">
              {loading ? '...' : `${weatherData.temperature}°`}
            </div>
            <div className="weather-condition">{weatherData.condition}</div>
          </div>
        </div>
        <div className="weather-details">
          <div className="weather-detail-item">
            <WiHumidity className="weather-detail-icon" />
            <span className="weather-detail-label">Độ ẩm:</span>
            <span className="weather-detail-value">
              {loading ? '...' : `${weatherData.humidity}%`}
            </span>
          </div>
          <div className="weather-detail-item">
            <WiStrongWind className="weather-detail-icon" />
            <span className="weather-detail-label">Gió:</span>
            <span className="weather-detail-value">
              {loading ? '...' : weatherData.wind}
            </span>
          </div>
          <div className="weather-detail-item">
            <span className="weather-detail-label">Ghi chú:</span>
            <span className="weather-detail-value"></span>
          </div>
          <div className="weather-detail-item">
            <span className="weather-detail-label">Cập nhật:</span>
            <span className="weather-detail-value">{weatherData.updated}</span>
          </div>
        </div>
      </div>

      {/* Water Level Statistics - Right */}
      <WaterLevelStatistics />
    </div>
  );
};

export default WeatherNewsSection;

