import React from 'react';
import WeatherHcmWidget from '../weather/WeatherHcmWidget';
import WaterLevelStatistics from '../stats/WaterLevelStatistics';
/**
 * Hàng dashboard: thời tiết TP.HCM (API BE / Open-Meteo) + thống kê mực nước.
 */
const WeatherNewsSection = () => {
  return (
    <div className="relative mb-2.5 flex w-full max-w-none items-stretch gap-2.5 p-0 max-[900px]:flex-col">
      <div className="flex h-full min-h-0 min-w-[280px] flex-1 flex-col max-[900px]:min-w-0">
        <WeatherHcmWidget />
      </div>
      <div className="water-level-statistics min-h-0 flex-1">
        <WaterLevelStatistics />
      </div>
    </div>
  );
};

export default WeatherNewsSection;
