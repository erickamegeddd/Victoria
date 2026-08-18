import { AGENT_MAP } from "./_agentMap.js";

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";

async function sbGet(path) {
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const { agent_name } = req.query;
  if (!agent_name) return res.status(400).json({ error: "agent_name is required" });

  const merchants = AGENT_MAP[agent_name];
  if (!merchants || merchants.length === 0) return res.json([]);

  const mids = merchants.map((m) => m.mid);
  const rows = await sbGet(
    `residuals?select=mid,business_name,isos(name)&mid=in.(${mids.join(",")})&limit=2000`
  );
  if (!Array.isArray(rows)) return res.status(500).json({ error: "DB error" });

  const seen = new Set();
  const result = [];
  rows.forEach((r) => {
    if (!seen.has(r.mid)) {
      seen.add(r.mid);
      result.push({ mid: r.mid, dba: r.business_name || "", iso: r.isos?.name || "" });
    }
  });

  return res.json(result);
}
