// Victoria AI — Groq backend (v6 — complete always-on data context)
// Architecture: load ALL data every request, let the LLM answer anything.
// No fragile intent-detection or conditional branches for different question types.

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  });
  return res.json();
}

async function sbGetAll(path) {
  let offset = 0;
  const batch = 1000;
  let all = [];
  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}${sep}offset=${offset}&limit=${batch}`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
    });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    all = all.concat(rows);
    if (rows.length < batch) break;
    offset += batch;
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
  if (!m) return "Unknown";
  const d = new Date(m + (m.length === 7 ? "-01" : ""));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ── Agent commission map (mirrors api/_agentMap.js) ──────────────────────────
const AGENT_MAP = {
  "Brian Miller": [
    { mid: "6322970303054495", pct: 25 },
    { mid: "201100029389",     pct: 25 },
    { mid: "301128356190",     pct: 25 },
    { mid: "970100005349",     pct: 25 },
  ],
  "Drew Ukapbi": [
    { mid: "85543291507",      pct: 25 },
    { mid: "016233303005",     pct: 25 },
    { mid: "086993303104",     pct: 25 },
    { mid: "201100313023",     pct: 25 },
    { mid: "201100313015",     pct: 25 },
    { mid: "937500000052639",  pct: 25 },
    { mid: "937500000052621",  pct: 25 },
    { mid: "8739759987787143", pct: 25 },
    { mid: "8739785911030320", pct: 25 },
    { mid: "002081335951",     pct: 25 },
  ],
  "Michelle W Breier": [
    { mid: "134751",           pct: 25    },
    { mid: "30110847657",      pct: 25    },
    { mid: "40110375519",      pct: 25    },
    { mid: "40110423921",      pct: 25    },
    { mid: "40111744200",      pct: 18    },
    { mid: "50110094839",      pct: 18.75 },
    { mid: "50110214619",      pct: 25    },
    { mid: "520003548246",     pct: 33.33 },
    { mid: "941000137678",     pct: 18    },
    { mid: "926700017431398",  pct: 33.33 },
    { mid: "926700149318205",  pct: 33.33 },
    { mid: "926700416741292",  pct: 90    },
    { mid: "998300034884",     pct: 33.33 },
    { mid: "700257",           pct: 33.33 },
    { mid: "580400000002212",  pct: 33.33 },
    { mid: "633200000177278",  pct: 33.33 },
    { mid: "8034751340",       pct: 33.33 },
    { mid: "998300008813",     pct: 25    },
    { mid: "998300028357",     pct: 18, until: "2026-04-01" },
  ],
  "Claudia Perez": [],
  "Tiffany Hoffman": [
    { mid: "30119824509", pct: 10 },
  ],
  "Meghan Anderson": [
    { mid: "567000000860502", pct: 25 },
    { mid: "5160041877686",   pct: 25 },
    { mid: "941000137750",    pct: 25 },
  ],
  "Pedro Teixeira Payinsight": [
    { mid: "002327562203", pct: 30 },
  ],
};

// Months with residual data available
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

  const { question, history = [], category } = req.body || {};
  if (!question) return res.status(400).json({ error: "No question provided" });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: "GROQ_API_KEY not configured" });

  const today = new Date().toISOString().split("T")[0];
  const fullContext = [...history.map(m => m.content || ""), question].join(" ").toLowerCase();

  try {
    // ── Load everything in parallel ───────────────────────────────────────────
    const [isos, allResiduals, payments, merchants, adjustments] = await Promise.all([
      sbGet("isos?select=id,name,status&limit=100"),
      sbGetAll("residuals?select=report_month,mid,business_name,gross_volume,gross_revenue,net_revenue,paydiversenet,agent_payout,agent_split_pct,iso_id,isos(name)&order=report_month.asc"),
      sbGet("iso_payments?select=iso_id,report_month,expected_amount,received_amount,payment_date,payment_method,notes,status,isos(name)&order=report_month.desc&limit=200"),
      sbGetAll("merchants?select=mid,business_name,status,vertical,is_startup,monthly_volume,notes,current_iso_id,isos(name)"),
      sbGet("agent_adjustments?select=agent_name,report_month,mid,field_name,original_value,adjusted_value,notes,created_at&order=created_at.desc&limit=200").catch(() => []),
    ]);

    // ── Aggregate residuals ───────────────────────────────────────────────────
    const byMonth = {};       // month → totals
    const byISO   = {};       // isoName → month → totals
    const byMerchant = {};    // merchantName → totals
    const netByMidMonth = {}; // mid → month → paydiversenet (for agent calc)
    const nameByMid = {};     // mid → business_name

    allResiduals.forEach(r => {
      const m = r.report_month;
      const isoName = r.isos?.name || "Unknown";

      // by month
      if (!byMonth[m]) byMonth[m] = { paydiversenet: 0, gross_volume: 0, gross_revenue: 0, agent_payout: 0, mid_count: new Set() };
      byMonth[m].paydiversenet += (r.paydiversenet || 0);
      byMonth[m].gross_volume  += (r.gross_volume  || 0);
      byMonth[m].gross_revenue += (r.gross_revenue || 0);
      byMonth[m].agent_payout  += (r.agent_payout  || 0);
      if (r.mid) byMonth[m].mid_count.add(r.mid);

      // by ISO by month
      if (!byISO[isoName]) byISO[isoName] = {};
      if (!byISO[isoName][m]) byISO[isoName][m] = { paydiversenet: 0, gross_volume: 0, gross_revenue: 0 };
      byISO[isoName][m].paydiversenet += (r.paydiversenet || 0);
      byISO[isoName][m].gross_volume  += (r.gross_volume  || 0);
      byISO[isoName][m].gross_revenue += (r.gross_revenue || 0);

      // by merchant
      const key = r.business_name || r.mid || "Unknown";
      if (!byMerchant[key]) byMerchant[key] = { iso: isoName, mid: r.mid, net: 0, gross_volume: 0, months: new Set() };
      byMerchant[key].net          += (r.paydiversenet || 0);
      byMerchant[key].gross_volume += (r.gross_volume  || 0);
      byMerchant[key].months.add(m);

      // for agent computation
      if (r.mid) {
        if (!netByMidMonth[r.mid]) netByMidMonth[r.mid] = {};
        netByMidMonth[r.mid][m] = (netByMidMonth[r.mid][m] || 0) + (r.paydiversenet || 0);
        if (r.business_name) nameByMid[r.mid] = r.business_name;
      }
    });

    // ── Compute agent payouts for every agent × every month ──────────────────
    const agentRows = []; // flat list for easy LLM reading
    const agentAllTime = {};

    for (const [agentName, agentMerchants] of Object.entries(AGENT_MAP)) {
      agentAllTime[agentName] = 0;
      for (const month of RESIDUAL_MONTHS) {
        const active = agentMerchants.filter(e => !e.until || e.until >= month);
        let monthPayout = 0;
        const mids = [];
        active.forEach(({ mid, pct }) => {
          const net = (netByMidMonth[mid] && netByMidMonth[mid][month]) || 0;
          const earning = net * pct / 100;
          monthPayout += earning;
          if (net > 0) mids.push(`${nameByMid[mid] || mid} (${fmtK(net)} × ${pct}% = ${fmtK(earning)})`);
        });
        agentAllTime[agentName] += monthPayout;
        agentRows.push({
          agent: agentName,
          month: fmtMonth(month),
          payout: fmtK(monthPayout),
          _raw: monthPayout,
          active_merchants_with_data: mids.length,
          merchant_detail: mids.slice(0, 10)
        });
      }
    }

    // Rank agents by all-time payout
    const agentRanked = Object.entries(agentAllTime)
      .sort((a, b) => b[1] - a[1])
      .map(([agent, total], i) => ({ rank: i+1, agent, total_all_time: fmtK(total) }));

    // ── Payments summary ──────────────────────────────────────────────────────
    const overdueList = (Array.isArray(payments) ? payments : []).filter(p => {
      const exp = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1];
      return !p.received_amount && exp && exp < today;
    });
    const totalExpected = (Array.isArray(payments) ? payments : []).reduce((s,p) => s+(p.expected_amount||0), 0);
    const totalReceived = (Array.isArray(payments) ? payments : []).reduce((s,p) => s+(p.received_amount||0), 0);

    // ── Merchant counts ───────────────────────────────────────────────────────
    const activeMerchants = (Array.isArray(merchants) ? merchants : []).filter(m => m.status === "active");
    const merchantsByISO = {};
    (Array.isArray(merchants) ? merchants : []).forEach(m => {
      const n = m.isos?.name || "Unknown";
      if (!merchantsByISO[n]) merchantsByISO[n] = { active: 0, inactive: 0 };
      if (m.status === "active") merchantsByISO[n].active++; else merchantsByISO[n].inactive++;
    });

    // ── Top merchants ─────────────────────────────────────────────────────────
    const topMerchants = Object.entries(byMerchant)
      .sort((a, b) => b[1].net - a[1].net)
      .slice(0, 30)
      .map(([name, d], i) => ({
        rank: i+1,
        merchant: name,
        iso: d.iso,
        paydiversenet_all_time: fmtK(d.net),
        gross_volume_all_time: fmtK(d.gross_volume),
        months_with_data: d.months.size
      }));

    // ── Month-over-month (all ISOs combined) ──────────────────────────────────
    const monthKeys = Object.keys(byMonth).sort();
    const mom = [];
    const merchantByMonth = {};
    allResiduals.forEach(r => {
      const key = r.business_name || r.mid || "Unknown";
      if (!merchantByMonth[key]) merchantByMonth[key] = {};
      merchantByMonth[key][r.report_month] = (merchantByMonth[key][r.report_month]||0) + (r.paydiversenet||0);
    });
    for (let i = 1; i < monthKeys.length; i++) {
      const prev = monthKeys[i-1], curr = monthKeys[i];
      const prevMs = new Set(Object.keys(merchantByMonth).filter(k => merchantByMonth[k][prev] != null));
      const currMs = new Set(Object.keys(merchantByMonth).filter(k => merchantByMonth[k][curr] != null));
      const netChange = (byMonth[curr]?.paydiversenet||0) - (byMonth[prev]?.paydiversenet||0);
      const isoChanges = Object.entries(byISO)
        .map(([n, mo]) => ({ iso: n, change: (mo[curr]?.paydiversenet||0)-(mo[prev]?.paydiversenet||0) }))
        .filter(x => x.change !== 0).sort((a,b) => a.change-b.change);
      mom.push({
        from: fmtMonth(prev), to: fmtMonth(curr),
        paydiversenet_change: fmtK(netChange),
        direction: netChange >= 0 ? "UP" : "DOWN",
        merchants_left: [...prevMs].filter(k=>!currMs.has(k)).slice(0,8).map(k=>k),
        merchants_joined: [...currMs].filter(k=>!prevMs.has(k)).slice(0,8).map(k=>k),
        biggest_iso_drops: isoChanges.filter(x=>x.change<0).slice(0,5).map(x=>({ iso: x.iso, change: fmtK(x.change) })),
        biggest_iso_gains: isoChanges.filter(x=>x.change>0).reverse().slice(0,5).map(x=>({ iso: x.iso, change: fmtK(x.change) }))
      });
    }

    // ── ISO-specific detail (if user names an ISO) ────────────────────────────
    let focusedISO = null;
    const mentionedISO = isos.find(iso => fullContext.includes(iso.name.toLowerCase()));
    if (mentionedISO) {
      const isoResiduals = allResiduals.filter(r => r.iso_id === mentionedISO.id);
      const isoMerchants = (Array.isArray(merchants) ? merchants : []).filter(m => m.current_iso_id === mentionedISO.id);
      const isoByMerchant = {};
      const isoByMonth = {};
      isoResiduals.forEach(r => {
        const key = r.business_name || r.mid || "Unknown";
        if (!isoByMerchant[key]) isoByMerchant[key] = { mid: r.mid, net: 0, gross_volume: 0, months: new Set() };
        isoByMerchant[key].net          += (r.paydiversenet||0);
        isoByMerchant[key].gross_volume += (r.gross_volume||0);
        isoByMerchant[key].months.add(r.report_month);
        if (!isoByMonth[r.report_month]) isoByMonth[r.report_month] = { paydiversenet: 0, gross_volume: 0 };
        isoByMonth[r.report_month].paydiversenet += (r.paydiversenet||0);
        isoByMonth[r.report_month].gross_volume  += (r.gross_volume||0);
      });
      focusedISO = {
        name: mentionedISO.name,
        status: mentionedISO.status,
        total_merchants: isoMerchants.length,
        active_merchants: isoMerchants.filter(m=>m.status==="active").length,
        all_time_paydiversenet: fmtK(isoResiduals.reduce((s,r)=>s+(r.paydiversenet||0),0)),
        revenue_by_month: Object.entries(isoByMonth).map(([m,v])=>({ month: fmtMonth(m), paydiversenet: fmtK(v.paydiversenet), gross_volume: fmtK(v.gross_volume) })),
        top_merchants: Object.entries(isoByMerchant).sort((a,b)=>b[1].net-a[1].net).slice(0,20).map(([name,d],i)=>({
          rank: i+1, merchant: name, mid: d.mid,
          paydiversenet_all_time: fmtK(d.net),
          gross_volume_all_time: fmtK(d.gross_volume),
          months_active: d.months.size
        })),
        all_merchants: isoMerchants.map(m=>({ name: m.business_name, mid: m.mid, status: m.status, vertical: m.vertical, notes: m.notes }))
      };
    }

    // ── Assemble full context ─────────────────────────────────────────────────
    const contextData = {
      today,
      data_coverage: "Residuals: Jan 2026 – Jul 2026 | ISO Payments: Jan 2026 – Aug 2026 | Agents: all months Jan–Jul 2026",
      field_guide: {
        paydiversenet: "PayDiverse's net income — our actual earnings from each merchant",
        gross_volume: "Total $ transaction volume processed by the merchant",
        gross_revenue: "Revenue the processor earns from merchant fees",
        agent_payout: "Commission paid to the referring sales agent",
        expected_amount: "Amount we expect an ISO to pay us for that month's residuals",
        received_amount: "Amount actually received from the ISO"
      },

      // ── ISOs ──
      iso_list: isos.map(i => `${i.name} (${i.status})`).join(", "),
      iso_count: { total: isos.length, active: isos.filter(i=>i.status==="active").length },

      // ── Revenue by month (all ISOs combined) ──
      monthly_revenue: Object.entries(byMonth).map(([m,v]) => ({
        month: fmtMonth(m),
        paydiversenet: fmtK(v.paydiversenet),
        gross_volume: fmtK(v.gross_volume),
        gross_revenue: fmtK(v.gross_revenue),
        active_mids: v.mid_count.size
      })),
      overall_totals: {
        all_time_paydiversenet: fmtK(Object.values(byMonth).reduce((s,v)=>s+v.paydiversenet,0)),
        all_time_gross_volume:  fmtK(Object.values(byMonth).reduce((s,v)=>s+v.gross_volume,0)),
        months_with_data: monthKeys.map(fmtMonth)
      },

      // ── Per-ISO monthly breakdown ──
      iso_monthly_revenue: Object.entries(byISO).map(([isoName, months]) => ({
        iso: isoName,
        all_time_paydiversenet: fmtK(Object.values(months).reduce((s,v)=>s+v.paydiversenet,0)),
        by_month: Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0])).map(([m,v]) => ({
          month: fmtMonth(m),
          paydiversenet: fmtK(v.paydiversenet),
          gross_volume: fmtK(v.gross_volume)
        }))
      })).sort((a,b) => {
        const ra = Object.values(byISO[a.iso]||{}).reduce((s,v)=>s+v.paydiversenet,0);
        const rb = Object.values(byISO[b.iso]||{}).reduce((s,v)=>s+v.paydiversenet,0);
        return rb - ra;
      }),

      // ── Top merchants ──
      top_30_merchants_all_time: topMerchants,

      // ── Month-over-month ──
      month_over_month: mom,

      // ── Merchants ──
      merchants: {
        total: (Array.isArray(merchants)?merchants:[]).length,
        active: activeMerchants.length,
        inactive: (Array.isArray(merchants)?merchants:[]).length - activeMerchants.length,
        by_iso: Object.entries(merchantsByISO)
          .sort((a,b)=>(b[1].active+b[1].inactive)-(a[1].active+a[1].inactive))
          .map(([n,d])=>({ iso: n, active: d.active, inactive: d.inactive, total: d.active+d.inactive }))
      },

      // ── ISO Payments ──
      iso_payments: {
        total_expected: fmtK(totalExpected),
        total_received: fmtK(totalReceived),
        variance: fmtK(totalReceived - totalExpected),
        overdue_count: overdueList.length,
        overdue_total: fmtK(overdueList.reduce((s,p)=>s+(p.expected_amount||0),0)),
        overdue_list: overdueList.map(p=>({
          iso: p.isos?.name,
          month: fmtMonth(p.report_month),
          expected: fmtK(p.expected_amount),
          due_date: p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1] || null
        })),
        all_records: (Array.isArray(payments)?payments:[]).slice(0,60).map(p=>({
          iso: p.isos?.name,
          month: fmtMonth(p.report_month),
          expected: fmtK(p.expected_amount),
          received: p.received_amount != null ? fmtK(p.received_amount) : "pending",
          payment_date: p.payment_date || null,
          payment_method: p.payment_method || null,
          status: p.status,
          overdue: !p.received_amount && (p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]||"") < today
        }))
      },

      // ── Agent payouts (full, every agent × every month) ──
      agents: {
        note: "Payout = (agent commission %) × (PayDiverse net residual for their MIDs). Calculated from actual residuals in database.",
        ranked_all_time: agentRanked,
        by_month: agentRows.map(({ _raw, ...r }) => r),
        adjustments: (Array.isArray(adjustments)?adjustments:[])
          .filter(a => a.field_name !== "deleted_row")
          .slice(0,30)
          .map(a => ({
            agent: a.agent_name,
            month: fmtMonth(a.report_month),
            type: a.field_name,
            original: a.original_value != null ? fmtK(a.original_value) : null,
            adjusted: fmtK(a.adjusted_value),
            notes: a.notes
          }))
      },

      // ── Focused ISO detail (only when user names a specific ISO) ──
      ...(focusedISO ? { focused_iso_detail: focusedISO } : {})
    };

    // ── System prompt ─────────────────────────────────────────────────────────
    const systemPrompt = `You are Victoria, an intelligent data assistant for PayDiverse — a payment facilitator that manages ISO residuals and merchant accounts.

Today: ${today}
Data coverage: Residuals Jan–Jul 2026 | ISO Payments Jan–Aug 2026 | Agents: all months Jan–Jul 2026

Key field definitions:
- paydiversenet: PayDiverse's net income (what we actually earn from each merchant)
- gross_volume: Total $ transaction volume processed by the merchant
- gross_revenue: Revenue the processor earns from merchant fees
- agent_payout: Commission paid to referring agent
- expected_amount: What we expect the ISO to pay us

You have COMPLETE data for all months, all ISOs, all agents, all merchants, and all payments below. Answer any question directly from this data. Never say data is unavailable if it appears below.

Data:
${JSON.stringify(contextData)}

Rules:
1. Answer ONLY from the data above. Never fabricate numbers.
2. Format dollar amounts with $ and commas.
3. For agent questions: use the agents.by_month and agents.ranked_all_time sections. To answer a range question (e.g. Jan–Jul), sum the monthly payouts for each agent across those months.
4. For monthly trends: use monthly_revenue and iso_monthly_revenue.
5. For merchant questions: use top_30_merchants_all_time; for ISO-specific merchants, use focused_iso_detail.
6. Be concise and direct. No filler phrases.
7. CRITICAL FORMATTING: plain text only. Do NOT write ** or * or # or | characters. Use "- " for bullet points.`;

    // ── Call Groq ─────────────────────────────────────────────────────────────
    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-4).map(m =>
        m.role === "assistant" && m.content && m.content.length > 400
          ? { ...m, content: m.content.slice(0, 400) + "…" }
          : m
      ),
      { role: "user", content: question }
    ];

    const MODELS = ["openai/gpt-oss-120b", "groq/compound", "openai/gpt-oss-20b"];
    let answer = null;
    let lastError = null;
    for (const model of MODELS) {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: groqMessages, temperature: 0.1, max_tokens: 1500 })
      });
      const groqData = await groqRes.json();
      if (groqData.error) {
        const msg = groqData.error.message || "";
        const skipToNext = msg.includes("Rate limit") || msg.includes("decommissioned") || msg.includes("does not exist") || msg.includes("do not have access") || msg.includes("Entity Too Large") || msg.includes("context_length") || msg.includes("context length") || msg.includes("too long") || groqRes.status === 413;
        if (skipToNext) { lastError = `${model}: ${msg.slice(0,100)}`; continue; }
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
    console.error("Victoria API error:", err);
    return res.status(500).json({ error: "Failed to fetch data. Please try again." });
  }
}
