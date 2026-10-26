// Asks Geoapify whether each category name is valid. Run: npm run check:categories
import { CATEGORIES, DEFAULT_CATEGORY } from '../src/shared/categories.js';
const key = process.env.GEOAPIFY_API_KEY;
if (!key) { console.error('Set GEOAPIFY_API_KEY in src/backend/.dev.vars first.'); process.exit(1); }
for (const c of [...CATEGORIES, DEFAULT_CATEGORY]) {
  for (const name of c.geo) {
    const r = await fetch(`https://api.geoapify.com/v2/places?categories=${name}&filter=circle:2.3522,48.8566,3000&limit=1&apiKey=${key}`);
    console.log(r.ok ? 'OK      ' : `INVALID ${r.status}`, `${c.id.padEnd(10)} ${name}`);
  }
}
