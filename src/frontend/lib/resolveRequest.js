import { detectCategory } from '../../shared/categories.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// null and '' would become 0 with Number(), which is a real place in the sea: treat them as missing.
const coord = (v) => (v == null || String(v).trim() === '' ? NaN : Number(v));

// The category words are looked for in the query WITHOUT the place name, so "Newcastle" is not a
// castle, "Fort Worth" is not a fort and "Park City" is not a park.
const withoutPlace = (query, words) =>
  words.filter(Boolean).sort((a, b) => b.length - a.length)
    .reduce((q, w) => q.replace(new RegExp(escapeRe(String(w)), 'ig'), ' '), query);

// searchData (array or object) -> what the component should do. Pure, easy to test.
export function resolveRequest(searchData) {
  const data = Array.isArray(searchData) ? searchData[0] : searchData;
  const query = data?.query ?? '';
  const entities = Array.isArray(data?.entities) ? data.entities : data?.entities ? [data.entities] : [];
  const entity = entities.find((e) => e?.collectionType === 'HD_LOCATION' && e?.entityInfo?.geo);
  const geo = entity?.entityInfo?.geo;
  const category = detectCategory(withoutPlace(query, [entity?.word, geo?.city]));
  const lat = coord(geo?.lat), lon = coord(geo?.long);

  if (!geo || !Number.isFinite(lat) || !Number.isFinite(lon)) return { kind: 'no-place', query, category };
  return { kind: 'place', query, category, placeName: geo.city || entity.word, country: geo.country, lat, lon, tz: geo.tz };
}
