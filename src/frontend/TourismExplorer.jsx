import { useEffect, useMemo, useRef, useState } from 'react';
import './theme.css';
import { resolveRequest } from './lib/resolveRequest';
import { fetchPlaces } from './lib/api';
import { normalizePlaces } from './lib/normalizePlace';
import { orderStops } from './lib/geo';
import { useAsync } from './hooks/useAsync';
import { useTripPlan } from './hooks/useTripPlan';
import PlaceCard from './components/PlaceCard';
import PlaceMap from './components/PlaceMap';
import KindFilter from './components/KindFilter';
import TripRoute from './components/TripRoute';
import WeatherStrip from './components/WeatherStrip';
import { Skeleton, ErrorView, EmptyView, NoPlaceView } from './components/StateViews';

const NEAR = 8000, WIDE = 25000;

// Props: searchData from the platform, apiUrl of our backend, mode ('light'|'dark'|'lightsOut'),
// format ('sidebar'|'mainline'|'fullscreen'), onReady() once the UI is usable.
export default function TourismExplorer({ searchData, apiUrl, mode = 'light', format, onReady }) {
  const req = useMemo(() => resolveRequest(searchData), [searchData]);
  useEffect(() => { if (req.kind !== 'place') onReady?.(); }, [req.kind]); // eslint-disable-line react-hooks/exhaustive-deps
  if (req.kind !== 'place') return <div className="tx-root" data-mode={mode} data-format={format}><NoPlaceView /></div>;
  // key = a new search starts with fresh radius, filter and selection
  return <Explorer key={`${req.lat}|${req.lon}|${req.category.id}`} req={req} apiUrl={apiUrl} mode={mode} format={format} onReady={onReady} />;
}

function Explorer({ req, apiUrl, mode, format, onReady }) {
  const center = useMemo(() => ({ lat: req.lat, lon: req.lon }), [req.lat, req.lon]);
  const [radius, setRadius] = useState(NEAR);
  const [kind, setKind] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const planRef = useRef(null);

  const places = useAsync(
    async (signal) => normalizePlaces((await fetchPlaces({ apiUrl, ...center, category: req.category, radius }, signal)).features, center),
    [center, req.category.id, radius]);
  const plan = useTripPlan(center);

  // tell the platform the UI is ready once the first load has finished (success or failure), only once
  const told = useRef(false);
  useEffect(() => {
    if (!told.current && (places.status === 'ready' || places.status === 'error')) { told.current = true; onReady?.(); }
  }, [places.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = places.data ?? [];
  // a chosen filter that the new results no longer contain (after widening the radius) is ignored, never an empty list
  const activeKind = kind && all.some((p) => p.kind === kind) ? kind : null;
  const visible = useMemo(() => (activeKind ? all.filter((p) => p.kind === activeKind) : all), [all, activeKind]);
  const few = places.status === 'ready' && all.length > 0 && all.length < 4 && radius < WIDE;
  useEffect(() => { console.debug('[tourism]', { status: places.status, found: all.length, shown: visible.length, radius, kind: activeKind }); }, [places.status, all.length, visible.length, radius, activeKind]);

  return (
    <div className="tx-root" data-mode={mode} data-format={format}>
      <header className="tx-head">
        <h2>{req.category.label} in {req.placeName}</h2>
        {places.status === 'ready' && all.length > 0 && <p className="tx-muted">{all.length} places within {radius / 1000} km, nearest first</p>}
        {/* in a narrow sidebar the plan sits below the list: this jumps to it */}
        {plan.stops.length > 0 && places.status === 'ready' && (
          <button className="tx-btn tx-jump" onClick={() => planRef.current?.scrollIntoView({ block: 'start' })}>
            Day plan: {plan.stops.length} {plan.stops.length === 1 ? 'stop' : 'stops'}
          </button>
        )}
      </header>
      <WeatherStrip lat={req.lat} lon={req.lon} />
      {places.status === 'loading' && <Skeleton />}
      {places.status === 'error' && <ErrorView error={places.error} onRetry={places.retry} />}
      {places.status === 'ready' && all.length === 0 && (
        <EmptyView place={req.placeName} category={req.category} radiusKm={radius / 1000}
                   onWiden={radius < WIDE ? () => setRadius(WIDE) : null} />
      )}
      {places.status === 'ready' && all.length > 0 && (
        <>
          <KindFilter places={all} kind={activeKind} onChange={setKind} />
          {few && (
            <p className="tx-muted">Only {all.length} found nearby. <button className="tx-link tx-linkbtn" onClick={() => setRadius(WIDE)}>Search within 25 km</button></p>
          )}
          <div className="tx-layout">
            <div className="tx-mapwrap">
              <PlaceMap center={center} places={visible} stops={plan.stops} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
            <div className="tx-list">
              {visible.map((p) => (
                <PlaceCard key={p.id} place={p} inPlan={plan.has(p.id)} selected={p.id === selectedId}
                           onToggle={plan.toggle} onSelect={setSelectedId} />
              ))}
            </div>
            <aside className="tx-plan" ref={planRef}>
              <h3>Day plan</h3>
              <TripRoute stops={plan.stops} placeName={req.placeName} onRemove={plan.toggle} onClear={plan.clear}
                         onSuggest={() => plan.addMany(orderStops(center, visible.slice(0, 12)).slice(0, 5))} />
            </aside>
          </div>
        </>
      )}
      <footer className="tx-muted tx-foot">Places: Geoapify · Descriptions: Wikipedia · Weather: Open-Meteo · Map: © OpenStreetMap contributors. Distances are straight lines.</footer>
    </div>
  );
}
