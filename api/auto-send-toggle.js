const SB_URL = "https://vuqflofuzhybutkkzroa.supabase.co";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const SVC = process.env.SUPABASE_SERVICE_KEY;
  const sbH = {
    apikey: SVC,
    Authorization: `Bearer ${SVC}`,
    "Content-Type": "application/json",
  };

  if (req.method === "GET") {
    try {
      const r = await fetch(
        `${SB_URL}/rest/v1/app_settings?key=eq.auto_send_enabled&select=value`,
        { headers: sbH }
      );
      if (!r.ok) return res.json({ enabled: true }); // default if table missing
      const data = await r.json();
      const enabled = !Array.isArray(data) || data.length === 0 || data[0].value !== "false";
      return res.json({ enabled });
    } catch (_) {
      return res.json({ enabled: true });
    }
  }

  if (req.method === "POST") {
    const { enabled } = req.body || {};
    const value = enabled === false ? "false" : "true";
    try {
      const r = await fetch(`${SB_URL}/rest/v1/app_settings`, {
        method: "POST",
        headers: { ...sbH, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ key: "auto_send_enabled", value }),
      });
      if (!r.ok) {
        const err = await r.text();
        return res.status(500).json({ ok: false, error: err });
      }
      return res.json({ ok: true, enabled: value === "true" });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).end();
}
