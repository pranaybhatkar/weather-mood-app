# 🌤️ Weather Mood — Responsive Weather Web App

A responsive, frontend-only weather app with a live **weather mood engine**, raw + syntax-highlighted JSON views, and a secure serverless API proxy. Search any city or tap a popular-city chip and get temperature, humidity, wind speed, and a computed mood in under a second.

**🔗 Live demo:** https://weather-mood-app-theta.vercel.app
**📦 Source:** https://github.com/pranaybhatkar/weather-mood-app
**📐 Diagrams:** [`docs/diagrams/architecture.html`](docs/diagrams/architecture.html) (system map) · [`docs/diagrams/sequence.html`](docs/diagrams/sequence.html) (request lifecycle)

---

## 1. What it does

- **City search** — type any city name and fetch its current weather.
- **10 popular-city chips** — London, New York, Tokyo, Paris, Sydney, Mumbai, Dubai, Singapore, Berlin, Toronto. One click fetches instantly.
- **Current conditions card** — temperature (°C/°F), humidity (%), wind speed (kph/mph), condition text + icon, location and local time.
- **Weather mood badge** — Pleasant, Hot, Cold, Windy, or Uncomfortable, computed from transparent thresholds shown right in the UI.
- **Raw JSON + formatted JSON** — the exact API response as compact raw text, plus a pretty-printed, syntax-highlighted, copyable view.
- **Loading & error states** — spinner + disabled button while fetching; friendly errors for unknown cities, network failures, or misconfiguration.
- **Fully responsive** — mobile-first CSS grid that collapses to a single column on small screens; deep-link support (`?q=London`).

### Mood thresholds (first match wins)

| # | Mood | Rule |
|---|------|------|
| 1 | Windy | `wind_kph > 30` |
| 2 | Uncomfortable | `humidity ≥ 80%` OR (`temp_c ≥ 28` AND `humidity ≥ 70%`) |
| 3 | Hot | `temp_c ≥ 30` |
| 4 | Cold | `temp_c ≤ 10` |
| 5 | Pleasant | anything else |

---

## 2. How we built it

1. **Scoped the product** — defined user stories (search, chips, metrics, mood, JSON views, loading/error states) before writing code.
2. **Chose the simplest deployable architecture** — zero-framework static frontend (HTML/CSS/vanilla JS) + one Vercel serverless function as an API proxy, so there is no build step and nothing to break.
3. **Designed the mood engine** — picked non-overlapping thresholds with a documented priority order, then unit-tested the boundary cases (e.g. 30 °C, 80 % humidity, 30 kph wind).
4. **Hid the API key server-side** — the browser never talks to WeatherAPI directly in production; it calls `/api/weather`, which injects the key from a server environment variable.
5. **Verified end-to-end** — tested the real WeatherAPI response, the invalid-city error path, the deployed proxy, and every UI element on the live URL.
6. **Shipped to portfolio** — initialized git, pushed to a public GitHub repo, and confirmed no secrets leaked (`.env` is gitignored).

---

## 3. Tools & tech used

| Layer | Tools |
|-------|-------|
| Frontend | HTML5, CSS3 (custom properties, grid/flex, mobile-first), vanilla JavaScript (ES modules, no dependencies) |
| API proxy | Node.js Vercel Serverless Function (`api/weather.js`) |
| Weather data | [WeatherAPI.com](https://www.weatherapi.com/) `current.json` endpoint |
| Hosting | [Vercel](https://vercel.com) (static hosting + functions, edge caching) |
| CLI / workflow | Node 24, `npx vercel` CLI, `npx serve` for local runs, Git + GitHub |
| Secrets | `.env` file (gitignored) + Vercel Dashboard environment variables |

---

## 4. Architecture

```
Browser (index.html + styles.css + app.js — static, responsive)
   │  GET /api/weather?q=London
   ▼
Vercel Function (api/weather.js, Node)
   │  reads WEATHER_API_KEY from server env (never sent to browser)
   │  GET http://api.weatherapi.com/v1/current.json?key=KEY&q=city&aqi=no
   ▼
WeatherAPI.com
```

**Why a proxy?** A pure-frontend app cannot keep an API key secret — anything in JS ships to the browser. The proxy keeps the key on the server while the frontend stays framework-free. (A direct-WeatherAPI fallback exists only for local `file://` dev if a `VITE_WEATHER_API_KEY` is injected at build.)

### Endpoint contract

- `GET /api/weather?q={city}` → `200` + WeatherAPI JSON passthrough (cached at edge 5 min)
- `400` missing `q` · `405` non-GET · `500` server key not set · upstream `4xx/5xx` passed through with WeatherAPI's error body
- Expected shape: `{ location: { name, region, country, lat, lon, localtime }, current: { temp_c, temp_f, humidity, wind_kph, wind_mph, condition: { text, icon } } }`

### Project structure

```
weather-app/
├── index.html        # markup: search, chips, result grid, JSON panels
├── styles.css        # responsive theme, mood badge colors, code highlighting
├── app.js            # search + chips + mood engine + JSON highlighter
├── api/
│   └── weather.js    # Vercel serverless proxy (key stays server-side)
├── vercel.json       # headers, function timeout, clean URLs
├── package.json      # minimal (no build step)
├── .env              # secrets — LOCAL ONLY, gitignored, never committed
├── .env.example      # committed template
└── README.md         # this file
```

---

## 5. Run it locally

```powershell
cd weather-app

# Static preview (fastest)
npx serve . -l 3000
# open http://localhost:3000

# Full parity with the API proxy (reads .env)
vercel dev
```

Copy `.env.example` to `.env` and fill in your own keys:

```
WEATHER_API_KEY=your_weatherapi_key_here
VITE_WEATHER_API_KEY=your_weatherapi_key_here   # local direct-fallback only
VERCEL_TOKEN=your_vercel_token_here
```

---

## 6. Deploy (Vercel)

```powershell
cd weather-app
vercel --token $env:VERCEL_TOKEN --yes          # preview
vercel --prod --token $env:VERCEL_TOKEN --yes   # production
```

Or connect the GitHub repo: Vercel Dashboard → Add New Project → Import `weather-mood-app` → add `WEATHER_API_KEY` under Settings → Environment Variables (Production + Preview) → Deploy. No build command needed.

---

## 7. Security notes

- No secrets are hardcoded in the frontend or committed to git — `.env` and `.vercel/` are gitignored.
- Production key lives only in Vercel's encrypted environment variables.
- `vercel.json` sets `X-Content-Type-Options`, `X-Frame-Options`, and a strict referrer policy.

## 8. Possible next steps

- 5-day forecast + hourly strip (WeatherAPI `forecast.json`)
- Geolocation ("weather near me") and °C/°F toggle
- PWA installability + offline cache of the last result
- GitHub Actions CI: lint + mood-engine unit tests on every push
