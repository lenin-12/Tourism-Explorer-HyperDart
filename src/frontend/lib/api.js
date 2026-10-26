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
