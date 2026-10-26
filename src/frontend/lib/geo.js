export function haversineKm(a, b) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const formatKm = (km) => (km < 1 ? `${Math.max(10, Math.round(km * 100) * 10)} m` : `${km.toFixed(1)} km`);

// Greedy nearest-neighbour order starting from `start`. Good enough for a day of stops.
export function orderStops(start, stops) {
  const left = [...stops], ordered = [];
  let here = start;
  while (left.length) {
    let best = 0;
    left.forEach((s, i) => { if (haversineKm(here, s) < haversineKm(here, left[best])) best = i; });
    const next = left.splice(best, 1)[0];
    ordered.push({ ...next, legKm: haversineKm(here, next) });
    here = next;
  }
  return ordered;
}
