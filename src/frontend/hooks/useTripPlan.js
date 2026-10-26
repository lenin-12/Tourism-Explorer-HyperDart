import { useEffect, useMemo, useState } from 'react';
import { orderStops } from '../lib/geo';

const valid = (p) => p && typeof p.id === 'string' && Number.isFinite(p.lat) && Number.isFinite(p.lon);

// Saved stops per destination in localStorage; the visiting order is always recomputed.
// The key uses the coordinates (not the name), so "Paris" in France and in Texas keep separate plans.
export function useTripPlan(center) {
  const key = `tx-plan:${center.lat.toFixed(2)},${center.lon.toFixed(2)}`;
  const [saved, setSaved] = useState([]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      setSaved(Array.isArray(stored) ? stored.filter(valid) : []); // never trust stored data
    } catch { setSaved([]); }
  }, [key]);
  const write = (next) => {
    setSaved(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage full or blocked: plan still works in memory */ }
  };
  const stops = useMemo(() => orderStops(center, saved), [saved, center]);
  return {
    stops,
    has: (id) => saved.some((s) => s.id === id),
    toggle: (p) => write(saved.some((s) => s.id === p.id) ? saved.filter((s) => s.id !== p.id) : [...saved, p]),
    addMany: (list) => write([...saved, ...list.filter((p) => !saved.some((s) => s.id === p.id))]),
    clear: () => write([]),
  };
}
