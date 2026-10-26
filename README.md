# Tourism Explorer (hyperDart component)

Answers "things to do in Paris", "museums in Delhi", "forts near Jaipur" with real places near the searched city, a synced map, weather, and an editable day plan.

## Idea and design decisions
- **Answer first, then dig deeper.** Nearest places come first. Filter chips, map, weather and a day plan are one click away.
- **Day plan as a route ribbon.** Add stops and they are ordered by nearest next stop. Distances are labelled "straight line" because they are not road distances.
- **Never invent.** Descriptions and photos come from Wikipedia only when the place has a Wikipedia tag, otherwise nothing is shown. Weather separates "Now" from "Forecast"; if it fails, one quiet line says it is unavailable and the rest keeps working.
- **Honest states.** Loading, empty (with "search within 25 km"), few results, rate limit, outage and "setup problem" are different messages. A setup problem hides the useless retry button.
- **Sidebar and mainline.** Layout uses container queries, so it adapts to the width it is given. Light/dark follows the platform theme (`useTheme().palette.mode`).

## What it handles (from the problem statement)
| Query | Result |
|---|---|
| Things to do in Paris, tourist attractions in NYC, sights near Tokyo | Sights nearest the city centre first |
| Landmarks in Rome | Landmarks and historic sites |
| Museums in Delhi, forts near Jaipur, temples/mosques in Kyoto | Only that kind of place |
| A place with no results | A clear "nothing found", with a 25 km search and a note that it may be a map-data gap |
The category is read from the query **without the place name**, so Newcastle is not a castle and Fort Worth is not a fort.

## Add a query pattern or category (2 minutes)
1. `src/shared/categories.js`: add one object (`id`, `label`, a `test` regex with `\b` word boundaries, and the Geoapify names). The server whitelist and the UI both pick it up.
2. `hyperdart.config.js`: add the same words to the second regex so the platform triggers the component.
3. `resource.json`: add the id to the `categories` enum so the platform AI maps it.
4. Add a line to `tests/core.test.js` and run `npm test`.

## Structure (official React + Vite + Express template)
```
src/shared/categories.js     categories: parse the query (UI) and whitelist (backend)
src/backend/index.js         Express on Cloudflare Workers: /api/places proxy, key from env, 5-min cache
src/frontend/index.jsx       withHD wrapper (template, unchanged)
src/frontend/NewComponent.jsx   adapter: platform props -> TourismExplorer
src/frontend/TourismExplorer.jsx   the component
src/frontend/lib/            resolveRequest, normalizePlace, geo, api   (pure, tested)
src/frontend/hooks/          useAsync (only async state machine), useTripPlan (localStorage)
src/frontend/components/     PlaceCard, PlaceMap, KindFilter, TripRoute, WeatherStrip, StateViews, ErrorBoundary
tests/ , tools/              node --test suite; category checker
```
Never modified: `src/sandbox`, `vite.config.js`, `index.html`, `scripts/`. Debug: filter the console for `[tourism]`.

## Run it locally (two terminals)
```
npm install
cd src/backend && npm install
copy src/backend/.dev.vars.example to src/backend/.dev.vars and add your Geoapify key (gitignored)

# terminal 1
cd src/backend && npm start        # wrangler dev, port 3001
# terminal 2
npm start                          # sandbox, port 5173
```
Other commands: `npm test`, `npm run check:categories` (asks Geoapify whether each category name is valid), `npm run build`.

## Publish
`npm run build`, then `cd src/backend && npm run build`, then `npm version patch` and a plain `npm publish` (validation runs on prepublish).

## Safety and robustness
- Hotels, restaurants and shops are dropped by any dotted part of the Geoapify category (`accommodation`, `catering`, `commercial`, `service`, and a few never-attractions), so nested ones like `building.accommodation` are caught too.
- OpenStreetMap is editable by anyone: website links are kept only if http(s), and the Wikipedia language prefix must look like a language code.
- The backend takes a category **id** only (own keys of a whitelist), rejects missing or empty coordinates, caps its cache, and always answers in JSON.
- Every network call has a 10 s timeout and a typed error; an `ErrorBoundary` keeps a render error from blanking the frame.
- The day plan is saved per location (coordinates, not name) and stored data is validated before use.

## Secrets warning
`wrangler.jsonc` is published inside the package, so the Geoapify key must never go in its `vars`. Locally the key lives in `.dev.vars`. How the deployed worker receives it must be confirmed with the hyperDart organizers.

## Data sources and libraries
Geoapify Places (via the backend), Wikipedia REST summaries, Open-Meteo, OpenStreetMap tiles. React, Leaflet, Express, MUI (platform theme), Wrangler.

## AI tools used
- Claude: designed and wrote the component, the backend route and the tests.
- A separate prototype generated with ChatGPT: ideas taken were the category whitelist, tests, and README checklist.


## Known limits
Straight-line distances only. Hours and descriptions appear only when the data has them. Geoapify coverage varies by region, so an empty result may be a data gap.

## Submission checklist
- [ ] `github` and `demovideo` set in `hyperdart.config.js` (repo root URL, YouTube link)
- [ ] Sidebar and mainline checked, light and dark
- [ ] Geoapify secret setup for the deployed worker confirmed
- [ ] Package created in Partner Portal; plain `npm publish`
