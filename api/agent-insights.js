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

  const merchants = AGENT_MAP[agent_name] || [];
  // Include all MIDs potentially active in the range (active at any point from start_date onward)
  const possibleMids = [...new Set(
    merchants.filter((m) => !m.until || m.until >= start_date).map((m) => m.mid)
  )];
  if (possibleMids.length === 0) return res.json([]);

  const rows = await sbGet(
    `residuals?select=mid,report_month,gross_revenue,paydiversenet&mid=in.(${possibleMids.join(",")})&report_month=gte.${start_date}&report_month=lte.${end_date}&order=report_month.asc&limit=5000`
  );
  if (!Array.isArray(rows)) return res.status(500).json({ error: "DB error" });

  const byMonth = {};
  rows.forEach((r) => {
    const month = r.report_month;
    // Only count this MID if it was active in this specific month
    const pct = getPct(agent_name, r.mid, month);
    if (pct === 0 && !merchants.find((m) => m.mid === r.mid && (!m.until || m.until >= month))) return;
    if (!byMonth[month]) byMonth[month] = { month, total_residual: 0, paydiversenet: 0, agent_payout: 0 };
    byMonth[month].total_residual += r.gross_revenue || 0;
    byMonth[month].paydiversenet += r.paydiversenet || 0;
    byMonth[month].agent_payout += (r.paydiversenet || 0) * pct / 100;
  });

  return res.json(Object.values(byMonth).map((m) => ({
    month: m.month,
    total_residual: Math.round(m.total_residual * 100) / 100,
    paydiversenet: Math.round(m.paydiversenet * 100) / 100,
    agent_payout: Math.round(m.agent_payout * 100) / 100,
  })));
}
