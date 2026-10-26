import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// divIcon (not the default image marker) so no bundler asset paths can break.
const pin = (cls) => L.divIcon({ className: '', html: `<span class="tx-pin ${cls}"></span>`, iconSize: [20, 20], iconAnchor: [10, 10] });

export default function PlaceMap({ center, places, stops, selectedId, onSelect }) {
  const el = useRef(null), map = useRef(null), pins = useRef(null), route = useRef(null), byId = useRef(new Map());

  // 1. create the map once
  useEffect(() => {
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView([center.lat, center.lon], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap contributors',
    }).addTo(map.current);
    pins.current = L.layerGroup().addTo(map.current);
    route.current = L.layerGroup().addTo(map.current);
    // the component can be resized (sidebar <-> mainline), so keep Leaflet in sync
    const ro = new ResizeObserver(() => map.current?.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); map.current.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2a. one marker per place, recreated only when the list of places changes
  useEffect(() => {
    pins.current.clearLayers();
    byId.current.clear();
    places.forEach((p) => {
      const m = L.marker([p.lat, p.lon], { icon: pin(''), title: p.name, alt: p.name })
        .on('click', () => onSelect(p.id))
        .addTo(pins.current);
      byId.current.set(p.id, m);
    });
  }, [places]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2b. restyle (not recreate) on plan or selection change, so a marker used with the keyboard keeps focus
  const planKey = stops.map((s) => s.id).join();
  useEffect(() => {
    const planned = new Set(stops.map((s) => s.id));
    byId.current.forEach((m, id) => {
      m.setIcon(pin([planned.has(id) && 'plan', id === selectedId && 'sel'].filter(Boolean).join(' ')));
      m.setZIndexOffset(id === selectedId ? 1000 : 0);
    });
  }, [places, planKey, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. fit the view only when the list of places changes (not on every click)
  useEffect(() => {
    const pts = places.map((p) => [p.lat, p.lon]);
    if (pts.length) map.current.fitBounds(pts, { padding: [24, 24], maxZoom: 15 });
  }, [places]);

  // 4. route line: centre -> stops in visiting order
  useEffect(() => {
    route.current.clearLayers();
    if (stops.length)
      L.polyline([[center.lat, center.lon], ...stops.map((s) => [s.lat, s.lon])], { color: '#1f7a8c', weight: 4, dashArray: '2 8', lineCap: 'round' }).addTo(route.current);
  }, [stops, center.lat, center.lon]);

  // 5. selecting a card pans to its marker
  useEffect(() => {
    const m = byId.current.get(selectedId);
    if (m) map.current.panTo(m.getLatLng());
  }, [selectedId]);

  return <div ref={el} className="tx-map" role="region" aria-label="Map of places. The list has the same places." />;
}
