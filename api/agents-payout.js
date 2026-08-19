import { AGENT_MAP } from "./_agentMap.js";

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";

async function sbGet(path) {
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.json();
}

// Computes payout for a single agent — identical approach as each-agent-data.
// This guarantees the overview and detail totals match exactly.
async function computeAgentPayout(agentName, merchants, date) {
  const active = merchants.filter((m) => !m.until || m.until >= date);
  if (active.length === 0) return 0;

  // Fetch deleted-row markers — wrapped in try/catch so failures don't block payout calc
  let deletedMids = new Set();
  try {
    const deletedRes = await sbGet(
      `agent_adjustments?select=mid&agent_name=eq.${encodeURIComponent(agentName)}&report_month=eq.${date}&field_name=eq.deleted_row&limit=500`
    );
    deletedMids = new Set(Array.isArray(deletedRes) ? deletedRes.map((r) => r.mid).filter(Boolean) : []);
  } catch { /* table may not exist yet or SELECT policy missing — skip */ }

  // Exclude deleted MIDs
  const filteredActive = active.filter((m) => !deletedMids.has(m.mid));
  if (filteredActive.length === 0) return 0;

  const mids = [...new Set(filteredActive.map((m) => m.mid))];
  const rows = await sbGet(
    `residuals?select=mid,paydiversenet&mid=in.(${mids.join(",")})&report_month=eq.${date}&limit=5000`
  );
  if (!Array.isArray(rows)) return 0;

  const netByMid = {};
  rows.forEach((r) => {
    netByMid[r.mid] = (netByMid[r.mid] || 0) + (r.paydiversenet || 0);
  });

  return filteredActive.reduce(
    (sum, { mid, pct }) => sum + (netByMid[mid] || 0) * pct / 100,
    0
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date is required" });

  // Run per-agent queries in parallel so each agent uses only its own MIDs.
  try {
    const results = await Promise.all(
      Object.entries(AGENT_MAP).map(async ([agent_name, merchants]) => {
        try {
          const total_payout = await computeAgentPayout(agent_name, merchants, date);
          return { agent_name, total_payout: Math.round(total_payout * 100) / 100 };
        } catch {
          return { agent_name, total_payout: 0 };
        }
      })
    );
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
