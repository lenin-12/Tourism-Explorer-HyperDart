// All network calls live here. Components never call fetch.

export class ApiError extends Error {
  constructor(type, message) { super(message); this.type = type; } // 'config' | 'rate' | 'http' | 'network' | 'timeout'
}

// One timeout for every call, built by hand so it also works on browsers without AbortSignal.any.
async function getJson(url, signal) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, 10000);
  const onAbort = () => ctrl.abort();
  if (signal?.aborted) ctrl.abort(); else signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (res.status === 429) throw new ApiError('rate', 'Too many requests');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // Our own server says the key or request is wrong: retrying cannot fix that.
      if (['server_misconfigured', 'upstream_rejected'].includes(body.error)) throw new ApiError('config', body.error);
      throw new ApiError('http', body.error ?? `Service answered ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (timedOut) throw new ApiError('timeout', 'The service took too long');
    if (e.name === 'AbortError') throw e; // cancelled by us (new search): not an error to show
    if (e instanceof SyntaxError) throw new ApiError('http', 'The service sent an unreadable answer');
    throw new ApiError('network', 'Could not reach the service');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export const fetchPlaces = ({ apiUrl, lat, lon, category, radius = 8000 }, signal) => {
  const q = new URLSearchParams({ lat, lon, radius, category: category.id });
  console.debug('[tourism] places', q.toString());
  return getJson(`${apiUrl}/api/places?${q}`, signal);
};

// Real description + photo from Wikipedia, only when the place has a wikipedia tag ("en:Eiffel Tower").
// The tag comes from OpenStreetMap (editable by anyone), so the language part must look like a language code
// before it is used as a host name, and disambiguation pages are never shown as a description.
export async function fetchWiki(tag, signal) {
  const none = { text: null, image: null };
  const i = String(tag).indexOf(':');
  const lang = i > 0 ? tag.slice(0, i) : '';
  const title = tag.slice(i + 1).trim();
  if (!/^[a-z]{2,12}(-[a-z]{2,12}){0,2}$/i.test(lang) || !title) return none;
  const j = await getJson(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`, signal);
  if (j.type === 'disambiguation') return none;
  return { text: j.extract || null, image: j.thumbnail?.source || null };
}

export const fetchWeather = ({ lat, lon }, signal) =>
  getJson('https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
    latitude: lat, longitude: lon, timezone: 'auto', forecast_days: 7,
    current: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  }), signal);

const photoCache = new Map();

function resolveCommonsUrl(commonsTag) {
  if (!commonsTag) return null;
  let filename = String(commonsTag).trim();
  filename = filename.replace(/^(File|Image|Category):/i, '').trim();
  if (!filename) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename.replace(/ /g, '_'))}?width=600`;
}

function matchesPlaceName(title, placeName) {
  if (!title || !placeName) return false;
  const cleanTitle = title.replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '').toLowerCase();
  const words = (placeName.toLowerCase().match(/\b[a-z0-9]{4,}\b/gi) || []);
  if (words.length === 0) {
    return cleanTitle.includes(placeName.toLowerCase().trim());
  }
  return words.some((w) => cleanTitle.includes(w));
}

async function geosearchCommons(lat, lon, placeName, signal) {
  try {
    const q = new URLSearchParams({
      action: 'query',
      generator: 'geosearch',
      ggscoord: `${lat}|${lon}`,
      ggsradius: '100',
      ggsnamespace: '6',
      ggslimit: '10',
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: '600',
      format: 'json',
      origin: '*',
    });
    const res = await getJson(`https://commons.wikimedia.org/w/api.php?${q.toString()}`, signal);
    const pages = Object.values(res?.query?.pages ?? {});
    for (const page of pages) {
      if (matchesPlaceName(page.title, placeName)) {
        const thumb = page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url;
        if (thumb) return thumb;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchPlacePhoto(place, signal) {
  if (!place?.id) return { image: null, credit: null };
  if (photoCache.has(place.id)) return photoCache.get(place.id);

  // 1. Existing Wikipedia photo
  if (place.wikipedia) {
    try {
      const wiki = await fetchWiki(place.wikipedia, signal);
      if (wiki?.image) {
        const res = { image: wiki.image, credit: null, description: wiki.text };
        photoCache.set(place.id, res);
        return res;
      }
    } catch {
      // proceed silently to next fallback
    }
  }

  // 2. OSM tags from datasource.raw: image or wikimedia_commons
  if (place.osmImage) {
    const res = { image: place.osmImage, credit: null };
    photoCache.set(place.id, res);
    return res;
  }
  if (place.osmCommons) {
    const commonsUrl = resolveCommonsUrl(place.osmCommons);
    if (commonsUrl) {
      const res = { image: commonsUrl, credit: null };
      photoCache.set(place.id, res);
      return res;
    }
  }

  // 3. Wikimedia Commons geosearch near place coordinates
  if (Number.isFinite(place.lat) && Number.isFinite(place.lon)) {
    const geoThumb = await geosearchCommons(place.lat, place.lon, place.name, signal);
    if (geoThumb) {
      const res = { image: geoThumb, credit: null };
      photoCache.set(place.id, res);
      return res;
    }
  }

  // 4. Coloured icon placeholder fallback
  const res = { image: null, credit: null };
  photoCache.set(place.id, res);
  return res;
}
