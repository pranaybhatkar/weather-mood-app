// Vercel Serverless Function: GET /api/weather?q=city_name
// Proxies WeatherAPI so the API key never ships to the browser.
// Env required (Vercel Dashboard > Settings > Environment Variables):
//   WEATHER_API_KEY = WeatherAPI key
//
// Query params:
//   q (required): city name, e.g. ?q=London
// Success: 200 + WeatherAPI JSON passthrough
// Errors: 400 missing q, 502 upstream failure, 500 missing server key

export default async function handler(req, res) {
  // CORS for frontend-only usage
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed, use GET" });

  const q = (req.query.q || "").toString().trim();
  if (!q) return res.status(400).json({ error: "Missing required query param: q (city name)" });

  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Server misconfigured: WEATHER_API_KEY not set" });

  const upstream = `http://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q)}&aqi=no`;

  try {
    const r = await fetch(upstream);
    const data = await r.json();
    if (!r.ok) {
      // Normalize WeatherAPI errors, e.g. { error: { code: 1006, message: "No matching location found." } }
      return res.status(r.status).json(data);
    }
    // Cache at edge for 5 min to reduce quota usage
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: "Upstream WeatherAPI request failed", detail: String(e?.message || e) });
  }
}
