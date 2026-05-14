import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchWeatherHcm } from '../../services/api';
import { WiHumidity, WiStrongWind } from 'react-icons/wi';
import { FaCloudSun } from 'react-icons/fa6';
import { cn } from '../../lib/cn';
import Skeleton from 'react-loading-skeleton';

const pick = (obj, keys) => {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return null;
};

const asRenderableText = (val, fallback = null) => {
  if (val == null) return fallback;
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (typeof val === 'object' && typeof val.text === 'string') return val.text;
  try {
    return JSON.stringify(val);
  } catch {
    return fallback;
  }
};

export default function WeatherHcmWidget() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const res = await fetchWeatherHcm({ forecast_days: 3 });
      if (cancelled) return;
      if (res.success && res.data) setData(res.data);
      else setError(res.error || t('weatherWidget.loadFail'));
      setLoading(false);
    };
    load();
    const intervalId = setInterval(load, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [t]);

  const current = data?.current && typeof data.current === 'object' ? data.current : {};
  const hourly = data?.hourly && typeof data.hourly === 'object' ? data.hourly : {};
  const temp =
    pick(current, ['temperature_2m', 'temperature']) ??
    (Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m[0] : null);
  const humidity = pick(current, ['relative_humidity_2m', 'relativehumidity_2m']);
  const wind = pick(current, ['wind_speed_10m', 'windspeed_10m']);
  const code = pick(current, ['weather_code', 'weathercode']);
  const times = Array.isArray(hourly.time) ? hourly.time : [];
  const precipProb = Array.isArray(hourly.precipitation_probability)
    ? hourly.precipitation_probability
    : Array.isArray(hourly.precipitation_probability_max)
      ? hourly.precipitation_probability_max
      : [];
  const nextHours = times.slice(0, 8).map((timeVal, i) => ({
    time: timeVal,
    pop: precipProb[i]
  }));

  const attributionText = data?.attribution != null ? asRenderableText(data.attribution) : null;
  const timeLocale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US';

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full flex-1 flex-col rounded-xl bg-gradient-to-br from-sky-950 via-sky-700 to-sky-600 p-5 text-sky-50 shadow-lg shadow-sky-900/25'
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <FaCloudSun className="shrink-0 text-[28px] opacity-95" aria-hidden />
        <h3 className="m-0 flex-1 text-lg font-bold">{t('weatherWidget.title')}</h3>
      </div>
      {loading && !data && (
        <div className="space-y-3">
          <Skeleton height={40} width="55%" baseColor="rgba(255,255,255,0.14)" highlightColor="rgba(255,255,255,0.28)" />
          <Skeleton count={3} height={16} baseColor="rgba(255,255,255,0.12)" highlightColor="rgba(255,255,255,0.22)" />
        </div>
      )}
      {error && <p className="m-0 text-sm text-red-200">{String(error)}</p>}
      {data && (
        <>
          <div className="mb-3.5 flex flex-1 flex-col justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            {temp != null && (
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold leading-none tracking-tight">
                  {typeof temp === 'number' ? temp.toFixed(1) : temp}
                </span>
                <span className="text-base opacity-85">°C</span>
              </div>
            )}
            <div className="flex flex-wrap gap-3 text-sm opacity-95 md:gap-4">
              {humidity != null && (
                <span className="inline-flex items-center gap-1">
                  <WiHumidity className="text-[22px] shrink-0" />
                  {typeof humidity === 'number' ? Math.round(humidity) : humidity}%
                </span>
              )}
              {wind != null && (
                <span className="inline-flex items-center gap-1">
                  <WiStrongWind className="text-[22px] shrink-0" />
                  {typeof wind === 'number' ? wind.toFixed(1) : wind} km/h
                </span>
              )}
              {code != null && <span>{t('weatherWidget.weatherCode', { code })}</span>}
            </div>
          </div>
          {nextHours.length > 0 && (
            <div className="mb-2.5 flex-1 rounded-lg bg-black/15 px-3 py-2.5">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide opacity-85">
                {t('weatherWidget.rainNextHours')}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {nextHours.map((h, idx) => (
                  <div key={idx} className="min-w-[48px] shrink-0 text-center text-[11px]">
                    <div className="mb-1 opacity-85">
                      {h.time
                        ? new Date(h.time).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })
                        : t('weatherWidget.hourOffset', { n: idx })}
                    </div>
                    <div className="font-bold">{h.pop != null ? `${Math.round(Number(h.pop))}%` : '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {attributionText && (
            <p className="m-0 mt-auto shrink-0 text-[10px] leading-snug opacity-75">{attributionText}</p>
          )}
          </div>
        </>
      )}
    </div>
  );
}
