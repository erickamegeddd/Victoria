import { AGENT_MAP, getPct, isReseller, midScopedOut } from "./_agentMap.js";

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
  const possibleMids = [...new Set(
    merchants.filter((m) => !m.until || m.until >= start_date).map((m) => m.mid)
  )];
  if (possibleMids.length === 0) return res.json([]);

  const rows = await sbGet(
    `residuals?select=mid,report_month,isos(name),paydiversenet&mid=in.(${possibleMids.join(",")})&report_month=gte.${start_date}&report_month=lte.${end_date}&order=report_month.asc&limit=5000`
  );
  if (!Array.isArray(rows)) return res.status(500).json({ error: "DB error" });

  const byMonth = {};
  const midNet = {};
  rows.forEach((r) => {
    const month = r.report_month;
    if (isReseller(r.isos?.name, month, agent_name) || midScopedOut(agent_name, r.mid, month)) return;
    const pct = getPct(agent_name, r.mid, month);
    if (!byMonth[month]) byMonth[month] = { month, paydiversenet: 0, agent_payout: 0 };
    byMonth[month].paydiversenet += r.paydiversenet || 0;
    const k = month + "|" + r.mid;
    midNet[k] = midNet[k] || { month, pct, net: 0 };
    midNet[k].net += r.paydiversenet || 0;
  });

  // Payout per MID is floored at 0 so a negative MID never reduces earnings from other MIDs/ISOs.
  Object.values(midNet).forEach(({ month, pct, net }) => { byMonth[month].agent_payout += Math.max(0, net * pct / 100); });

  return res.json(Object.values(byMonth).map((m) => ({
    month: m.month,
    paydiversenet: Math.round(m.paydiversenet * 100) / 100,
    agent_payout: Math.round(m.agent_payout * 100) / 100,
  })));
}
