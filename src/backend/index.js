import express from 'express'
import cors from 'cors'
import { httpServerHandler } from 'cloudflare:node';
import { env } from 'cloudflare:workers';
import { getCategory } from '../shared/categories.js';

// Create Express app
const app = express();

// Middleware: JSON body parsing
app.use(express.json())


const devDomain = env.DEV_DOMAIN
const stagingDomain = env.STAGING_DOMAIN
const prodDomain = env.PROD_DOMAIN



// Middleware: CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // If your frontend runs on a different local port (e.g. 5174),
  // add it here like: 'http://localhost:5174'

  // ⚠️ DEV_DOMAIN and PROD_DOMAIN are injected via Cloudflare env vars.
  // These values are available at runtime once your component is
  // published and approved. Do NOT remove them — they are required
  // for deployed environments to work correctly.
  devDomain,
  stagingDomain,
  prodDomain
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))


// Placeholder for DB access
const getDB = () => env.DB

// In order to use table, it shoule be created using
// wrangler d1 execute my-db --local --command "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE);"
// Here my-db refers to the database name defined in wrangler.jsonc
// The create table command should also be part of schema.jsonc in order to create tables remotely


// ---------------------------------------------------------------------------
// Places proxy. The Geoapify key is a Worker secret (env.GEOAPIFY_API_KEY): locally it comes
// from src/backend/.dev.vars. NEVER put it in wrangler.jsonc, that file is published in the package.
// ---------------------------------------------------------------------------
const cache = new Map() // cacheKey -> { at, body }
const TTL = 5 * 60 * 1000
const fail = (res, status, error) => res.status(status).json({ error })

app.get('/api/places', async (req, res) => {
  const key = env.GEOAPIFY_API_KEY
  if (!key) return fail(res, 500, 'server_misconfigured')

  // a missing or empty value must not silently become 0,0
  const num = (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN)
  const lat = num(req.query.lat), lon = num(req.query.lon)
  if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) return fail(res, 400, 'bad_coordinates')
  const category = getCategory(req.query.category) // whitelist of known ids: raw Geoapify names are never accepted
  if (!category) return fail(res, 400, 'unknown_category')
  const radius = Math.min(Math.max(Number(req.query.radius) || 8000, 500), 30000)

  const cacheKey = [lat.toFixed(3), lon.toFixed(3), radius, category.id].join('|')
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < TTL) return res.json(hit.body)

  const url = new URL('https://api.geoapify.com/v2/places')
  url.search = new URLSearchParams({
    categories: category.geo.join(','),
    filter: `circle:${lon},${lat},${radius}`, // Geoapify wants longitude first
    bias: `proximity:${lon},${lat}`,
    limit: '20',
    apiKey: key,
  })
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(9000) })
    if (r.status === 429) return fail(res, 429, 'rate_limited')
    // 400/401/403 mean OUR request or key is wrong: retrying will not help, so say so.
    if ([400, 401, 403].includes(r.status)) return fail(res, 502, 'upstream_rejected')
    if (!r.ok) return fail(res, 502, 'upstream_error')
    const body = await r.json()
    if (cache.size >= 200) cache.delete(cache.keys().next().value) // keep memory bounded
    cache.set(cacheKey, { at: Date.now(), body })
    res.json(body)
  } catch {
    fail(res, 502, 'upstream_unreachable')
  }
})

// Route: Basic Test
app.get('/api/message', (req, res) => {
  const db = getDB();
  console.log('db', db)
  res.json({ message: 'Hello from Express on Workers!' })
})

// Route: Dynamic Hello
app.get('/api/hello/:name', (req, res) => {
  const environment = global.ENVIRONMENT || 'unknown'
  res.json({ message: `Hello, ${req.params.name} ${environment}` })
})



// Route: Insert Data into D1
// app.post('/api/users', async (req, res) => {
//   console.log('reqq', req.body)
//   const { name, email } = req.body

//   if (!name || !email) {
//     return res.status(400).json({ error: 'Name and email are required' })
//   }

//   try {
//     const db = getDB();
//     console.log('db', db)
//     await db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
//       .bind(name, email)
//       .run()

//     res.status(201).json({ success: true, message: 'User added successfully' })
//   } catch (err) {
//     res.status(500).json({ error: 'Database error', details: err.message })
//   }
// })

// Route: Fetch All Users
// app.get('/api/users', async (req, res) => {
//   try {
//     const db = getDB()
//     const { results } = await db.prepare('SELECT * FROM users').all()
//     res.json(results)
//   } catch (err) {
//     res.status(500).json({ error: 'Database error', details: err.message })
//   }
// })

// Always answer in JSON: Express's default handler sends an HTML page (with a stack trace outside production).
app.use((err, req, res, next) => {
  if (err?.message === 'Not allowed by CORS') return fail(res, 403, 'origin_not_allowed')
  console.error('[tourism] server error', err?.message)
  fail(res, 500, 'server_error')
})

app.listen(3000)
export default httpServerHandler({ port: 3000 })
