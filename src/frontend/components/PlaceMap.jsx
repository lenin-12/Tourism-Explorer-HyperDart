import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getKindKey } from './KindIcons';

const createPinIcon = ({ kindKey, planNum, selected, hovered, title }) => {
  const cls = [
    'tx-pin',
    planNum && 'tx-pin-plan',
    selected && 'tx-pin-sel',
    hovered && 'tx-pin-hover',
  ].filter(Boolean).join(' ');
  const numHtml = planNum ? `<span class="tx-pin-num">${planNum}</span>` : '';
  const size = selected ? 24 : (hovered ? 24 : (planNum ? 22 : 18));
  const half = Math.round(size / 2);

  return L.divIcon({
    className: '',
    html: `<span class="${cls}" data-kind="${kindKey}" title="${title ? String(title).replace(/"/g, '&quot;') : ''}">${numHtml}</span>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
};

export default function PlaceMap({ center, places, stops, selectedId, hoveredId, onSelect }) {
  const el = useRef(null), map = useRef(null), pins = useRef(null), route = useRef(null), byId = useRef(new Map());

  // 1. create the map once
  useEffect(() => {
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView([center.lat, center.lon], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap contributors',
    }).addTo(map.current);
    pins.current = L.layerGroup().addTo(map.current);
    route.current = L.layerGroup().addTo(map.current);
    const ro = new ResizeObserver(() => map.current?.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); map.current.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2a. one marker per place, recreated only when the list of places changes
  useEffect(() => {
    pins.current.clearLayers();
    byId.current.clear();
    places.forEach((p) => {
      const kindKey = getKindKey(p.kind);
      const m = L.marker([p.lat, p.lon], {
        icon: createPinIcon({ kindKey, planNum: null, selected: false, hovered: false, title: p.name }),
        title: p.name,
        alt: p.name,
      })
        .on('click', () => onSelect(p.id))
        .addTo(pins.current);
      byId.current.set(p.id, { marker: m, place: p });
    });
  }, [places]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2b. restyle (not recreate) on plan, selection or hover change
  const planKey = stops.map((s) => s.id).join();
  useEffect(() => {
    const stopIndexMap = new Map();
    stops.forEach((s, idx) => stopIndexMap.set(s.id, idx + 1));

    byId.current.forEach(({ marker, place }, id) => {
      const kindKey = getKindKey(place.kind);
      const planNum = stopIndexMap.get(id) ?? null;
      const isSelected = id === selectedId;
      const isHovered = id === hoveredId;

      marker.setIcon(createPinIcon({
        kindKey,
        planNum,
        selected: isSelected,
        hovered: isHovered,
        title: `${place.name}${planNum ? ` (Stop ${planNum})` : ''}`,
      }));

      marker.setZIndexOffset(isSelected ? 1000 : (isHovered ? 900 : (planNum ? 500 : 0)));
    });
  }, [places, planKey, selectedId, hoveredId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. fit bounds on places change
  useEffect(() => {
    const pts = places.map((p) => [p.lat, p.lon]);
    if (pts.length) map.current.fitBounds(pts, { padding: [24, 24], maxZoom: 15 });
  }, [places]);

  // 4. route polyline
  useEffect(() => {
    route.current.clearLayers();
    if (stops.length) {
      L.polyline(
        [[center.lat, center.lon], ...stops.map((s) => [s.lat, s.lon])],
        { color: '#17677a', weight: 4, dashArray: '2 8', lineCap: 'round' }
      ).addTo(route.current);
    }
  }, [stops, center.lat, center.lon]);

  // 5. selecting a card flies to its marker
  useEffect(() => {
    const entry = byId.current.get(selectedId);
    if (entry?.marker && map.current) {
      map.current.flyTo(entry.marker.getLatLng(), Math.max(map.current.getZoom(), 14), { duration: 0.7 });
    }
  }, [selectedId]);

  return <div ref={el} className="tx-map" role="region" aria-label="Map of places. The list has the same places." />;
}
