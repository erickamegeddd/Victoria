// api/sync-iso-payments.js
// Modes:
//   GET  ?action=bank-preview&month=YYYY-MM  → auto-set due dates + preview bank transactions
//   POST ?action=bank-confirm&month=YYYY-MM  → write received_amounts from bank
//   GET  ?action=set-due-dates&month=YYYY-MM → populate Payment Expected By dates for all ISOs with residuals
//   GET  ?action=sync-residuals&month=YYYY-MM → sync expected_amount from residuals

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";

const PAYMENT_DUE_RULES = {
  "Group ISO":0,"Authorize.Net":5,"Expitrans":5,
  "Pepper Pay":13,"Total-Apps":13,"Finns":13,
  "CC Bill":15,"Maverick":15,"Simply Payment Group":15,
  "PayArc":17,"Mitigator":18,"Quantum":19,
  "GET":20,"MerchantE Fresno":20,"MerchantE Synovous":20,"Nexio":20,"Nuvei":20,"Vendara":20,"Worldpay":20,"Worldpay (Vantiv)":20,
  "Fraud Deflect":22,"The HiRisk Processor":24,"HiRisk":24,
  "Cardworks":25,"Celero":25,"SignaPay":25,
  "Payliance":26,"Taluspay":28,"NMI":29,
  "Coastal Pay":30,"First Direct Financial":30,"Merchant Industry":30,"Netevia":30,"Payment Cloud":30,"Seamless Chex":30,
  "RAC":35,"Card Insight":45,"E-Fitness Today":45,"Midmetrics":45,"Approvely":46,"USAG":49
};

// Bank Sync window rule: ISOs pay the month after the residual month, so only
// transactions dated in the calendar month of the ISO's Expected-By date are picked up
// (never earlier than month M+1). CC Bill pays weekly inside the residual month itself.
function ymAdd(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
function syncWindowMonth(isoName, reportMonth) {
  const ym = reportMonth.slice(0, 7);
  if (isoName === 'CC Bill') return ym;
  const next = ymAdd(ym, 1);
  const exp = computeExpDate(isoName, reportMonth);
  const expYm = exp ? exp.slice(0, 7) : next;
  return expYm > next ? expYm : next;
}

function computeExpDate(isoName, reportMonth) {
  const days = PAYMENT_DUE_RULES[isoName];
  if (days == null) return null;
  const ym = reportMonth.slice(0, 7);
  const [y, m] = ym.split('-').map(Number);
  const monthEnd = new Date(Date.UTC(y, m, 0)); // last day of month
  const payDate = new Date(monthEnd);
  payDate.setUTCDate(payDate.getUTCDate() + days);
  return payDate.toISOString().slice(0, 10);
}

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

async function sbGetAll(basePath) {
  const k = getKey();
  let all = [], from = 0;
  while (true) {
    const sep = basePath.includes('?') ? '&' : '?';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${basePath}${sep}offset=${from}&limit=1000`, {
      headers: { apikey: k, Authorization: `Bearer ${k}` }
    });
    const batch = await res.json();
    if (!Array.isArray(batch) || !batch.length) break;
    all = all.concat(batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  return all;
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

// ─── SimpleFIN helpers ─────────────────────────────────────────────────────────

// accessUrl format: https://USER:PASS@beta-bridge.simplefin.org/simplefin
async function fetchSimpleFIN(accessUrl, startTs, endTs) {
  const u = new URL(accessUrl);
  const base = `${u.protocol}//${u.host}${u.pathname}`;
  const creds = Buffer.from(`${u.username}:${u.password}`).toString("base64");
  const res = await fetch(`${base}/accounts?start-date=${startTs}&end-date=${endTs}`, {
    headers: { Authorization: `Basic ${creds}` }
  });
  if (!res.ok) throw new Error(`SimpleFIN HTTP ${res.status}`);
  return res.json();
}

async function getSimpleFINTransactions(month) {
  // Query from start of residual month through 65 days after month end.
  // This covers CC Bill (pays weekly during the month) through USAG (49 days after month end).
  const [year, mon] = month.split("-").map(Number);
  const startTs = Math.floor(Date.UTC(year, mon - 1, 1) / 1000);           // First of residual month
  const monthEnd = new Date(Date.UTC(year, mon, 0));                         // Last day of residual month
  const endDate = new Date(monthEnd);
  endDate.setUTCDate(endDate.getUTCDate() + 65);                            // 65 days after month end
  const endTs = Math.floor(endDate.getTime() / 1000);

  const urls = [process.env.SFIN_URL_1, process.env.SFIN_URL_2].filter(Boolean);
  if (!urls.length) throw new Error("No SimpleFIN URLs configured (SFIN_URL_1 / SFIN_URL_2)");

  const allTxs = [];
  const errs = [];

  for (const url of urls) {
    try {
      const data = await fetchSimpleFIN(url, startTs, endTs);
      for (const acct of data.accounts || []) {
        for (const tx of acct.transactions || []) {
          const amount = parseFloat(tx.amount);
          // Only positive amounts = deposits/credits coming into the account
          if (amount > 0) {
            const d = new Date(tx.posted * 1000);
            allTxs.push({
              date: d.toISOString().slice(0, 10),
              description: tx.description || tx.memo || tx.payee || "",
              payee: tx.payee || "",
              amount,
              account: acct.name || ""
            });
          }
        }
      }
    } catch (e) {
      errs.push(e.message);
    }
  }

  if (!allTxs.length && errs.length) throw new Error(errs.join("; "));
  return allTxs;
}

// ─── Set due dates ─────────────────────────────────────────────────────────────

async function setDueDates(month) {
  // month is YYYY-MM; for each ISO with residuals this month, create/update iso_payments
  // with EXP:YYYY-MM-DD| prefix in notes if not already set.
  const ym = month.slice(0, 7);
  const rm = `${ym}-01`;

  const residuals = await sbGetAll(`residuals?report_month=eq.${rm}&select=iso_id`);
  if (!Array.isArray(residuals) || !residuals.length) return;

  const isoIds = [...new Set(residuals.map(r => r.iso_id))];
  const isos = await sbGet(`isos?id=in.(${isoIds.join(',')})&select=id,name`);
  if (!Array.isArray(isos)) return;

  const existing = await sbGet(`iso_payments?report_month=eq.${rm}&select=id,iso_id,notes`);
  const existingMap = {};
  if (Array.isArray(existing)) existing.forEach(p => { existingMap[p.iso_id] = p; });

  for (const iso of isos) {
    const expStr = computeExpDate(iso.name, ym);
    if (!expStr) continue;
    const expPrefix = `EXP:${expStr}|`;
    const ex = existingMap[iso.id];

    if (ex) {
      const cur = ex.notes || '';
      if (!cur.match(/^EXP:\d{4}-\d{2}-\d{2}\|/)) {
        // No stored date yet — set it without touching existing notes content
        await sbPatch(`iso_payments?id=eq.${ex.id}`, { notes: expPrefix + cur.replace(/^\s*\|\s*/, '') });
      }
    } else {
      await sbPost('iso_payments', {
        iso_id: iso.id, report_month: rm, notes: expPrefix,
        status: 'pending', updated_at: new Date().toISOString()
      });
    }
  }
}

// ─── Bank sync handlers ────────────────────────────────────────────────────────

async function bankPreview(month, res) {
  // Auto-populate expected payment dates for all ISOs with residuals this month
  await setDueDates(month).catch(e => console.error('setDueDates error:', e.message));
  const mappings = await sbGet("iso_bank_mappings?select=*,isos(id,name)&order=created_at.asc").catch(() => []);
  const active = (Array.isArray(mappings) ? mappings : []).filter(m => m.keywords && m.keywords.trim());
  if (!active.length) {
    return res.json({ preview: [], month, message: "No bank mappings configured yet. Set them up under Administrator > Bank Mappings." });
  }

  let txs;
  try {
    txs = await getSimpleFINTransactions(month);
  } catch (e) {
    return res.status(502).json({ error: `Could not reach SimpleFIN: ${e.message}` });
  }

  const isoMap = {};
  for (const m of active) {
    const kws = m.keywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
    if (!kws.length) continue;
    isoMap[m.iso_id] = {
      isoId: m.iso_id,
      isoName: m.isos?.name || m.iso_id,
      keywords: kws,
      transactions: [],
      expectedDate: computeExpDate(m.isos?.name || '', month),
      windowMonth: syncWindowMonth(m.isos?.name || '', month)
    };
  }

  let outOfWindow = 0;
  for (const tx of txs) {
    const haystack = `${tx.description} ${tx.payee}`.toLowerCase();
    for (const iso of Object.values(isoMap)) {
      if (iso.keywords.some(kw => haystack.includes(kw))) {
        // Only transactions in the ISO's payment month (month after residual month, or the
        // month of its Expected-By date) are picked up; the rest are counted as out of window.
        if (String(tx.date).slice(0, 7) !== iso.windowMonth) { outOfWindow++; break; }
        iso.transactions.push({ date: tx.date, description: tx.description, amount: tx.amount });
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
    outOfWindow,
    unmatched: txs.length - preview.reduce((s, i) => s + i.txCount, 0) - outOfWindow
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
      // Fingerprints: date:amount pairs — no free text, safe to parse back reliably
      const fingerprints = iso.transactions.map(t => `${t.date}:${Number(t.amount).toFixed(2)}`).join(",");
      const breakdown = iso.transactions.map(t => `${t.date} ${t.description} $${Number(t.amount).toFixed(2)}`).join("; ");
      const syncNote = `[Bank Sync ${month}]{${fingerprints}} ${breakdown}`;
      const existing = await sbGet(`iso_payments?iso_id=eq.${iso.isoId}&report_month=eq.${reportMonth}&select=id,notes`);
      const ex = Array.isArray(existing) ? existing[0] : null;

      if (ex) {
        const cur = ex.notes || "";
        const expMatch = cur.match(/^(EXP:\d{4}-\d{2}-\d{2}\|)/);
        const expPrefix = expMatch ? expMatch[1] : "";
        const rest = cur.replace(/^EXP:\d{4}-\d{2}-\d{2}\|/, "").replace(/\[Bank Sync [^\]]+\][^|]*/g, "").replace(/^\s*\|\s*/, "").trim();
        if (iso.total === null) {
          // All transactions unchecked — fully clear received amount and bank sync notes
          const clearedNotes = (expPrefix + (rest ? rest : "")).trim() || null;
          await sbPatch(`iso_payments?id=eq.${ex.id}`, {
            received_amount: null,
            updated_at: new Date().toISOString(),
            notes: clearedNotes
          });
        } else {
          const newNotes = expPrefix + syncNote + (rest ? " | " + rest : "");
          await sbPatch(`iso_payments?id=eq.${ex.id}`, {
            received_amount: iso.total,
            updated_at: new Date().toISOString(),
            notes: newNotes
          });
        }
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

// ─── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, month } = req.query;

  if (action === "set-due-dates" && req.method === "GET") {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "month required (YYYY-MM)" });
    await setDueDates(month);
    return res.json({ ok: true, month });
  }

  if (action === "bank-preview" && req.method === "GET") {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "month required (YYYY-MM)" });
    return bankPreview(month, res);
  }
  if (action === "bank-confirm" && req.method === "POST") {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "month required (YYYY-MM)" });
    const { preview } = req.body || {};
    return bankConfirm(month, preview, res);
  }

  // Legacy: sync expected_amount from residuals — requires explicit action to prevent accidental overwrites
  if (action !== "sync-residuals") {
    return res.status(400).json({ error: "action parameter required. Use action=bank-preview, action=bank-confirm, or action=sync-residuals." });
  }
  try {
    let monthFilter = "";
    if (month) monthFilter = `&report_month=eq.${month}`;

    const residuals = await sbGetAll(`residuals?select=iso_id,report_month,paydiversenet${monthFilter}`);
    if (!Array.isArray(residuals)) return res.status(500).json({ error: "Failed to fetch residuals" });

    const totals = {};
    for (const r of residuals) {
      const key = `${r.iso_id}|||${r.report_month}`;
      totals[key] = (totals[key] || 0) + (r.paydiversenet || 0);
    }

    const existingPays = await sbGetAll(`iso_payments?select=id,iso_id,report_month,expected_amount${monthFilter}`);
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
