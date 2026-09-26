# Weather Mood — Responsive Weather App

Frontend-only weather app + Vercel serverless proxy. Search any city or tap a popular-city chip. Shows temperature, humidity, wind, computed mood, raw JSON + syntax-highlighted formatted JSON.

## 1. Product spec (PM)

**User stories**
- As a user I can type a city → see current temp, humidity, wind speed.
- As a user I see 10 popular cities as chips → one click fetches weather.
- As a user I see a weather mood (Pleasant / Hot / Cold / Windy / Uncomfortable) with the rule visible.
- As a user I see raw JSON + formatted highlighted JSON, both copyable.
- As a user I get clear loading + error states on mobile and desktop.

**Mood thresholds (first match wins)**
1. `Windy` if `wind_kph > 30`
2. `Uncomfortable` if `humidity ≥ 80` OR (`temp_c ≥ 28` AND `humidity ≥ 70`)
3. `Hot` if `temp_c ≥ 30`
4. `Cold` if `temp_c ≤ 10`
5. `Pleasant` otherwise

## 2. Architecture

```
Browser (index.html + styles.css + app.js, static, responsive)
   │  GET /api/weather?q=London
   ▼
Vercel Function (api/weather.js, Node) — reads WEATHER_API_KEY from server env
   │  GET http://api.weatherapi.com/v1/current.json?key=KEY&q=city&aqi=no
   ▼
WeatherAPI.com
```

Why a proxy: the API key never ships to the browser. Frontend has no hardcoded secret. Direct calls only exist as a local-dev fallback (`VITE_WEATHER_API_KEY`).

**Endpoint contract**
- `GET /api/weather?q={city}` → `200` WeatherAPI JSON passthrough
- `400` missing `q` · `405` non-GET · `500` missing server key · `4xx/5xx` upstream error passthrough
- Expected upstream shape: `{ location: { name, region, country, lat, lon, localtime }, current: { temp_c, temp_f, humidity, wind_kph, wind_mph, condition: { text, icon } } }`
- Loading: spinner + disabled button. Errors render in `#status`.

## 3. Env & secrets (kept in `.env`, never in source)

`.env` (gitignored) holds:
```
WEATHER_API_KEY=...        # server-side, used by /api/weather.js
VITE_WEATHER_API_KEY=...   # local direct-fallback only
VERCEL_TOKEN=...           # CLI deploys
```
`.env.example` is the committed template. For Vercel cloud: Dashboard → Project → Settings → Environment Variables → add `WEATHER_API_KEY` (Production + Preview), then redeploy.

## 4. Run locally

```powershell
cd weather-app
npx serve . -l 3000
# open http://localhost:3000
# Note: /api/weather needs `vercel dev` for the proxy; static serve uses direct fallback only if VITE key injected.
vercel dev   # full local parity (proxy + static), reads .env
```

## 5. Deploy (Vercel)

```powershell
cd weather-app
vercel --token $env:VERCEL_TOKEN --yes          # preview
vercel --prod --token $env:VERCEL_TOKEN --yes   # production
```
Or connect the folder to GitHub → Vercel → Import → set `WEATHER_API_KEY` env → Deploy (no build step needed; static + functions).

`vercel.json` sets security headers + function timeout. No framework build required.
