import React, { useEffect, useState } from 'react';
import { fetchWeatherHcm } from '../../services/api';
import { WiHumidity, WiStrongWind } from 'react-icons/wi';
import { FaCloudSun } from 'react-icons/fa6';
import { cn } from '../../lib/cn';

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
      else setError(res.error || 'Không tải được thời tiết');
      setLoading(false);
    };
    load();
    const t = setInterval(load, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

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
  const nextHours = times.slice(0, 8).map((t, i) => ({
    time: t,
    pop: precipProb[i]
  }));

  const attributionText = data?.attribution != null ? asRenderableText(data.attribution) : null;

  return (
    <div
      className={cn(
        'h-full min-h-0 rounded-xl bg-gradient-to-br from-sky-950 via-sky-700 to-sky-600 p-5 text-sky-50 shadow-lg shadow-sky-900/25'
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <FaCloudSun className="shrink-0 text-[28px] opacity-95" aria-hidden />
        <h3 className="m-0 flex-1 text-lg font-bold">Thời tiết TP.HCM</h3>
      </div>
      {loading && !data && <p className="m-0 text-sm">Đang tải…</p>}
      {error && <p className="m-0 text-sm text-red-200">{String(error)}</p>}
      {data && (
        <>
          <div className="mb-3.5 flex flex-wrap items-center gap-4 md:gap-6">
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
              {code != null && <span>Mã thời tiết: {code}</span>}
            </div>
          </div>
          {nextHours.length > 0 && (
            <div className="mb-2.5 rounded-lg bg-black/15 px-3 py-2.5">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide opacity-85">
                Xác suất mưa (giờ tới)
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {nextHours.map((h, idx) => (
                  <div key={idx} className="min-w-[48px] shrink-0 text-center text-[11px]">
                    <div className="mb-1 opacity-85">
                      {h.time
                        ? new Date(h.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                        : `+${idx}h`}
                    </div>
                    <div className="font-bold">{h.pop != null ? `${Math.round(Number(h.pop))}%` : '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {attributionText && (
            <p className="m-0 text-[10px] leading-snug opacity-75">{attributionText}</p>
          )}
        </>
      )}
    </div>
  );
}
