// Victoria AI — Groq backend (v7 — complete data, compact context)
// Loads ALL data every request. Uses compact dict-of-dicts format to stay within model token limits.

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  });
  return res.json();
}

async function sbGetAll(path) {
  let offset = 0, all = [];
  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}${sep}offset=${offset}&limit=1000`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
    });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    all = all.concat(rows);
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return all;
}

function fmt(n) { return n != null ? `$${Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}` : "--"; }
function fmtK(n) {
  if (!n && n !== 0) return "$0";
  if (Math.abs(n) >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return fmt(n);
}
function fmtMonth(m) {
  if (!m) return "?";
  const d = new Date(m + (m.length === 7 ? "-01" : ""));
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ── Agent commission map ───────────────────────────────────────────────────────
const AGENT_MAP = {
  "Brian Miller": [
    { mid: "6322970303054495", pct: 25 }, { mid: "201100029389", pct: 25 },
    { mid: "301128356190", pct: 25 },     { mid: "970100005349", pct: 25 },
  ],
  "Drew Ukapbi": [
    { mid: "85543291507", pct: 25 },      { mid: "016233303005", pct: 25 },
    { mid: "086993303104", pct: 25 },     { mid: "201100313023", pct: 25 },
    { mid: "201100313015", pct: 25 },     { mid: "937500000052639", pct: 25 },
    { mid: "937500000052621", pct: 25 },  { mid: "8739759987787143", pct: 25 },
    { mid: "8739785911030320", pct: 25 }, { mid: "002081335951", pct: 25 },
  ],
  "Michelle W Breier": [
    { mid: "134751", pct: 25 },           { mid: "30110847657", pct: 25 },
    { mid: "40110375519", pct: 25 },      { mid: "40110423921", pct: 25 },
    { mid: "40111744200", pct: 18 },      { mid: "50110094839", pct: 18.75 },
    { mid: "50110214619", pct: 25 },      { mid: "520003548246", pct: 33.33 },
    { mid: "941000137678", pct: 18 },     { mid: "926700017431398", pct: 33.33 },
    { mid: "926700149318205", pct: 33.33 },{ mid: "926700416741292", pct: 90 },
    { mid: "998300034884", pct: 33.33 },  { mid: "700257", pct: 33.33 },
    { mid: "580400000002212", pct: 33.33 },{ mid: "633200000177278", pct: 33.33 },
    { mid: "8034751340", pct: 33.33 },    { mid: "998300008813", pct: 25 },
    { mid: "998300028357", pct: 18, until: "2026-04-01" },
  ],
  "Claudia Perez": [],
  "Tiffany Hoffman":           [{ mid: "30119824509", pct: 10 }],
  "Meghan Anderson": [
    { mid: "567000000860502", pct: 25 }, { mid: "5160041877686", pct: 25 },
    { mid: "941000137750", pct: 25 },
  ],
  "Pedro Teixeira Payinsight": [{ mid: "002327562203", pct: 30 }],
};

const RESIDUAL_MONTHS = [
  "2026-01-01","2026-02-01","2026-03-01","2026-04-01",
  "2026-05-01","2026-06-01","2026-07-01"
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { question, history = [] } = req.body || {};
  if (!question) return res.status(400).json({ error: "No question provided" });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: "GROQ_API_KEY not configured" });

  const today = new Date().toISOString().split("T")[0];
  const fullContext = [...history.map(m => m.content || ""), question].join(" ").toLowerCase();

  try {
    // ── Load everything in parallel ───────────────────────────────────────────
    const [isos, allResiduals, payments, merchants, adjustments] = await Promise.all([
      sbGet("isos?select=id,name,status&limit=100"),
      sbGetAll("residuals?select=report_month,mid,business_name,paydiversenet,gross_volume,gross_revenue,iso_id,isos(name)&order=report_month.asc"),
      sbGet("iso_payments?select=iso_id,report_month,expected_amount,received_amount,notes,status,isos(name)&order=report_month.desc&limit=200"),
      sbGet("merchants?select=status,isos(name)&limit=2000"),
      sbGet("agent_adjustments?select=agent_name,report_month,field_name,adjusted_value,notes&order=created_at.desc&limit=50").catch(() => []),
    ]);

    const residuals = Array.isArray(allResiduals) ? allResiduals : [];
    const pays = Array.isArray(payments) ? payments : [];
    const merch = Array.isArray(merchants) ? merchants : [];

    // ── Aggregate residuals ───────────────────────────────────────────────────
    // month → totals
    const byMonth = {};
    // isoName → month → paydiversenet
    const isoMonth = {};
    // mid → month → net  (for agent calc)
    const midMonth = {};
    // merchantName → { iso, net, months }
    const byMerchant = {};

    residuals.forEach(r => {
      const m = r.report_month;
      const iso = r.isos?.name || "Unknown";
      const pdn = r.paydiversenet || 0;
      const gv  = r.gross_volume  || 0;
      const gr  = r.gross_revenue || 0;

      if (!byMonth[m]) byMonth[m] = { pdn: 0, gv: 0, gr: 0 };
      byMonth[m].pdn += pdn; byMonth[m].gv += gv; byMonth[m].gr += gr;

      if (!isoMonth[iso]) isoMonth[iso] = {};
      isoMonth[iso][m] = (isoMonth[iso][m] || 0) + pdn;

      if (r.mid) {
        if (!midMonth[r.mid]) midMonth[r.mid] = {};
        midMonth[r.mid][m] = (midMonth[r.mid][m] || 0) + pdn;
      }

      const key = r.business_name || r.mid || "?";
      if (!byMerchant[key]) byMerchant[key] = { iso, net: 0, mo: 0 };
      byMerchant[key].net += pdn;
      byMerchant[key].mo  += 1;
    });

    // ── Agent payouts: compact dict format ───────────────────────────────────
    // agentPayouts[agentName][monthLabel] = formatted payout
    const agentPayouts = {};
    const agentTotals  = {};

    for (const [name, entries] of Object.entries(AGENT_MAP)) {
      agentPayouts[name] = {};
      let total = 0;
      for (const month of RESIDUAL_MONTHS) {
        const active = entries.filter(e => !e.until || e.until >= month);
        let mp = 0;
        active.forEach(({ mid, pct }) => {
          mp += ((midMonth[mid] && midMonth[mid][month]) || 0) * pct / 100;
        });
        agentPayouts[name][fmtMonth(month)] = fmtK(mp);
        total += mp;
      }
      agentTotals[name] = fmtK(total);
    }

    // Agent ranking (sorted by raw total)
    const agentRanking = Object.entries(AGENT_MAP).map(([name, entries]) => {
      const raw = RESIDUAL_MONTHS.reduce((s, month) => {
        const active = entries.filter(e => !e.until || e.until >= month);
        return s + active.reduce((ss, { mid, pct }) => ss + ((midMonth[mid]?.[month] || 0) * pct / 100), 0);
      }, 0);
      return { agent: name, total: fmtK(raw), _r: raw };
    }).sort((a,b) => b._r - a._r).map(({ _r, ...x }) => x);

    // ── ISO monthly revenue: compact dict ────────────────────────────────────
    // isoRevenue[isoName] = { "Jan 2026": "$1.2K", ..., total: "$8K" }
    const isoRevenue = {};
    for (const [iso, months] of Object.entries(isoMonth)) {
      isoRevenue[iso] = {};
      let t = 0;
      for (const m of RESIDUAL_MONTHS) {
        const v = months[m] || 0;
        isoRevenue[iso][fmtMonth(m)] = fmtK(v);
        t += v;
      }
      isoRevenue[iso]["TOTAL Jan-Jul"] = fmtK(t);
    }

    // ── Monthly totals ───────────────────────────────────────────────────────
    const monthlyTotals = Object.entries(byMonth).map(([m,v]) => ({
      month: fmtMonth(m),
      paydiversenet: fmtK(v.pdn),
      gross_volume: fmtK(v.gv),
      gross_revenue: fmtK(v.gr),
    }));
    const grandTotal = Object.values(byMonth).reduce((s,v)=>s+v.pdn,0);

    // ── Top 20 merchants ─────────────────────────────────────────────────────
    const top20 = Object.entries(byMerchant)
      .sort((a,b) => b[1].net - a[1].net)
      .slice(0,20)
      .map(([name,d],i) => ({ rank:i+1, merchant:name, iso:d.iso, paydiversenet:fmtK(d.net), months:d.mo }));

    // ── Payments ─────────────────────────────────────────────────────────────
    const overdueList = pays.filter(p => {
      const exp = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1];
      return !p.received_amount && exp && exp < today;
    }).map(p => ({
      iso: p.isos?.name,
      month: fmtMonth(p.report_month),
      expected: fmtK(p.expected_amount),
      due: p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1] || null
    }));

    // Compact payment records: iso → month → "received $X / expected $Y"
    const payRecords = {};
    pays.forEach(p => {
      const iso = p.isos?.name || "?";
      const mo  = fmtMonth(p.report_month);
      payRecords[`${iso} | ${mo}`] = p.received_amount != null
        ? `received ${fmtK(p.received_amount)} of ${fmtK(p.expected_amount)}`
        : `pending ${fmtK(p.expected_amount)}`;
    });

    const totalExp = pays.reduce((s,p)=>s+(p.expected_amount||0),0);
    const totalRec = pays.reduce((s,p)=>s+(p.received_amount||0),0);

    // ── Merchant counts ───────────────────────────────────────────────────────
    const mByISO = {};
    merch.forEach(m => {
      const n = m.isos?.name || "?";
      if (!mByISO[n]) mByISO[n] = { a:0, i:0 };
      if (m.status==="active") mByISO[n].a++; else mByISO[n].i++;
    });
    const merchantCounts = Object.entries(mByISO)
      .sort((a,b)=>(b[1].a+b[1].i)-(a[1].a+a[1].i))
      .map(([iso,d])=>`${iso}: ${d.a+d.i} total (${d.a} active)`);

    // ── ISO-specific detail (only when user names an ISO) ────────────────────
    let focusedISO = null;
    const mentionedISO = Array.isArray(isos)
      ? isos.find(iso => fullContext.includes(iso.name.toLowerCase()))
      : null;
    if (mentionedISO) {
      const isoResiduals = residuals.filter(r => r.iso_id === mentionedISO.id);
      const isoByMerch = {};
      isoResiduals.forEach(r => {
        const key = r.business_name || r.mid || "?";
        if (!isoByMerch[key]) isoByMerch[key] = { net:0, mo: new Set() };
        isoByMerch[key].net += (r.paydiversenet||0);
        isoByMerch[key].mo.add(r.report_month);
      });
      focusedISO = {
        name: mentionedISO.name,
        all_time_paydiversenet: fmtK(isoResiduals.reduce((s,r)=>s+(r.paydiversenet||0),0)),
        revenue_by_month: isoRevenue[mentionedISO.name] || {},
        top_merchants: Object.entries(isoByMerch)
          .sort((a,b)=>b[1].net-a[1].net).slice(0,20)
          .map(([name,d],i)=>({ rank:i+1, merchant:name, paydiversenet:fmtK(d.net), months:d.mo.size }))
      };
    }

    // ── Adjustments log ──────────────────────────────────────────────────────
    const adjLog = (Array.isArray(adjustments)?adjustments:[])
      .filter(a=>a.field_name!=="deleted_row")
      .slice(0,15)
      .map(a=>({ agent:a.agent_name, month:fmtMonth(a.report_month), type:a.field_name, value:fmtK(a.adjusted_value), notes:a.notes }));

    // ── Assemble compact context ──────────────────────────────────────────────
    const ctx = {
      today,
      data_coverage: "Residuals: Jan–Jul 2026 | Payments: Jan–Aug 2026 | All 7 agents computed",
      iso_list: Array.isArray(isos) ? isos.map(i=>`${i.name}(${i.status})`).join(", ") : "",

      // Monthly totals — all ISOs combined
      monthly_revenue_all_isos: monthlyTotals,
      grand_total_paydiversenet_jan_jul: fmtK(grandTotal),

      // Per-ISO per-month paydiversenet (compact: isoName → {month: amount})
      iso_revenue_by_month: isoRevenue,

      // Top 20 merchants all-time
      top_20_merchants: top20,

      // Merchant counts
      merchant_counts: { total: merch.length, active: merch.filter(m=>m.status==="active").length, by_iso: merchantCounts },

      // ISO payments
      iso_payments: {
        total_expected: fmtK(totalExp),
        total_received: fmtK(totalRec),
        variance: fmtK(totalRec-totalExp),
        overdue_count: overdueList.length,
        overdue_list: overdueList,
        all_records: payRecords
      },

      // Agent payouts — complete: every agent, every month
      agent_payouts: {
        note: "Payout = paydiversenet of agent MIDs × commission %. Computed from actual residuals.",
        all_time_ranking: agentRanking,
        by_month: agentPayouts,   // agentPayouts["Brian Miller"]["Jul 2026"] = "$226"
        all_time_totals: agentTotals  // agentTotals["Brian Miller"] = "$740"
      },

      // Manual adjustments log
      adjustments_log: adjLog,

      // ISO detail (only present when user mentions a specific ISO)
      ...(focusedISO ? { focused_iso: focusedISO } : {})
    };

    const systemPrompt = `You are Victoria, an intelligent data assistant for PayDiverse — a payment facilitator managing ISO residuals and merchant accounts.

Today: ${today}
Data available: Residuals Jan–Jul 2026 | ISO Payments Jan–Aug 2026 | 7 agents with monthly payouts

Field definitions:
- paydiversenet: PayDiverse's net income (what we actually earn)
- gross_volume: Total $ transaction volume processed
- gross_revenue: Revenue the processor earns from merchant fees
- agent_payout: Commission paid to referring agent (= agent's % × paydiversenet of their MIDs)

COMPLETE DATA (all months, all ISOs, all agents):
${JSON.stringify(ctx)}

Rules:
1. Answer ONLY from the data above. Never fabricate numbers.
2. For agent questions: use agent_payouts.by_month (keyed by agent name then month) and agent_payouts.all_time_totals. To get a range total, sum the monthly values yourself.
3. For monthly trends: use monthly_revenue_all_isos and iso_revenue_by_month.
4. For ISO-specific merchants: use focused_iso if present, otherwise top_20_merchants.
5. Format dollar amounts with $ and commas. Be concise and direct.
6. Plain text only — no **, no *, no #, no | characters. Use "- " for bullets.`;

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-4).map(m =>
        m.role === "assistant" && m.content?.length > 400
          ? { ...m, content: m.content.slice(0, 400) + "…" }
          : m
      ),
      { role: "user", content: question }
    ];

    const MODELS = ["openai/gpt-oss-120b", "groq/compound", "openai/gpt-oss-20b"];
    let answer = null, lastError = null;
    for (const model of MODELS) {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: groqMessages, temperature: 0.1, max_tokens: 1500 })
      });
      const groqData = await groqRes.json();
      if (groqData.error) {
        const msg = groqData.error.message || "";
        const skip = msg.includes("Rate limit") || msg.includes("decommissioned") || msg.includes("does not exist") || msg.includes("do not have access") || msg.includes("Entity Too Large") || msg.includes("context_length") || msg.includes("too long") || groqRes.status === 413;
        if (skip) { lastError = `${model}: ${msg.slice(0,120)}`; continue; }
        return res.status(500).json({ error: `Groq error: ${msg}` });
      }
      answer = groqData.choices[0].message.content;
      break;
    }
    if (!answer) return res.status(500).json({ error: `All models failed: ${lastError}` });

    answer = answer.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    answer = answer
      .replace(/\*\*(.*?)\*\*/gs, '$1')
      .replace(/\*(.*?)\*/gs, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\|.*\|.*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return res.json({ answer });

  } catch (err) {
    console.error("Victoria error:", err);
    return res.status(500).json({ error: "Failed to fetch data. Please try again." });
  }
}
