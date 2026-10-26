import { EXCLUDED_GROUPS, KIND_LABELS } from '../../shared/categories.js';
import { haversineKm } from './geo.js';

export function safeUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
}

const isExcluded = (cats) => cats.some((c) => String(c).split('.').some((part) => EXCLUDED_GROUPS.includes(part)));

const kindOf = (cats) => {
  for (const [needle, label] of KIND_LABELS) if (cats.some((c) => c.includes(needle))) return label;
  return 'Sight';
};

export function normalizePlaces(features, center) {
  const out = [];
  for (const f of features ?? []) {
    const p = f?.properties ?? {};
    const cats = p.categories ?? [];
    const name = String(p.name ?? '').trim();
    const lat = Number(p.lat ?? f?.geometry?.coordinates?.[1]);
    const lon = Number(p.lon ?? f?.geometry?.coordinates?.[0]);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (isExcluded(cats)) continue; // hotels, restaurants and shops are never results
    const nameKey = name.toLowerCase();
    if (out.filter((o) => o.nameKey === nameKey).length >= 2 || out.some((o) => o.nameKey === nameKey && haversineKm(o, { lat, lon }) < 0.3)) continue;
    const raw = p.datasource?.raw ?? {};
    out.push({
      id: String(p.place_id ?? `${nameKey}|${lat.toFixed(4)}|${lon.toFixed(4)}`),
      nameKey, name, kind: kindOf(cats), lat, lon,
      address: p.formatted || p.address_line2 || null,
      website: safeUrl(p.website || raw.website),
      hours: p.opening_hours || raw.opening_hours || null,
      wikipedia: raw.wikipedia || null, // "en:Eiffel Tower": used to fetch a real description
      distanceKm: haversineKm(center, { lat, lon }),
    });
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}
