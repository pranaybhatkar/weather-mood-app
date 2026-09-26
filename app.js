// Frontend logic: search + chips + mood + raw/pretty JSON
// API contract:
//   Primary: GET /api/weather?q=city  (Vercel proxy, key stays server-side)
//   Fallback (local file:// or proxy missing): direct WeatherAPI with VITE key if injected at build.
// Expected WeatherAPI response shape (current.json):
//   { location: { name, region, country, lat, lon, localtime }, current: { temp_c, temp_f, humidity, wind_kph, wind_mph, condition: { text, icon } } }
// Loading state: spinner + disabled button. Error handling: 400/404/500/502 shown in #status.

const POPULAR_CITIES = [
  "London", "New York", "Tokyo", "Paris", "Sydney",
  "Mumbai", "Dubai", "Singapore", "Berlin", "Toronto"
];

// Injected at build if using Vite; otherwise undefined -> proxy-only (recommended).
const DIRECT_KEY = (typeof import.meta !== "undefined" && import.meta.env?.VITE_WEATHER_API_KEY) || "";

const $ = (id) => document.getElementById(id);
const chipsEl = $("chips"), form = $("searchForm"), input = $("cityInput"), btn = $("searchBtn");
const statusEl = $("status"), resultEl = $("result"), apiModeEl = $("apiMode");

function moodFor(tempC, humidity, windKph) {
  // Priority order matters; documented in UI <details>.
  if (windKph > 30) return "Windy";
  if (humidity >= 80 || (tempC >= 28 && humidity >= 70)) return "Uncomfortable";
  if (tempC >= 30) return "Hot";
  if (tempC <= 10) return "Cold";
  return "Pleasant";
}

function setStatus(kind, html) {
  if (!html) { statusEl.hidden = true; statusEl.innerHTML = ""; return; }
  statusEl.hidden = false;
  statusEl.className = "status" + (kind ? " " + kind : "");
  statusEl.innerHTML = html;
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Tiny syntax highlighter for JSON (no deps).
function highlightJson(obj) {
  let json = JSON.stringify(obj, null, 2);
  json = esc(json);
  return json.replace(
    /(&quot;((?:\\.|[^"\\])*)&quot;(\s*:)?)|("((?:\\.|[^"\\])*")(\s*:)?)|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (m, _e, _es, _ec, q, _s, colon, bool) => {
      if (q) {
        if (colon) return `<span class="tok-k">${q}</span>${colon}`;
        return `<span class="tok-s">${q}</span>`;
      }
      if (m.startsWith("&quot;")) return `<span class="tok-s">${m}</span>`;
      if (bool) return `<span class="tok-b">${bool}</span>`;
      if (m === "null") return `<span class="tok-nul">null</span>`;
      if (/^-?\d/.test(m)) return `<span class="tok-n">${m}</span>`;
      return m;
    }
  );
}
// Note: esc() escapes quotes to &quot; — handle that form above. Fallback plain escape if needed.
function highlightJsonSafe(obj) {
  try { return highlightJson(obj); }
  catch { return esc(JSON.stringify(obj, null, 2)); }
}

async function fetchWeather(city) {
  const q = city.trim();
  if (!q) { setStatus("error", "Please enter a city name."); return; }

  btn.disabled = true;
  setStatus("loading", `<span class="spin"></span>Loading weather for <strong>${esc(q)}</strong>…`);
  resultEl.hidden = true;

  // Mark active chip
  document.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.city.toLowerCase() === q.toLowerCase()));

  const urls = [`/api/weather?q=${encodeURIComponent(q)}`];
  // Fallback: direct WeatherAPI call (exposes key — only for local dev without proxy)
  if (DIRECT_KEY) urls.push(`https://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(DIRECT_KEY)}&q=${encodeURIComponent(q)}&aqi=no`);

  let data = null, lastErr = null, usedMode = urls[0];
  for (const url of urls) {
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (!r.ok) {
        const msg = j?.error?.message || j?.error || `HTTP ${r.status}`;
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
      data = j; usedMode = url; break;
    } catch (e) { lastErr = e; }
  }

  btn.disabled = false;
  if (!data) {
    setStatus("error", `Could not fetch weather for <strong>${esc(q)}</strong>: ${esc(lastErr?.message || "network error")}. Check the city spelling or try a chip below.`);
    return;
  }

  apiModeEl.textContent = usedMode.startsWith("/api") ? "proxy: /api/weather" : "direct: weatherapi.com";
  render(data);
  setStatus("", "");
}

function render(data) {
  const loc = data.location || {}, cur = data.current || {};
  const tempC = Number(cur.temp_c), hum = Number(cur.humidity), windKph = Number(cur.wind_kph);
  const mood = moodFor(tempC, hum, windKph);

  $("locName").textContent = [loc.name, loc.country].filter(Boolean).join(", ") || "Unknown location";
  $("locSub").textContent = [loc.region, loc.country].filter(Boolean).join(" · ") || "";
  $("locTime").textContent = loc.localtime ? `Local time: ${loc.localtime}` + (loc.lat ? ` · ${loc.lat}, ${loc.lon}` : "") : "";
  $("condText").textContent = cur.condition?.text || "—";
  const icon = $("condIcon");
  if (cur.condition?.icon) {
    icon.src = cur.condition.icon.startsWith("//") ? "https:" + cur.condition.icon : cur.condition.icon;
    icon.alt = cur.condition?.text || "condition";
  } else { icon.removeAttribute("src"); icon.alt = ""; }

  $("mTemp").textContent = cur.temp_c != null ? `${cur.temp_c}°C` : "—";
  $("mTempSub").textContent = cur.temp_f != null ? `${cur.temp_f}°F` : "";
  $("mHum").textContent = cur.humidity != null ? `${cur.humidity}%` : "—";
  $("mWind").textContent = cur.wind_kph != null ? `${cur.wind_kph} kph` : "—";
  $("mWindSub").textContent = cur.wind_mph != null ? `${cur.wind_mph} mph` : "";

  const badge = $("moodBadge");
  badge.textContent = mood;
  badge.className = "mood " + mood;

  // Raw JSON: exact string returned by API
  $("rawJson").textContent = JSON.stringify(data);
  // Formatted: pretty-printed + syntax highlighted
  $("prettyJson").innerHTML = highlightJsonSafe(data);

  resultEl.hidden = false;
  resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Chips
POPULAR_CITIES.forEach((city) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "chip"; b.dataset.city = city; b.textContent = city;
  b.setAttribute("role", "listitem");
  b.addEventListener("click", () => { input.value = city; fetchWeather(city); });
  chipsEl.appendChild(b);
});

form.addEventListener("submit", (e) => { e.preventDefault(); fetchWeather(input.value); });

// Copy buttons
document.querySelectorAll("[data-copy]").forEach((b) => {
  b.addEventListener("click", async () => {
    const el = $(b.dataset.copy);
    try { await navigator.clipboard.writeText(el.textContent); b.textContent = "Copied!"; }
    catch { b.textContent = "Select + Ctrl+C"; }
    setTimeout(() => (b.textContent = "Copy"), 1500);
  });
});

// Deep-link support: ?q=London
const initial = new URLSearchParams(location.search).get("q");
if (initial) { input.value = initial; fetchWeather(initial); }
