// Stores and retrieves manual adjustments to agent payout data.
// Requires the `agent_adjustments` table (see supabase/migrations/).

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";

async function sbRequest(method, path, body) {
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (method === "POST") headers["Prefer"] = "return=representation";
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  if (res.status === 204) return {};
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const { agent_name, date } = req.query;
      let path = "agent_adjustments?order=created_at.desc&limit=500";
      if (agent_name) path += `&agent_name=eq.${encodeURIComponent(agent_name)}`;
      if (date) path += `&report_month=eq.${date}`;
      const data = await sbRequest("GET", path);
      return res.json(Array.isArray(data) ? data : []);
    }

    if (req.method === "POST") {
      const { agent_name, report_month, mid, field_name, original_value, adjusted_value, notes } = req.body;
      if (!agent_name || !report_month || !field_name || adjusted_value === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const data = await sbRequest("POST", "agent_adjustments", {
        agent_name,
        report_month,
        mid: mid || null,
        field_name,
        original_value: original_value ?? null,
        adjusted_value,
        notes: notes || null,
      });
      return res.json(data);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "id is required" });
      await sbRequest("DELETE", `agent_adjustments?id=eq.${encodeURIComponent(id)}`);
      return res.json({ success: true });
    }

    return res.status(405).end();
  } catch (err) {
    if (req.method === "GET") return res.json([]);
    return res.status(500).json({ error: err.message });
  }
}
