// api/sync-iso-payments.js
// Two modes:
//   GET  ?month=YYYY-MM-DD        → sync expected_amount from residuals
//   GET  ?action=bank-preview&month=YYYY-MM  → preview bank transactions matched to ISOs
//   POST ?action=bank-confirm&month=YYYY-MM  → write received_amounts from bank

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzU2fQ.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";
const CELESTRA_API = "https://celestra-life-dashboard-two.vercel.app/api/data";

function getKey() {
  return process.env.SUPABASE_SERVICE_KEY || ANON_KEY;
}

async function sbGet(path) {
  const k = getKey();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: k, Authorization: `Bearer ${k}` }
  });
  return res.json();
}

async function sbPatch(path, body) {
  const k = getKey();
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: k, Authorization: `Bearer ${k}`,
      "Content-Type": "application/json", Prefer: "return=minimal"
    },
    body: JSON.stringify(body)
  });
}

async function sbPost(path, body, extraHeaders = {}) {
  const k = getKey();
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: k, Authorization: `Bearer ${k}`,
      "Content-Type": "application/json", Prefer: "return=minimal",
      ...extraHeaders
    },
    body: JSON.stringify(body)
  });
}

// ── Bank sync helpers ─────────────────────────────────────────────────────────

async function bankPreview(month, res) {
  const mappings = await sbGet("iso_bank_mappings?select=*,isos(id,name)&order=created_at.asc").catch(() => []);
  const active = (Array.isArray(mappings) ? mappings : []).filter(m => m.keywords && m.keywords.trim());
  if (!active.length) {
    return res.json({ preview: [], month, message: "No bank mappings configured yet." });
  }

  const startDate = `${month}-01`;
  let celData;
  try {
    const r = await fetch(`${CELESTRA_API}?start_date=${startDate}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    celData = await r.json();
  } catch (e) {
    return res.status(502).json({ error: `Could not reach Celestra: ${e.message}` });
  }

  const txs = (celData.rows || []).filter(tx => tx.month === month && tx.amount < 0);

  const isoMap = {};
  for (const m of active) {
    const kws = m.keywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
    if (!kws.length) continue;
    isoMap[m.iso_id] = { isoId: m.iso_id, isoName: m.isos?.name || m.iso_id, keywords: kws, transactions: [] };
  }

  for (const tx of txs) {
    const haystack = `${tx.description || ""} ${tx.payee || ""}`.toLowerCase();
    for (const iso of Object.values(isoMap)) {
      if (iso.keywords.some(kw => haystack.includes(kw))) {
        iso.transactions.push({ date: tx.date, description: tx.description || tx.payee || "", amount: Math.abs(tx.amount) });
        break;
      }
    }
  }

  const preview = Object.values(isoMap)
    .filter(iso => iso.transactions.length > 0)
    .map(iso => ({
      isoId: iso.isoId,
      isoName: iso.isoName,
      transactions: iso.transactions,
      total: Math.round(iso.transactions.reduce((s, t) => s + t.amount, 0) * 100) / 100,
      txCount: iso.transactions.length
    }))
    .sort((a, b) => a.isoName.localeCompare(b.isoName));

  return res.json({
    preview,
    month,
    totalTxsFetched: txs.length,
    matched: preview.reduce((s, i) => s + i.txCount, 0),
    unmatched: txs.length - preview.reduce((s, i) => s + i.txCount, 0)
  });
}

async function bankConfirm(month, preview, res) {
  if (!Array.isArray(preview) || !preview.length) {
    return res.status(400).json({ error: "preview array required in body" });
  }
  const reportMonth = `${month}-01`;
  const errors = [];
  let written = 0;

  for (const iso of preview) {
    try {
      const breakdown = iso.transactions.map(t => `${t.date} ${t.description} $${Number(t.amount).toFixed(2)}`).join("; ");
      const syncNote = `[Bank Sync ${month}] ${breakdown}`;
      const existing = await sbGet(`iso_payments?iso_id=eq.${iso.isoId}&report_month=eq.${reportMonth}&select=id,notes`);
      const ex = Array.isArray(existing) ? existing[0] : null;

      if (ex) {
        const cur = ex.notes || "";
        const expMatch = cur.match(/^(EXP:\d{4}-\d{2}-\d{2}\|)/);
        const expPrefix = expMatch ? expMatch[1] : "";
        const rest = cur.replace(/^EXP:\d{4}-\d{2}-\d{2}\|/, "").replace(/\[Bank Sync [^\]]+\][^|]*/g, "").replace(/^\s*\|\s*/, "").trim();
        const newNotes = expPrefix + syncNote + (rest ? " | " + rest : "");
        await sbPatch(`iso_payments?id=eq.${ex.id}`, {
          received_amount: iso.total,
          updated_at: new Date().toISOString(),
          notes: newNotes
        });
      } else {
        await sbPost("iso_payments", {
          iso_id: iso.isoId,
          report_month: reportMonth,
          received_amount: iso.total,
          notes: syncNote,
          status: "pending",
          updated_at: new Date().toISOString()
        });
      }
      written++;
    } catch (e) {
      errors.push(`${iso.isoName}: ${e.message}`);
    }
  }

  return res.json({ ok: true, written, errors: errors.length ? errors : undefined });
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, month } = req.query;

  // Bank sync routes
  if (action === "bank-preview" && req.method === "GET") {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "month required (YYYY-MM)" });
    return bankPreview(month, res);
  }
  if (action === "bank-confirm" && req.method === "POST") {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "month required (YYYY-MM)" });
    const { preview } = req.body || {};
    return bankConfirm(month, preview, res);
  }

  // Original: sync expected_amount from residuals
  try {
    let monthFilter = "";
    if (month) monthFilter = `&report_month=eq.${month}`;

    const residuals = await sbGet(`residuals?select=iso_id,report_month,paydiversenet${monthFilter}&limit=5000`);
    if (!Array.isArray(residuals)) return res.status(500).json({ error: "Failed to fetch residuals" });

    const totals = {};
    for (const r of residuals) {
      const key = `${r.iso_id}|||${r.report_month}`;
      totals[key] = (totals[key] || 0) + (r.paydiversenet || 0);
    }

    const existingPays = await sbGet(`iso_payments?select=id,iso_id,report_month,expected_amount${monthFilter}&limit=500`);
    const payLookup = {};
    if (Array.isArray(existingPays)) {
      for (const p of existingPays) payLookup[`${p.iso_id}|||${p.report_month}`] = p;
    }

    let updated = 0, inserted = 0, unchanged = 0;
    const results = [];

    for (const [key, computedAmount] of Object.entries(totals)) {
      const [iso_id, report_month] = key.split("|||");
      const rounded = Math.round(computedAmount * 100) / 100;

      if (payLookup[key]) {
        const existing = payLookup[key];
        const existingAmt = Math.round((existing.expected_amount || 0) * 100) / 100;
        if (Math.abs(existingAmt - rounded) > 0.01) {
          await sbPatch(`iso_payments?id=eq.${existing.id}`, { expected_amount: rounded });
          updated++;
          results.push({ iso_id, report_month, action: "updated", old: existingAmt, new: rounded });
        } else {
          unchanged++;
        }
      } else if (rounded > 0) {
        await sbPost("iso_payments", { iso_id, report_month, expected_amount: rounded, status: "pending" });
        inserted++;
        results.push({ iso_id, report_month, action: "inserted", expected: rounded });
      }
    }

    return res.json({ ok: true, months_synced: month || "all", updated, inserted, unchanged, changes: results.slice(0, 50) });
  } catch (err) {
    console.error("sync-iso-payments error:", err);
    return res.status(500).json({ error: err.message });
  }
}
