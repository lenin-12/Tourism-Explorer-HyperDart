import { useState } from 'react';
import { useAsync } from '../hooks/useAsync';
import { fetchWeather } from '../lib/api';

// Open-Meteo WMO weather codes. An unknown code is shown as such, never as made-up weather.
const WMO = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Freezing fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Heavy freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Heavy freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Light showers', 81: 'Showers', 82: 'Violent showers', 85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm with hail',
};
const label = (c) => WMO[c] ?? 'Conditions not available';
const day = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });

export default function WeatherStrip({ lat, lon }) {
  const w = useAsync((s) => fetchWeather({ lat, lon }, s), [lat, lon]);
  const [i, setI] = useState(0);
  // Weather is optional: if it fails, the rest of the component is unaffected.
  if (w.status === 'loading') return <div className="tx-weather tx-skel" aria-busy="true" />;
  if (w.status !== 'ready' || !w.data?.daily) return <p className="tx-muted">Weather is unavailable right now.</p>;
  const { current, daily } = w.data;
  const rain = daily.precipitation_probability_max?.[i];
  return (
    <section className="tx-weather" aria-label="Weather">
      {current && <p><strong>Now</strong> {Math.round(current.temperature_2m)}°C, {label(current.weather_code)}</p>}
      <div className="tx-days" role="group" aria-label="Forecast day">
        {daily.time.map((t, k) => (
          <button key={t} className="tx-chip" aria-pressed={k === i} onClick={() => setI(k)}>{day(t)}</button>
        ))}
      </div>
      <p><strong>Forecast</strong> {Math.round(daily.temperature_2m_min[i])}–{Math.round(daily.temperature_2m_max[i])}°C, {label(daily.weather_code[i])}
        {rain != null && `, ${rain}% chance of rain`}</p>
      {rain >= 50 && <p className="tx-muted">Rain is likely. Indoor places such as museums are the safer pick.</p>}
    </section>
  );
}
