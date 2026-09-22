// Admin endpoint: agent adjustments CRUD + user listing + insights data (service_role bypass)
const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";

async function sbRequest(method, path, body, useServiceKey) {
  const key = useServiceKey
    ? process.env.SUPABASE_SERVICE_KEY
    : process.env.VITE_SUPABASE_ANON_KEY;
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
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  if (res.status === 204) return {};
  return res.json();
}

// Paginate through Supabase REST using service_role key — bypasses RLS entirely
async function fetchAllSvc(baseUrl, serviceKey) {
  let all = [], offset = 0;
  while (true) {
    const sep = baseUrl.includes("?") ? "&" : "?";
    const r = await fetch(`${baseUrl}${sep}limit=1000&offset=${offset}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: "application/json" }
    });
    if (!r.ok) break;
    const batch = await r.json();
    if (!Array.isArray(batch) || !batch.length) break;
    all = all.concat(batch);
    if (batch.length < 1000) break;
    offset += 1000;
  }
  return all;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const svcKey = process.env.SUPABASE_SERVICE_KEY;

      // ── Auth admin ───────────────────────────────────────────────────────
      if (req.query.action === "list_users") {
        if (!svcKey) return res.status(500).json({ error: "Service key not configured" });
        const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=100`, {
          headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}` }
        });
        return res.json(await r.json());
      }

      // ── Insights: residuals for one or more months ───────────────────────
      if (req.query.action === "insights_month") {
        if (!svcKey) return res.status(500).json({ error: "Service key not configured" });
        const months = (req.query.months || "").split(",").filter(Boolean);
        if (!months.length) return res.json([]);
        const data = await fetchAllSvc(
          `${SUPABASE_URL}/rest/v1/residuals?select=*,isos(id,name)&report_month=in.(${months.join(",")})&order=id`,
          svcKey
        );
        return res.json(data);
      }

      // ── Insights: residuals for a full year ──────────────────────────────
      if (req.query.action === "insights_year") {
        if (!svcKey) return res.status(500).json({ error: "Service key not configured" });
        const { year } = req.query;
        if (!year) return res.json([]);
        const data = await fetchAllSvc(
          `${SUPABASE_URL}/rest/v1/residuals?select=*,isos(id,name)&report_month=gte.${year}-01-01&report_month=lte.${year}-12-31&order=id`,
          svcKey
        );
        return res.json(data);
      }

      // ── Insights: monthly trend (all months, slim columns) ───────────────
      if (req.query.action === "insights_trend") {
        if (!svcKey) return res.status(500).json({ error: "Service key not configured" });
        const data = await fetchAllSvc(
          `${SUPABASE_URL}/rest/v1/residuals?select=report_month,paydiversenet,gross_revenue&order=report_month`,
          svcKey
        );
        return res.json(data);
      }

      // ── Insights: gateway MID list ───────────────────────────────────────
      if (req.query.action === "insights_gateways") {
        if (!svcKey) return res.status(500).json({ error: "Service key not configured" });
        const data = await fetchAllSvc(
          `${SUPABASE_URL}/rest/v1/merchants?select=mid&merchant_type=eq.gateway`,
          svcKey
        );
        return res.json(data);
      }

      // ── Agent adjustments list ───────────────────────────────────────────
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
        agent_name, report_month, mid: mid || null, field_name,
        original_value: original_value ?? null, adjusted_value, notes: notes || null,
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
