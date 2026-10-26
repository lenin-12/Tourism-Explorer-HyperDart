import { useEffect, useMemo, useRef, useState } from 'react';
import './theme.css';
import { resolveRequest } from './lib/resolveRequest';
import { fetchPlaces } from './lib/api';
import { normalizePlaces } from './lib/normalizePlace';
import { orderStops, formatKm } from './lib/geo';
import { useAsync } from './hooks/useAsync';
import { useTripPlan } from './hooks/useTripPlan';
import PlaceCard from './components/PlaceCard';
import PlaceMap from './components/PlaceMap';
import KindFilter from './components/KindFilter';
import TripRoute from './components/TripRoute';
import WeatherStrip from './components/WeatherStrip';
import TopPicks from './components/TopPicks';
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
  const [hoveredId, setHoveredId] = useState(null);
  const [indoorFirst, setIndoorFirst] = useState(false);
  const [exploreFilter, setExploreFilter] = useState(null); // 'must_see' | 'indoor' | 'walkable' | null
  const [sortBy, setSortBy] = useState('nearest'); // 'nearest' | 'notable'
  const [toast, setToast] = useState(null);
  const planRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 2500);
  };

  const places = useAsync(
    async (signal) => normalizePlaces((await fetchPlaces({ apiUrl, ...center, category: req.category, radius }, signal)).features, center),
    [center, req.category.id, radius]
  );
  const plan = useTripPlan(center);

  // tell the platform the UI is ready once the first load has finished (success or failure), only once
  const told = useRef(false);
  useEffect(() => {
    if (!told.current && (places.status === 'ready' || places.status === 'error')) { told.current = true; onReady?.(); }
  }, [places.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = places.data ?? [];
  const activeKind = kind && all.some((p) => p.kind === kind) ? kind : null;

  // 1. Filter by kind
  const filteredByKind = useMemo(() => {
    return activeKind ? all.filter((p) => p.kind === activeKind) : all;
  }, [all, activeKind]);

  // 2. Filter by explore toggle (Must-see, Walkable < 2 km)
  const filteredPlaces = useMemo(() => {
    if (!exploreFilter) return filteredByKind;
    if (exploreFilter === 'must_see') return filteredByKind.filter((p) => Boolean(p.wikipedia));
    if (exploreFilter === 'walkable') return filteredByKind.filter((p) => p.distanceKm <= 2.0);
    return filteredByKind;
  }, [filteredByKind, exploreFilter]);

  // 3. Sort by indoor-first and sort order
  const sortedVisible = useMemo(() => {
    const isIndoor = indoorFirst || exploreFilter === 'indoor';
    return [...filteredPlaces].sort((a, b) => {
      if (isIndoor) {
        const aIn = a.kind === 'Museum' ? 0 : 1;
        const bIn = b.kind === 'Museum' ? 0 : 1;
        if (aIn !== bIn) return aIn - bIn;
      }
      if (sortBy === 'notable') {
        const aWiki = a.wikipedia ? 0 : 1;
        const bWiki = b.wikipedia ? 0 : 1;
        if (aWiki !== bWiki) return aWiki - bWiki;
      }
      return a.distanceKm - b.distanceKm;
    });
  }, [filteredPlaces, indoorFirst, exploreFilter, sortBy]);

  // Top picks row: first 3 places (with Wikipedia tag first, then nearest)
  const topPicks = useMemo(() => {
    if (sortedVisible.length < 3) return [];
    return [...sortedVisible]
      .sort((a, b) => {
        const aWiki = a.wikipedia ? 0 : 1;
        const bWiki = b.wikipedia ? 0 : 1;
        if (aWiki !== bWiki) return aWiki - bWiki;
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, 3);
  }, [sortedVisible]);

  const handlePreset = (count) => {
    const candidateList = sortedVisible.length >= count ? sortedVisible : all;
    const ordered = orderStops(center, candidateList.slice(0, 14)).slice(0, count);
    plan.clear();
    plan.addMany(ordered);
    showToast(`Added ${ordered.length} stops to day plan`);
  };

  const planKm = plan.stops.reduce((sum, s) => sum + s.legKm, 0);
  const few = places.status === 'ready' && all.length > 0 && all.length < 4 && radius < WIDE;

  useEffect(() => {
    console.debug('[tourism]', { status: places.status, found: all.length, shown: sortedVisible.length, radius, kind: activeKind });
  }, [places.status, all.length, sortedVisible.length, radius, activeKind]);

  return (
    <div className="tx-root" data-mode={mode} data-format={format}>
      <header className="tx-head">
        <h2>{req.category.label} in {req.placeName}</h2>
        {places.status === 'ready' && all.length > 0 && (
          <p className="tx-muted">{all.length} places within {radius / 1000} km, nearest first</p>
        )}
        {/* in a narrow sidebar the plan sits below the list: this jumps to it */}
        {plan.stops.length > 0 && places.status === 'ready' && (
          <button className="tx-btn tx-jump" onClick={() => planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            Day plan: {plan.stops.length} {plan.stops.length === 1 ? 'stop' : 'stops'}
          </button>
        )}
      </header>

      <WeatherStrip
        lat={req.lat}
        lon={req.lon}
        indoorFirst={indoorFirst}
        onIndoorToggle={setIndoorFirst}
      />

      {places.status === 'loading' && <Skeleton />}
      {places.status === 'error' && <ErrorView error={places.error} onRetry={places.retry} />}
      {places.status === 'ready' && all.length === 0 && (
        <EmptyView place={req.placeName} category={req.category} radiusKm={radius / 1000}
                   onWiden={radius < WIDE ? () => setRadius(WIDE) : null} />
      )}

      {places.status === 'ready' && all.length > 0 && (
        <>
          <KindFilter places={all} kind={activeKind} onChange={setKind} />

          {/* Explore filter row and Sort toggle */}
          <div className="tx-controls-bar">
            <div className="tx-explore-row" role="group" aria-label="Explore filters">
              <span className="tx-control-label">Explore:</span>
              <button
                className={`tx-chip tx-explore-btn${exploreFilter === 'must_see' ? ' tx-on' : ''}`}
                aria-pressed={exploreFilter === 'must_see'}
                onClick={() => setExploreFilter((f) => (f === 'must_see' ? null : 'must_see'))}
              >
                Must-see
              </button>
              <button
                className={`tx-chip tx-explore-btn${exploreFilter === 'indoor' ? ' tx-on' : ''}`}
                aria-pressed={exploreFilter === 'indoor'}
                onClick={() => setExploreFilter((f) => (f === 'indoor' ? null : 'indoor'))}
              >
                Rainy day (indoor first)
              </button>
              <button
                className={`tx-chip tx-explore-btn${exploreFilter === 'walkable' ? ' tx-on' : ''}`}
                aria-pressed={exploreFilter === 'walkable'}
                onClick={() => setExploreFilter((f) => (f === 'walkable' ? null : 'walkable'))}
              >
                Walkable &lt; 2 km
              </button>
            </div>

            <div className="tx-sort-row" role="radiogroup" aria-label="Sort places">
              <span className="tx-control-label">Sort:</span>
              <button
                className={`tx-chip tx-sort-btn${sortBy === 'nearest' ? ' tx-on' : ''}`}
                role="radio"
                aria-checked={sortBy === 'nearest'}
                onClick={() => setSortBy('nearest')}
              >
                Nearest
              </button>
              <button
                className={`tx-chip tx-sort-btn${sortBy === 'notable' ? ' tx-on' : ''}`}
                role="radio"
                aria-checked={sortBy === 'notable'}
                onClick={() => setSortBy('notable')}
              >
                Most notable
              </button>
            </div>
          </div>

          {few && (
            <p className="tx-muted">Only {all.length} found nearby. <button className="tx-link tx-linkbtn" onClick={() => setRadius(WIDE)}>Search within 25 km</button></p>
          )}

          {sortedVisible.length === 0 && (
            <div className="tx-state">
              <p>No places match the active explore filter.</p>
              <button className="tx-btn" onClick={() => setExploreFilter(null)}>Clear explore filter</button>
            </div>
          )}

          {sortedVisible.length > 0 && (
            <>
              <TopPicks
                places={topPicks}
                plan={plan}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onHover={setHoveredId}
                onNotify={showToast}
              />

              <div className="tx-layout">
                <div className="tx-mapwrap">
                  <PlaceMap
                    center={center}
                    places={sortedVisible}
                    stops={plan.stops}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    onSelect={setSelectedId}
                  />
                </div>
                <div className="tx-list">
                  {sortedVisible.map((p) => (
                    <PlaceCard
                      key={p.id}
                      place={p}
                      inPlan={plan.has(p.id)}
                      selected={p.id === selectedId}
                      onToggle={plan.toggle}
                      onSelect={setSelectedId}
                      onHover={setHoveredId}
                      onNotify={showToast}
                    />
                  ))}
                </div>
                <aside className="tx-plan" ref={planRef}>
                  <h3>Day plan</h3>
                  <TripRoute
                    stops={plan.stops}
                    placeName={req.placeName}
                    center={center}
                    onRemove={plan.toggle}
                    onClear={plan.clear}
                    onPreset={handlePreset}
                    onNotify={showToast}
                  />
                </aside>
              </div>
            </>
          )}

          {/* Sticky day-plan bar in narrow containers */}
          {plan.stops.length > 0 && (
            <div className="tx-sticky-bar" role="region" aria-label="Day plan sticky summary">
              <span>
                <strong>Day plan:</strong> {plan.stops.length} {plan.stops.length === 1 ? 'stop' : 'stops'} · {formatKm(planKm)}
              </span>
              <button
                className="tx-btn tx-sticky-btn"
                onClick={() => planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                View plan ↑
              </button>
            </div>
          )}
        </>
      )}

      {toast && <div className="tx-toast" role="status">{toast}</div>}
      <footer className="tx-muted tx-foot">Places: Geoapify · Descriptions: Wikipedia & Wikimedia · Weather: Open-Meteo · Map: © OpenStreetMap contributors. Distances are straight lines.</footer>
    </div>
  );
}
