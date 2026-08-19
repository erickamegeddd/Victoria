import { AGENT_MAP, getPct } from "./_agentMap.js";

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

  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date is required" });

  const allMids = [...new Set(
    Object.values(AGENT_MAP).flat().map((m) => m.mid)
  )];

  const rows = await sbGet(
    `residuals?select=mid,paydiversenet&mid=in.(${allMids.join(",")})&report_month=eq.${date}&limit=2000`
  );
  if (!Array.isArray(rows)) return res.status(500).json({ error: "DB error" });

  const payoutByMid = {};
  rows.forEach((r) => {
    payoutByMid[r.mid] = (payoutByMid[r.mid] || 0) + (r.paydiversenet || 0);
  });

  const result = Object.entries(AGENT_MAP).map(([agent_name, merchants]) => {
    const total_payout = merchants.reduce((sum, { mid, pct }) => {
      return sum + (payoutByMid[mid] || 0) * pct / 100;
    }, 0);
    return { agent_name, total_payout: Math.round(total_payout * 100) / 100 };
  });

  return res.json(result);
}
