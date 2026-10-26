// Single source of truth for categories, used by the server (whitelist) and the UI (query parsing).
// The client only ever sends a category *id*; the server maps it to Geoapify names.
// Verify the names with: npm run check:categories
//
// TO ADD A CATEGORY (or a query pattern): add one object below with an id, a label, a `test` regex
// (use \b word boundaries so "Newcastle" is not read as "castle") and the Geoapify names.
// Then add the same words to the regex in hyperdart.config.js so the platform triggers the component.
export const CATEGORIES = [
  { id: 'museum', label: 'Museums', test: /\b(museums?|galler(y|ies))\b/i, geo: ['entertainment.museum'] },
  { id: 'temple', label: 'Places of worship', test: /\b(temples?|mosques?|churche?s?|shrines?|gurudwaras?|places? of worship)\b/i, geo: ['tourism.sights.place_of_worship'] },
  { id: 'fort', label: 'Forts and palaces', test: /\b(forts?|castles?|palaces?)\b/i, geo: ['tourism.sights.fort', 'tourism.sights.castle'] },
  { id: 'monument', label: 'Monuments', test: /\b(monuments?|memorials?)\b/i, geo: ['tourism.sights.memorial'] },
  { id: 'viewpoint', label: 'Viewpoints', test: /\b(viewpoints?|lookouts?)\b/i, geo: ['tourism.attraction.viewpoint'] },
  { id: 'park', label: 'Parks', test: /\b(parks?|gardens?)\b/i, geo: ['leisure.park'] },
  { id: 'historic', label: 'Historic sites', test: /\b(historic(al)?|heritage)\b/i, geo: ['tourism.sights.archaeological_site', 'building.historic'] },
  // "Landmarks in Rome": landmarks and historic sites first.
  { id: 'landmark', label: 'Landmarks and historic sites', test: /\blandmarks?\b/i, geo: ['tourism.sights', 'building.historic'] },
];
export const DEFAULT_CATEGORY = { id: 'sights', label: 'Sights', geo: ['tourism.sights', 'tourism.attraction', 'entertainment.museum'] };

export const CATEGORY_BY_ID = Object.fromEntries([...CATEGORIES, DEFAULT_CATEGORY].map((c) => [c.id, c]));
export const detectCategory = (query = '') => CATEGORIES.find((c) => c.test.test(query)) ?? DEFAULT_CATEGORY;

// Whitelist lookup for the server: only own keys of a string id ("constructor" or "__proto__" are rejected).
export const getCategory = (id = 'sights') =>
  typeof id === 'string' && Object.hasOwn(CATEGORY_BY_ID, id) ? CATEGORY_BY_ID[id] : null;

// A result is never shown if any dotted part of any of its Geoapify categories is one of these
// (so both "accommodation.hotel" and "building.accommodation" are dropped).
export const EXCLUDED_GROUPS = ['catering', 'accommodation', 'commercial', 'service', 'healthcare', 'parking', 'public_transport', 'office'];

// First match wins: Geoapify category -> short label on a card.
export const KIND_LABELS = [
  ['entertainment.museum', 'Museum'], ['place_of_worship', 'Place of worship'],
  ['fort', 'Fort'], ['castle', 'Castle'], ['leisure.park', 'Park'], ['viewpoint', 'Viewpoint'],
  ['memorial', 'Monument'], ['archaeological', 'Archaeological site'], ['historic', 'Historic site'],
];
