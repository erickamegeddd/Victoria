// api/sync-from-sheet.js
// Called by the Google Sheets Apps Script to push reviewed data into Supabase

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";

async function sbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return []; }
}

async function sbUpsert(path, body) {
  const key = process.env.SUPABASE_SERVICE_KEY || ANON_KEY;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(body)
  });
  return r.status;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Sync-Token");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  // Validate sync token
  const SYNC_TOKEN = process.env.SYNC_TOKEN || "paydiverse-sync-2026";
  const token = req.headers["x-sync-token"] || req.body?.token;
  if (token !== SYNC_TOKEN) return res.status(401).json({ error: "Invalid sync token" });

  const { data } = req.body || {};
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: "No data provided" });
  }

  // Build ISO name → ID map
  const isos = await sbGet("isos?select=id,name&limit=100");
  const isoMap = {};
  (Array.isArray(isos) ? isos : []).forEach(i => { isoMap[i.name.toLowerCase()] = i.id; });

  let updated = 0, skipped = 0, errors = [];

  for (const entry of data) {
    const { iso, month, expected } = entry;
    if (!iso || !month || expected === "" || expected === null) { skipped++; continue; }
    
    const isoId = isoMap[iso.toLowerCase()];
    if (!isoId) { skipped++; errors.push(`ISO not found: ${iso}`); continue; }

    const status = await sbUpsert("iso_payments", {
      iso_id: isoId,
      report_month: month,
      expected_amount: parseFloat(expected)
    });

    if (status >= 200 && status < 300) { updated++; }
    else { errors.push(`Failed ${iso} ${month}: status ${status}`); }
  }

  return res.json({
    success: true,
    updated,
    skipped,
    errors: errors.slice(0, 10),
    message: `Synced ${updated} records to Victoria dashboard`
  });
}
