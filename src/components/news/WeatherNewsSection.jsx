import React from 'react';
import WeatherHcmWidget from '../weather/WeatherHcmWidget';
import WaterLevelStatistics from '../stats/WaterLevelStatistics';
/**
 * Hàng dashboard: thời tiết TP.HCM + tin tức 24h (cùng chiều cao cột).
 */
const WeatherNewsSection = () => {
  return (
    <div className="weather-news-section relative mb-2.5 flex w-full max-w-none items-stretch gap-2.5 p-0 max-[900px]:flex-col">
      <div className="flex min-h-0 min-w-[280px] flex-1 flex-col self-stretch max-[900px]:min-w-0">
        <WeatherHcmWidget />
      </div>
      <div className="flex min-h-0 flex-1 flex-col self-stretch">
        <WaterLevelStatistics />
      </div>
    </div>
  );
};

export default WeatherNewsSection;
