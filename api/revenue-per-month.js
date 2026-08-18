const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";

async function sbGetAll(path) {
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  let offset = 0, all = [];
  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}${sep}offset=${offset}&limit=1000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    all = all.concat(rows);
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return all;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date is required" });

  const rows = await sbGetAll(`residuals?select=paydiversenet&report_month=eq.${date}`);
  if (!Array.isArray(rows)) return res.status(500).json({ error: "DB error" });

  const total_revenue = rows.reduce((s, r) => s + (r.paydiversenet || 0), 0);
  return res.json({ total_revenue: Math.round(total_revenue * 100) / 100 });
}
