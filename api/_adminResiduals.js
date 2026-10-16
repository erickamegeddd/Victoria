// api/_adminResiduals.js
// Helper (not a function) called from sync-from-sheet.js when body.action is set.
// Token-protected maintenance logic for residual rows (replace / patch / delete).
// Uses SUPABASE_SERVICE_KEY from Vercel env; the key never leaves the server.
// Every write action is a dry run unless "confirm": true is sent.

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";

async function sb(method, path, body) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const t = await r.text();
  let json = null;
  try { json = t ? JSON.parse(t) : null; } catch { json = t; }
  return { status: r.status, json };
}

const isReserve = row => /reserve/i.test(row.business_name || "");
const isMonth = m => /^\d{4}-\d{2}-01$/.test(m || "");
const sum = rows => Math.round(rows.reduce((s, r) => s + (Number(r.paydiversenet) || 0), 0) * 100) / 100;

export async function adminResiduals(req, res) {
  if (!process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: "SUPABASE_SERVICE_KEY not set" });
  }

  const { action, iso_id, report_month, source_file, rows, id, fields, confirm } = req.body || {};
  const live = confirm === true;

  try {
    // ping: confirms the service key works (reads only)
    if (action === "ping") {
      const r = await sb("GET", "isos?select=id&limit=1");
      return res.status(200).json({ ok: r.status === 200, status: r.status });
    }

    // replace: delete rows for one ISO + month (optionally one source_file), then insert new rows
    if (action === "replace") {
      if (!iso_id || !isMonth(report_month) || !Array.isArray(rows) || !rows.length) {
        return res.status(400).json({ error: "iso_id, report_month (YYYY-MM-01) and rows[] required" });
      }
      let q = `residuals?iso_id=eq.${encodeURIComponent(iso_id)}&report_month=eq.${report_month}`;
      if (source_file) q += `&source_file=eq.${encodeURIComponent(source_file)}`;
      const existing = await sb("GET", q + "&select=id,mid,business_name,paydiversenet");
      const old = Array.isArray(existing.json) ? existing.json : [];
      const protectedRows = old.filter(isReserve);
      if (protectedRows.length) {
        return res.status(409).json({ error: "Reserve rows matched; narrow with source_file", reserve_rows: protectedRows.length });
      }
      const bad = rows.find(r => r.iso_id !== iso_id || r.report_month !== report_month);
      if (bad) return res.status(400).json({ error: "Every row must match iso_id and report_month" });
      const summary = { delete_count: old.length, delete_total: sum(old), insert_count: rows.length, insert_total: sum(rows) };
      if (!live) return res.status(200).json({ dry_run: true, ...summary });
      const del = await sb("DELETE", q);
      if (del.status >= 300) return res.status(500).json({ error: "delete failed", detail: del.json });
      const ins = await sb("POST", "residuals", rows);
      if (ins.status >= 300) return res.status(500).json({ error: "insert failed after delete", deleted: old, detail: ins.json });
      return res.status(200).json({ ok: true, ...summary });
    }

    // patch: update fields on one residual row
    if (action === "patch") {
      if (!id || !fields || typeof fields !== "object") return res.status(400).json({ error: "id and fields required" });
      const allowed = ["paydiversenet", "business_name", "mid", "gross_revenue", "gross_volume", "source_file"];
      const body = {};
      for (const k of Object.keys(fields)) if (allowed.includes(k)) body[k] = fields[k];
      if (!Object.keys(body).length) return res.status(400).json({ error: "No allowed fields" });
      const cur = await sb("GET", `residuals?id=eq.${encodeURIComponent(id)}&select=id,mid,business_name,paydiversenet`);
      if (!Array.isArray(cur.json) || !cur.json.length) return res.status(404).json({ error: "Row not found" });
      if (isReserve(cur.json[0])) return res.status(409).json({ error: "Reserve row protected" });
      if (!live) return res.status(200).json({ dry_run: true, before: cur.json[0], after: body });
      const r = await sb("PATCH", `residuals?id=eq.${encodeURIComponent(id)}`, body);
      return res.status(r.status < 300 ? 200 : 500).json({ ok: r.status < 300, result: r.json });
    }

    // delete: delete specific rows by id list
    if (action === "delete") {
      const ids = req.body.ids;
      if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "ids[] required" });
      const q = `residuals?id=in.(${ids.map(encodeURIComponent).join(",")})`;
      const cur = await sb("GET", q + "&select=id,mid,business_name,paydiversenet,report_month");
      const old = Array.isArray(cur.json) ? cur.json : [];
      if (old.some(isReserve)) return res.status(409).json({ error: "Reserve row protected" });
      if (!live) return res.status(200).json({ dry_run: true, delete_count: old.length, delete_total: sum(old), rows: old });
      const r = await sb("DELETE", q);
      return res.status(r.status < 300 ? 200 : 500).json({ ok: r.status < 300, deleted: old.length });
    }

    return res.status(400).json({ error: "Unknown action (ping, replace, patch, delete)" });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
