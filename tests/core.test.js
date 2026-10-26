import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCategory, CATEGORY_BY_ID, getCategory } from '../src/shared/categories.js';
import { resolveRequest } from '../src/frontend/lib/resolveRequest.js';
import { normalizePlaces, safeUrl } from '../src/frontend/lib/normalizePlace.js';
import { haversineKm, orderStops, formatKm } from '../src/frontend/lib/geo.js';

const loc = (extra = {}) => ({ collectionType: 'HD_LOCATION', word: 'Delhi', entityInfo: { geo: { lat: 28.6, long: 77.2, city: 'Delhi', ...extra } } });
const feat = (name, categories, lat, lon, id) => ({ properties: { name, categories, lat, lon, place_id: id } });

test('detects the category from the query', () => {
  assert.equal(detectCategory('museums in Delhi').id, 'museum');
  assert.equal(detectCategory('best forts near Jaipur').id, 'fort');
  assert.equal(detectCategory('monuments in Rome').id, 'monument');
  assert.equal(detectCategory('things to do in Paris').id, 'sights');
});

test('every category has Geoapify names and the server whitelist knows it', () => {
  for (const c of Object.values(CATEGORY_BY_ID)) assert.ok(c.geo.length > 0, c.id);
});

test('resolveRequest accepts an object or an array', () => {
  const x = { query: 'museums in Delhi', entities: [loc()] };
  assert.equal(resolveRequest(x).lat, 28.6);
  assert.equal(resolveRequest([x]).lon, 77.2);
  assert.equal(resolveRequest(x).category.id, 'museum');
});

test('resolveRequest reports no-place instead of guessing', () => {
  assert.equal(resolveRequest({ query: 'museums', entities: [] }).kind, 'no-place');
  assert.equal(resolveRequest(undefined).kind, 'no-place');
  assert.equal(resolveRequest({ query: 'x', entities: [{ collectionType: 'HD_PACKAGES', entityInfo: {} }] }).kind, 'no-place');
});

test('normalizePlaces drops hotels, restaurants, shops and unnamed results', () => {
  const out = normalizePlaces([
    feat('Fort', ['tourism.sights.fort'], 28.61, 77.2, 'a'),
    feat('Hotel', ['accommodation.hotel'], 28.6, 77.2, 'b'),
    feat('Diner', ['catering.restaurant'], 28.6, 77.2, 'c'),
    feat('Mall', ['commercial.shopping_mall'], 28.6, 77.2, 'd'),
    feat('', ['tourism.sights'], 28.6, 77.2, 'e'),
  ], { lat: 28.6, lon: 77.2 });
  assert.deepEqual(out.map((p) => p.name), ['Fort']);
});

test('same name within 300 m is a duplicate; far apart is kept', () => {
  const out = normalizePlaces([
    feat('Jain Temple', ['tourism.sights'], 28.6, 77.2, 'a'),
    feat('Jain Temple', ['tourism.sights'], 28.6005, 77.2005, 'b'),
    feat('Jain Temple', ['tourism.sights'], 28.7, 77.3, 'c'),
  ], { lat: 28.6, lon: 77.2 });
  assert.equal(out.length, 2);
});

test('places are sorted nearest first and carry a distance', () => {
  const out = normalizePlaces([feat('Far', ['tourism.sights'], 28.7, 77.2, 'a'), feat('Near', ['tourism.sights'], 28.601, 77.2, 'b')], { lat: 28.6, lon: 77.2 });
  assert.equal(out[0].name, 'Near');
  assert.ok(out[1].distanceKm > out[0].distanceKm);
});

test('haversine and formatting', () => {
  assert.equal(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 0 }), 0);
  assert.ok(Math.abs(haversineKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }) - 111.19) < 0.5);
  assert.equal(formatKm(0.4), '400 m');
  assert.equal(formatKm(2.345), '2.3 km');
});

test('orderStops walks to the nearest next stop and reports leg distances', () => {
  const stops = [{ id: 'far', lat: 0, lon: 0.3 }, { id: 'near', lat: 0, lon: 0.1 }, { id: 'mid', lat: 0, lon: 0.2 }];
  const out = orderStops({ lat: 0, lon: 0 }, stops);
  assert.deepEqual(out.map((s) => s.id), ['near', 'mid', 'far']);
  assert.ok(out.every((s) => s.legKm > 0));
});

// ---- added after review ----
const place = (city, query) => resolveRequest({ query, entities: [loc({ city })].map((e) => ({ ...e, word: city })) });

test('the place name is never read as a category', () => {
  assert.equal(place('Newcastle', 'things to do in Newcastle').category.id, 'sights');
  assert.equal(place('Fortaleza', 'things to do in Fortaleza').category.id, 'sights');
  assert.equal(place('Fort Worth', 'places to visit in Fort Worth').category.id, 'sights');
  assert.equal(place('Park City', 'things to do in Park City').category.id, 'sights');
  assert.equal(place('Fort Worth', 'museums in Fort Worth').category.id, 'museum'); // the real category still works
});

test('category words need word boundaries, and landmarks have their own category', () => {
  assert.equal(detectCategory('things to do in Newcastle').id, 'sights');
  assert.equal(detectCategory('landmarks in Rome').id, 'landmark');
  assert.equal(detectCategory('mosques in Istanbul').id, 'temple');
  assert.equal(detectCategory('palaces near Udaipur').id, 'fort');
});

test('a missing or empty coordinate is no-place, not 0,0', () => {
  const bad = (geo) => resolveRequest({ query: 'x', entities: [{ collectionType: 'HD_LOCATION', word: 'X', entityInfo: { geo } }] }).kind;
  assert.equal(bad({ lat: null, long: 10 }), 'no-place');
  assert.equal(bad({ lat: '', long: '' }), 'no-place');
  assert.equal(bad({ lat: 10 }), 'no-place');
});

test('the server whitelist only knows real category ids', () => {
  assert.equal(getCategory('museum').id, 'museum');
  assert.equal(getCategory().id, 'sights');
  for (const bad of ['constructor', '__proto__', 'toString', 'tourism.sights', ['museum'], 42]) assert.equal(getCategory(bad), null, String(bad));
});

test('hotels are dropped even when only a nested building category says so', () => {
  const out = normalizePlaces([
    feat('Old Palace Hotel', ['building.accommodation', 'building.historic'], 28.6, 77.2, 'a'),
    feat('Heritage Cafe', ['building.catering', 'building.historic'], 28.6, 77.2, 'b'),
    feat('Old Bazaar Shop', ['building.commercial', 'building.historic'], 28.6, 77.2, 'c'),
    feat('Red Fort', ['tourism.sights.fort', 'building.historic'], 28.61, 77.2, 'd'),
  ], { lat: 28.6, lon: 77.2 });
  assert.deepEqual(out.map((p) => p.name), ['Red Fort']);
});

test('only safe website links are kept', () => {
  assert.equal(safeUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(safeUrl('www.example.com'), 'https://www.example.com/');
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('data:text/html,hi'), null);
  assert.equal(safeUrl(''), null);
  assert.equal(safeUrl(undefined), null);
});

test('official trigger patterns still match, and the extended ones too', async () => {
  const { default: config } = await import('../hyperdart.config.js');
  const match = (q) => config.query_format.regex.some((r) => new RegExp(`^${r}$`, 'i').test(q));
  for (const q of ['Tourist attractions in HD_LOCATION__CITIES', 'things to do in HD_LOCATION', 'best museums near HD_LOCATION__CITIES',
    'landmarks in HD_LOCATION', 'sights near HD_LOCATION', 'mosques in HD_LOCATION', 'what to see in HD_LOCATION']) assert.ok(match(q), q);
  assert.ok(!match('pizza in HD_LOCATION'));
});
