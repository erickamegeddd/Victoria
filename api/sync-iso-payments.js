// api/sync-iso-payments.js
// Automatically syncs iso_payments.expected_amount from the residuals table.
// Call this after every residuals import to keep expected amounts accurate.
// Also callable manually via GET /api/sync-iso-payments?month=2026-06-01

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  });
  return res.json();
}

async function sbPatch(path, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json", Prefer: "return=minimal"
    },
    body: JSON.stringify(body)
  });
}

async function sbPost(path, body) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json", Prefer: "return=minimal"
    },
    body: JSON.stringify(body)
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Determine which months to sync
    const { month } = req.query;
    let monthFilter = "";
    if (month) {
      monthFilter = `&report_month=eq.${month}`;
    }

    // Step 1: Compute SUM(paydiversenet) per ISO per report_month from residuals
    const residuals = await sbGet(
      `residuals?select=iso_id,report_month,paydiversenet${monthFilter}&limit=5000`
    );
    if (!Array.isArray(residuals)) {
      return res.status(500).json({ error: "Failed to fetch residuals" });
    }

    // Aggregate: (iso_id, report_month) → total paydiversenet
    const totals = {};
    for (const r of residuals) {
      const key = `${r.iso_id}|||${r.report_month}`;
      totals[key] = (totals[key] || 0) + (r.paydiversenet || 0);
    }

    // Step 2: Get existing iso_payments records
    const existingPays = await sbGet(
      `iso_payments?select=id,iso_id,report_month,expected_amount${monthFilter}&limit=500`
    );
    const payLookup = {};
    if (Array.isArray(existingPays)) {
      for (const p of existingPays) {
        payLookup[`${p.iso_id}|||${p.report_month}`] = p;
      }
    }

    // Step 3: For each aggregated total, update or insert iso_payments
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
        await sbPost("iso_payments", {
          iso_id, report_month,
          expected_amount: rounded,
          status: "pending"
        });
        inserted++;
        results.push({ iso_id, report_month, action: "inserted", expected: rounded });
      }
    }

    return res.json({
      ok: true,
      months_synced: month || "all",
      updated,
      inserted,
      unchanged,
      changes: results.slice(0, 50) // cap for readability
    });

  } catch (err) {
    console.error("sync-iso-payments error:", err);
    return res.status(500).json({ error: err.message });
  }
}
