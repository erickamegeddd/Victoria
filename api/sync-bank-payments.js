const SU = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SERVICE_KEY;
const CELESTRA_API = 'https://celestra-life-dashboard-two.vercel.app/api/data';

async function sbGet(path) {
  const r = await fetch(`${SU}/rest/v1/${path}`, {
    headers: { apikey: SK, Authorization: `Bearer ${SK}`, Accept: 'application/json' }
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`SB ${path}: ${r.status} ${t.slice(0, 200)}`); }
  return r.json();
}

async function sbPost(path, body, extraHeaders = {}) {
  const r = await fetch(`${SU}/rest/v1/${path}`, {
    method: 'POST',
    headers: { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body)
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`SB POST ${path}: ${r.status} ${t.slice(0, 200)}`); }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function sbPatch(path, body) {
  const r = await fetch(`${SU}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body)
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`SB PATCH ${path}: ${r.status} ${t.slice(0, 200)}`); }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (!SU || !SK) return res.status(500).json({ error: 'Supabase not configured — add SUPABASE_SERVICE_KEY to Vercel env vars' });

  const month = req.query.month; // e.g. "2026-09"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month param required in YYYY-MM format' });
  }

  // --- GET: build preview ---
  if (req.method === 'GET') {
    // 1. Load ISO bank mappings
    const mappings = await sbGet('iso_bank_mappings?select=*,isos(id,name)&order=created_at.asc').catch(() => []);
    const activeMappings = mappings.filter(m => m.keywords && m.keywords.trim());
    if (!activeMappings.length) {
      return res.json({ preview: [], month, message: 'No bank mappings configured yet. Add keywords in the Payments page.' });
    }

    // 2. Fetch Celestra transactions for the month
    const startDate = `${month}-01`;
    let celData;
    try {
      const r = await fetch(`${CELESTRA_API}?start_date=${startDate}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      celData = await r.json();
    } catch (e) {
      return res.status(502).json({ error: `Could not reach Celestra: ${e.message}` });
    }

    // Filter to this month only, exclude income, only expenses (negative = money out of account = payment received by PayDiverse)
    const txs = (celData.rows || []).filter(tx => tx.month === month && tx.amount < 0);

    // 3. Build ISO match map
    const isoMap = {};
    for (const m of activeMappings) {
      const kws = m.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
      if (!kws.length) continue;
      isoMap[m.iso_id] = {
        isoId: m.iso_id,
        isoName: m.isos?.name || m.iso_id,
        keywords: kws,
        transactions: []
      };
    }

    // 4. Match each transaction to an ISO (first match wins)
    for (const tx of txs) {
      const haystack = `${tx.description || ''} ${tx.payee || ''}`.toLowerCase();
      for (const iso of Object.values(isoMap)) {
        if (iso.keywords.some(kw => haystack.includes(kw))) {
          iso.transactions.push({
            date: tx.date,
            description: tx.description || tx.payee || '',
            amount: Math.abs(tx.amount)
          });
          break;
        }
      }
    }

    // 5. Build preview (only ISOs with matches)
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

  // --- POST: confirm and write ---
  if (req.method === 'POST') {
    const { preview } = req.body || {};
    if (!Array.isArray(preview) || !preview.length) {
      return res.status(400).json({ error: 'preview array required in body' });
    }

    const reportMonth = `${month}-01`;
    const errors = [];
    let written = 0;

    for (const iso of preview) {
      try {
        const breakdown = iso.transactions.map(t => `${t.date} ${t.description} $${Number(t.amount).toFixed(2)}`).join('; ');
        const syncNote = `[Bank Sync ${month}] ${breakdown}`;

        // Check for existing record
        const existing = await sbGet(`iso_payments?iso_id=eq.${iso.isoId}&report_month=eq.${reportMonth}&select=id,notes`);

        if (existing.length) {
          const ex = existing[0];
          const currentNotes = ex.notes || '';
          // Preserve EXP: prefix
          const expMatch = currentNotes.match(/^(EXP:\d{4}-\d{2}-\d{2}\|)/);
          const expPrefix = expMatch ? expMatch[1] : '';
          const rest = currentNotes.replace(/^EXP:\d{4}-\d{2}-\d{2}\|/, '').replace(/\[Bank Sync [^\]]+\][^|]*/g, '').replace(/^\s*\|\s*/, '').trim();
          const newNotes = expPrefix + syncNote + (rest ? ' | ' + rest : '');
          await sbPatch(`iso_payments?id=eq.${ex.id}`, {
            received_amount: iso.total,
            updated_at: new Date().toISOString(),
            notes: newNotes
          });
        } else {
          await sbPost('iso_payments', {
            iso_id: iso.isoId,
            report_month: reportMonth,
            received_amount: iso.total,
            notes: syncNote,
            status: 'pending',
            updated_at: new Date().toISOString()
          }, { Prefer: 'return=minimal' });
        }
        written++;
      } catch (e) {
        errors.push(`${iso.isoName}: ${e.message}`);
      }
    }

    return res.json({ ok: true, written, errors: errors.length ? errors : undefined });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
