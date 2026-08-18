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

  const { start_date, end_date, agent_name } = req.query;
  if (!start_date || !end_date || !agent_name) {
    return res.status(400).json({ error: "start_date, end_date, and agent_name are required" });
  }

  const merchants = AGENT_MAP[agent_name];
  if (!merchants || merchants.length === 0) return res.json([]);

  const mids = merchants.map((m) => m.mid);
  const rows = await sbGet(
    `residuals?select=mid,report_month,gross_revenue,paydiversenet&mid=in.(${mids.join(",")})&report_month=gte.${start_date}&report_month=lte.${end_date}&order=report_month.asc&limit=2000`
  );
  if (!Array.isArray(rows)) return res.status(500).json({ error: "DB error" });

  const byMonth = {};
  rows.forEach((r) => {
    const m = r.report_month;
    if (!byMonth[m]) byMonth[m] = { month: m, total_residual: 0, paydiversenet: 0, agent_payout: 0 };
    const pct = getPct(agent_name, r.mid);
    byMonth[m].total_residual += r.gross_revenue || 0;
    byMonth[m].paydiversenet += r.paydiversenet || 0;
    byMonth[m].agent_payout += (r.paydiversenet || 0) * pct / 100;
  });

  const result = Object.values(byMonth).map((m) => ({
    month: m.month,
    total_residual: Math.round(m.total_residual * 100) / 100,
    paydiversenet: Math.round(m.paydiversenet * 100) / 100,
    agent_payout: Math.round(m.agent_payout * 100) / 100,
  }));

  return res.json(result);
}
