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

  const { date, agent_name } = req.query;
  if (!date || !agent_name) return res.status(400).json({ error: "date and agent_name are required" });

  const merchants = AGENT_MAP[agent_name];
  if (!merchants || merchants.length === 0) return res.json([]);

  const mids = merchants.map((m) => m.mid);
  const rows = await sbGet(
    `residuals?select=mid,business_name,gross_revenue,paydiversenet,isos(name)&mid=in.(${mids.join(",")})&report_month=eq.${date}&limit=2000`
  );
  if (!Array.isArray(rows)) return res.status(500).json({ error: "DB error" });

  const byMid = {};
  rows.forEach((r) => {
    if (!byMid[r.mid]) {
      byMid[r.mid] = {
        mid: r.mid,
        dba: r.business_name || "",
        iso: r.isos?.name || "",
        paydiversenet: 0,
        total_residual: 0,
      };
    }
    byMid[r.mid].paydiversenet += r.paydiversenet || 0;
    byMid[r.mid].total_residual += r.gross_revenue || 0;
  });

  const data = Object.values(byMid).map((m) => {
    const pct = getPct(agent_name, m.mid);
    return {
      iso: m.iso,
      operating_partner: null,
      dba: m.dba,
      corporation: m.dba,
      mid: m.mid,
      agent_percentage: `${pct}.00%`,
      agent_payout: Math.round(m.paydiversenet * pct / 100 * 100) / 100,
      paydiversenet: Math.round(m.paydiversenet * 100) / 100,
      total_residual: Math.round(m.total_residual * 100) / 100,
    };
  });

  return res.json(data);
}
