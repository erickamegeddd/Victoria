// Victoria AI — Groq backend (v8 — selective loading, comprehensive coverage)
// Loads targeted data per question type to stay within model token limits.
// Each branch loads exactly what's needed to answer that category of question.

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return []; }
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
function fmtM(m) {
  if (!m) return "?";
  const d = new Date(m + (m.length === 7 ? "-01" : ""));
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ── Agent commission map ──────────────────────────────────────────────────────
const AGENT_MAP = {
  "Brian Miller": [
    { mid: "6322970303054495", pct: 25 }, { mid: "201100029389", pct: 25 },
    { mid: "301128356190",     pct: 25 }, { mid: "970100005349", pct: 25 },
  ],
  "Drew Ukapbi": [
    { mid: "85543291507",      pct: 25 }, { mid: "016233303005",     pct: 25 },
    { mid: "086993303104",     pct: 25 }, { mid: "201100313023",     pct: 25 },
    { mid: "201100313015",     pct: 25 }, { mid: "937500000052639",  pct: 25 },
    { mid: "937500000052621",  pct: 25 }, { mid: "8739759987787143", pct: 25 },
    { mid: "8739785911030320", pct: 25 }, { mid: "002081335951",     pct: 25 },
  ],
  "Michelle W Breier": [
    { mid: "134751",           pct: 25    }, { mid: "30110847657",     pct: 25    },
    { mid: "40110375519",      pct: 25    }, { mid: "40110423921",     pct: 25    },
    { mid: "40111744200",      pct: 18    }, { mid: "50110094839",     pct: 18.75 },
    { mid: "50110214619",      pct: 25    }, { mid: "520003548246",    pct: 33.33 },
    { mid: "941000137678",     pct: 18    }, { mid: "926700017431398", pct: 33.33 },
    { mid: "926700149318205",  pct: 33.33 }, { mid: "926700416741292", pct: 90    },
    { mid: "998300034884",     pct: 33.33 }, { mid: "700257",          pct: 33.33 },
    { mid: "580400000002212",  pct: 33.33 }, { mid: "633200000177278", pct: 33.33 },
    { mid: "8034751340",       pct: 33.33 }, { mid: "998300008813",    pct: 25    },
    { mid: "998300028357",     pct: 18, until: "2026-04-01" },
  ],
  "Claudia Perez":             [],
  "Tiffany Hoffman":           [{ mid: "30119824509", pct: 10 }],
  "Meghan Anderson": [
    { mid: "567000000860502", pct: 25 }, { mid: "5160041877686", pct: 25 },
    { mid: "941000137750",    pct: 25 },
  ],
  "Pedro Teixeira Payinsight": [{ mid: "002327562203", pct: 30 }],
};

const ALL_MONTHS = [
  "2026-01-01","2026-02-01","2026-03-01","2026-04-01",
  "2026-05-01","2026-06-01","2026-07-01"
];

// Detect month range or single month from query text
function detectMonths(ctx) {
  const MAP = {
    january:"2026-01-01", february:"2026-02-01", march:"2026-03-01",
    april:"2026-04-01",   may:"2026-05-01",       june:"2026-06-01",
    july:"2026-07-01",    august:"2026-08-01",     september:"2026-09-01",
    october:"2026-10-01", november:"2026-11-01",   december:"2026-12-01",
    jan:"2026-01-01", feb:"2026-02-01", mar:"2026-03-01", apr:"2026-04-01",
    jun:"2026-06-01", jul:"2026-07-01", aug:"2026-08-01", sep:"2026-09-01",
    oct:"2026-10-01", nov:"2026-11-01", dec:"2026-12-01",
  };
  const QUARTERS = {
    q1:["2026-01-01","2026-02-01","2026-03-01"],
    q2:["2026-04-01","2026-05-01","2026-06-01"],
    q3:["2026-07-01","2026-08-01","2026-09-01"],
    q4:["2026-10-01","2026-11-01","2026-12-01"],
  };
  for (const [q,ms] of Object.entries(QUARTERS)) if (ctx.includes(q)) return ms;

  // Range: "january to july", "jan through jun", "january - july"
  const names = Object.keys(MAP).join("|");
  const m = ctx.match(new RegExp(`\\b(${names})\\b[^a-z]{0,20}(?:to|through|–|-)\\s*(?:the end of\\s*)?\\b(${names})\\b`));
  if (m && MAP[m[1]] && MAP[m[2]]) {
    const si = ALL_MONTHS.indexOf(MAP[m[1]]);
    const ei = ALL_MONTHS.indexOf(MAP[m[2]]);
    if (si !== -1 && ei !== -1 && si <= ei) return ALL_MONTHS.slice(si, ei + 1);
  }

  // Single month
  for (const [name, val] of Object.entries(MAP)) if (ctx.includes(name)) return [val];
  return null;
}

// Compute agent payouts given a mid→month→net map (built from fetched residuals)
function calcAgentPayouts(midMonth, months) {
  return Object.entries(AGENT_MAP).map(([agent, entries]) => {
    const byMonth = {};
    let total = 0;
    for (const month of months) {
      const active = entries.filter(e => !e.until || e.until >= month);
      let mp = active.reduce((s, { mid, pct }) => s + ((midMonth[mid]?.[month] || 0) * pct / 100), 0);
      byMonth[fmtM(month)] = fmtK(mp);
      total += mp;
    }
    return { agent, total: fmtK(total), _raw: total, by_month: byMonth };
  }).sort((a,b) => b._raw - a._raw);
}

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
  const qLow = question.toLowerCase();
  const fullCtx = [...history.slice(-3).map(m => m.content || ""), question].join(" ").toLowerCase();

  // Detect intent signals
  const months = detectMonths(qLow) || detectMonths(fullCtx);
  const isAnalysis = /why|how come|reason|went down|went up|decreas|increas|drop|chang|trend|compar|differ|less than|more than|previous|last month|versus|vs\./.test(fullCtx);
  const agentNames = Object.keys(AGENT_MAP).map(n => n.toLowerCase());
  const isAgentQ = (fullCtx.includes("agent") || agentNames.some(n => n.split(" ")[0].length > 3 && fullCtx.includes(n.split(" ")[0])))
    && /paid|payout|earn|commission|highest|most|who|how much|total|amount|rank|residu/.test(fullCtx);
  const isPaymentQ = /payment|collected|received|overdue|past due|late|reconcil|owed/.test(fullCtx);
  const isMerchantQ = fullCtx.includes("merchant") && !isAgentQ;
  const isISOQ = (fullCtx.includes("iso") || /performance|ranking|revenue by|compare|which.*best|top.*iso|all iso/.test(fullCtx)) && !isAgentQ && !isPaymentQ && !isMerchantQ;

  try {
    const isos = await sbGet("isos?select=id,name,status&limit=100");
    const isoArr = Array.isArray(isos) ? isos : [];
    const mentionedISO = isoArr.find(iso => fullCtx.includes(iso.name.toLowerCase()));

    let contextData = {
      today,
      data_available: "Residuals Jan–Jul 2026 | Payments Jan–Aug 2026 | 7 agents (payouts computed from residuals × commission %)",
      iso_list: isoArr.map(i => i.name).join(", "),
    };

    // ── 1. ISO-specific ───────────────────────────────────────────────────────
    if (mentionedISO) {
      let rq = `residuals?select=report_month,mid,business_name,gross_volume,gross_revenue,paydiversenet,agent_payout&iso_id=eq.${mentionedISO.id}&order=report_month.asc&limit=2000`;
      if (months?.length === 1 && !isAnalysis) rq += `&report_month=eq.${months[0]}`;

      const [residuals, isoMerch, payments] = await Promise.all([
        sbGetAll(rq),
        sbGetAll(`merchants?select=mid,business_name,status,vertical,notes&current_iso_id=eq.${mentionedISO.id}`),
        sbGet(`iso_payments?select=report_month,expected_amount,received_amount,notes,status&iso_id=eq.${mentionedISO.id}&order=report_month.desc&limit=24`),
      ]);

      const byMonth = {}, byMerch = {};
      (Array.isArray(residuals)?residuals:[]).forEach(r => {
        if (!byMonth[r.report_month]) byMonth[r.report_month] = { pdn:0, gv:0, gr:0 };
        byMonth[r.report_month].pdn += (r.paydiversenet||0);
        byMonth[r.report_month].gv  += (r.gross_volume||0);
        byMonth[r.report_month].gr  += (r.gross_revenue||0);
        const k = r.business_name||r.mid||"?";
        if (!byMerch[k]) byMerch[k] = { net:0, mo: new Set() };
        byMerch[k].net += (r.paydiversenet||0); byMerch[k].mo.add(r.report_month);
      });

      contextData.iso_detail = {
        name: mentionedISO.name,
        total_merchants: (Array.isArray(isoMerch)?isoMerch:[]).length,
        active_merchants: (Array.isArray(isoMerch)?isoMerch:[]).filter(m=>m.status==="active").length,
        all_merchants: (Array.isArray(isoMerch)?isoMerch:[]).map(m=>({ name:m.business_name, mid:m.mid, status:m.status, vertical:m.vertical, notes:m.notes })),
        revenue_by_month: Object.entries(byMonth).map(([m,v])=>({ month:fmtM(m), paydiversenet:fmtK(v.pdn), gross_volume:fmtK(v.gv), gross_revenue:fmtK(v.gr) })),
        top_merchants: Object.entries(byMerch).sort((a,b)=>b[1].net-a[1].net).slice(0,20)
          .map(([name,d],i)=>({ rank:i+1, merchant:name, paydiversenet:fmtK(d.net), months:d.mo.size })),
        payments: (Array.isArray(payments)?payments:[]).map(p=>({
          month:fmtM(p.report_month), expected:fmtK(p.expected_amount),
          received:p.received_amount!=null?fmtK(p.received_amount):"pending",
          due:p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]||null, status:p.status
        }))
      };

    // ── 2. Agent questions ────────────────────────────────────────────────────
    } else if (isAgentQ) {
      const targetMonths = (months && !isAnalysis) ? months : ALL_MONTHS;
      // Only fetch MIDs relevant to agents
      const allMids = new Set(Object.values(AGENT_MAP).flat().map(e=>e.mid));
      const monthIn = targetMonths.length === 1
        ? `&report_month=eq.${targetMonths[0]}`
        : `&report_month=in.(${targetMonths.join(",")})`;
      const rows = await sbGet(
        `residuals?select=mid,paydiversenet,business_name,report_month&mid=in.(${[...allMids].join(",")})${monthIn}&limit=5000`
      );

      // Build mid→month→net map
      const midMonth = {};
      const nameByMid = {};
      (Array.isArray(rows)?rows:[]).forEach(r => {
        if (!midMonth[r.mid]) midMonth[r.mid] = {};
        midMonth[r.mid][r.report_month] = (midMonth[r.mid][r.report_month]||0) + (r.paydiversenet||0);
        if (r.business_name) nameByMid[r.mid] = r.business_name;
      });

      const payouts = calcAgentPayouts(midMonth, targetMonths);
      // Find if a specific agent is named
      const namedAgent = Object.keys(AGENT_MAP).find(n => fullCtx.includes(n.split(" ")[0].toLowerCase()) && n.split(" ")[0].length > 3);

      contextData.agent_payouts = {
        period: targetMonths.length === 1 ? fmtM(targetMonths[0]) : `${fmtM(targetMonths[0])} – ${fmtM(targetMonths[targetMonths.length-1])}`,
        note: "Payout = paydiversenet of agent's MIDs × commission %. Data from actual residuals.",
        ranked: payouts.map(({ _raw, ...x }) => x),
        highlighted: namedAgent ? payouts.find(p=>p.agent===namedAgent) : undefined,
      };

    // ── 3. Payment questions ──────────────────────────────────────────────────
    } else if (isPaymentQ || category === "payments" || category === "overdue") {
      let pq = `iso_payments?select=iso_id,report_month,expected_amount,received_amount,notes,status,isos(name)&order=report_month.desc&limit=200`;
      if (months?.length === 1) pq += `&report_month=eq.${months[0]}`;
      const pays = await sbGet(pq);
      const pArr = Array.isArray(pays)?pays:[];
      const overdue = pArr.filter(p=>{ const e=p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]; return !p.received_amount&&e&&e<today; });
      contextData.payments = {
        total_expected: fmtK(pArr.reduce((s,p)=>s+(p.expected_amount||0),0)),
        total_received: fmtK(pArr.reduce((s,p)=>s+(p.received_amount||0),0)),
        overdue_count: overdue.length,
        overdue_list: overdue.map(p=>({ iso:p.isos?.name, month:fmtM(p.report_month), expected:fmtK(p.expected_amount), due:p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]||null })),
        records: pArr.slice(0,40).map(p=>({ iso:p.isos?.name, month:fmtM(p.report_month), expected:fmtK(p.expected_amount), received:p.received_amount!=null?fmtK(p.received_amount):"pending", status:p.status, overdue:!p.received_amount&&(p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]||"")<today }))
      };

    // ── 4. Merchant questions ─────────────────────────────────────────────────
    } else if (isMerchantQ || category === "merchants") {
      let rq = "residuals?select=mid,business_name,paydiversenet,gross_volume,iso_id,isos(name),report_month&order=paydiversenet.desc";
      if (months?.length === 1 && !isAnalysis) rq += `&report_month=eq.${months[0]}`;
      const [residuals, merch] = await Promise.all([
        sbGetAll(rq),
        sbGet("merchants?select=status,business_name,vertical,is_startup,isos(name)&limit=1000"),
      ]);
      const byMid = {};
      (Array.isArray(residuals)?residuals:[]).forEach(r => {
        const k=r.business_name||r.mid||"?";
        if (!byMid[k]) byMid[k]={ iso:r.isos?.name||"?", net:0, gv:0, months: new Set() };
        byMid[k].net+=(r.paydiversenet||0); byMid[k].gv+=(r.gross_volume||0); byMid[k].months.add(r.report_month);
      });
      const ranked = Object.entries(byMid).sort((a,b)=>b[1].net-a[1].net);
      const mArr = Array.isArray(merch)?merch:[];
      const byISO={};
      mArr.forEach(m=>{ const n=m.isos?.name||"?"; if(!byISO[n]) byISO[n]={a:0,i:0}; if(m.status==="active") byISO[n].a++; else byISO[n].i++; });
      contextData.merchants = {
        total: mArr.length, active: mArr.filter(m=>m.status==="active").length,
        by_iso: Object.entries(byISO).sort((a,b)=>(b[1].a+b[1].i)-(a[1].a+a[1].i)).map(([n,d])=>({ iso:n, active:d.a, inactive:d.i })),
        top_25_by_residual: ranked.slice(0,25).map(([name,d],i)=>({ rank:i+1, merchant:name, iso:d.iso, paydiversenet:fmtK(d.net), gross_volume:fmtK(d.gv), months:d.months.size })),
      };

    // ── 5. General / summary ──────────────────────────────────────────────────
    } else if (isISOQ) {
      // Lighter ISO summary — no sbGetAll for individual rows, no merchant count, no agent calc
      const [isoResiduals, pays] = await Promise.all([
        sbGetAll("residuals?select=report_month,paydiversenet,gross_volume,iso_id,isos(name)&order=report_month.asc"),
        sbGet("iso_payments?select=report_month,expected_amount,received_amount,notes,status,isos(name)&order=report_month.desc&limit=100"),
      ]);
      const byISO = {}, byMonth = {};
      (Array.isArray(isoResiduals)?isoResiduals:[]).forEach(r => {
        const iso = r.isos?.name||"?", m = r.report_month, pdn = r.paydiversenet||0;
        if (!byISO[iso]) byISO[iso] = {};
        byISO[iso][m] = (byISO[iso][m]||0) + pdn;
        if (!byMonth[m]) byMonth[m] = 0;
        byMonth[m] += pdn;
      });
      const pArr2 = Array.isArray(pays)?pays:[];
      const overdue2 = pArr2.filter(p => { const e=p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]; return !p.received_amount&&e&&e<today; });
      contextData.iso_performance = {
        note: "paydiversenet = PayDiverse net income. Sorted best to worst.",
        monthly_totals: Object.entries(byMonth).map(([m,v])=>({ month:fmtM(m), paydiversenet:fmtK(v) })),
        top_isos_all_time: Object.entries(byISO).map(([iso,months])=>({ iso, total:fmtK(Object.values(months).reduce((s,v)=>s+v,0)), _r:Object.values(months).reduce((s,v)=>s+v,0) })).sort((a,b)=>b._r-a._r).map(({_r,...x})=>x),
        iso_by_month: Object.fromEntries(Object.entries(byISO).map(([iso,months])=>[iso, Object.fromEntries(Object.entries(months).map(([m,v])=>[fmtM(m),fmtK(v)]))])),
        payments: { expected:fmtK(pArr2.reduce((s,p)=>s+(p.expected_amount||0),0)), received:fmtK(pArr2.reduce((s,p)=>s+(p.received_amount||0),0)), overdue:overdue2.length }
      };

    } else {
      const [residuals, pays, merch] = await Promise.all([
        sbGetAll("residuals?select=report_month,paydiversenet,gross_volume,gross_revenue,iso_id,mid,isos(name)&order=report_month.asc"),
        sbGet("iso_payments?select=report_month,expected_amount,received_amount,notes,status,isos(name)&order=report_month.desc&limit=100"),
        sbGet("merchants?select=status,isos(name)&limit=2000"),
      ]);

      const byMonth={}, byISO={}, midMonth={};
      (Array.isArray(residuals)?residuals:[]).forEach(r => {
        const m=r.report_month, iso=r.isos?.name||"?", pdn=r.paydiversenet||0;
        if(!byMonth[m]) byMonth[m]={pdn:0,gv:0,gr:0};
        byMonth[m].pdn+=pdn; byMonth[m].gv+=(r.gross_volume||0); byMonth[m].gr+=(r.gross_revenue||0);
        if(!byISO[iso]) byISO[iso]={};
        byISO[iso][m]=(byISO[iso][m]||0)+pdn;
        if(r.mid){ if(!midMonth[r.mid]) midMonth[r.mid]={}; midMonth[r.mid][m]=(midMonth[r.mid][m]||0)+pdn; }
      });

      // Compact agent totals (always include — small)
      const agentSummary = calcAgentPayouts(midMonth, ALL_MONTHS).map(({ _raw, by_month, ...x }) => x);

      const pArr=Array.isArray(pays)?pays:[];
      const overdue=pArr.filter(p=>{ const e=p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]; return !p.received_amount&&e&&e<today; });
      const mArr=Array.isArray(merch)?merch:[];

      contextData.summary = {
        total_paydiversenet_all_time: fmtK(Object.values(byMonth).reduce((s,v)=>s+v.pdn,0)),
        revenue_by_month: Object.entries(byMonth).map(([m,v])=>({ month:fmtM(m), paydiversenet:fmtK(v.pdn), gross_volume:fmtK(v.gv) })),
        iso_monthly_paydiversenet: Object.fromEntries(
          Object.entries(byISO).map(([iso,months]) => [iso, Object.fromEntries(
            Object.entries(months).map(([m,v])=>[fmtM(m), fmtK(v)])
          )])
        ),
        top_isos_all_time: Object.entries(byISO)
          .map(([iso,ms])=>({ iso, total:fmtK(Object.values(ms).reduce((s,v)=>s+v,0)) }))
          .sort((a,b)=>Object.values(byISO[b.iso]).reduce((s,v)=>s+v,0)-Object.values(byISO[a.iso]).reduce((s,v)=>s+v,0))
          .slice(0,10),
        merchants: { total:mArr.length, active:mArr.filter(m=>m.status==="active").length },
        payments: { total_expected:fmtK(pArr.reduce((s,p)=>s+(p.expected_amount||0),0)), total_received:fmtK(pArr.reduce((s,p)=>s+(p.received_amount||0),0)), overdue_count:overdue.length },
        agent_all_time_totals: agentSummary,
      };
    }

    // ── System prompt ─────────────────────────────────────────────────────────
    const prompt = `You are Victoria, a data assistant for PayDiverse — a payment facilitator managing ISO residuals and merchant accounts.

Today: ${today}. Data: Residuals Jan–Jul 2026 | Payments Jan–Aug 2026 | 7 agents all months.

Definitions: paydiversenet = PayDiverse net income | gross_volume = total $ processed | agent_payout = commission % × paydiversenet of agent's MIDs.

Agents: ${Object.keys(AGENT_MAP).join(", ")}. Commission varies per MID (15–90%).

DATA:
${JSON.stringify(contextData)}

Rules: Answer only from data above. Never fabricate. For agent range questions, sum the by_month values. Format $ with commas. Plain text only — no **, no *, no #, no |. Use "- " for bullets.`;

    const msgs = [
      { role:"system", content:prompt },
      ...history.slice(-4).map(m => m.role==="assistant"&&m.content?.length>400 ? {...m,content:m.content.slice(0,400)+"…"} : m),
      { role:"user", content:question }
    ];

    const MODELS = ["llama-3.3-70b-versatile","llama3-70b-8192","llama3-8b-8192","mixtral-8x7b-32768","gemma2-9b-it","llama-3.1-8b-instant"];
    let answer=null, lastErr=null;
    for (const model of MODELS) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions",{
        method:"POST", headers:{"Authorization":`Bearer ${GROQ_KEY}`,"Content-Type":"application/json"},
        body:JSON.stringify({ model, messages:msgs, temperature:0.1, max_tokens:1200 })
      });
      const rtext = await r.text();
      let d; try { d = JSON.parse(rtext); } catch { lastErr=`${model}: non-JSON response (${r.status})`; continue; }
      console.log(`[Victoria] model=${model} status=${r.status} err=${d.error?.message?.slice(0,80)||"ok"}`);
      if(d.error){
        const msg=d.error.message||"";
        const skip=msg.includes("Rate limit")||msg.includes("decommission")||msg.includes("does not exist")||msg.includes("do not have access")||msg.includes("Entity Too Large")||msg.includes("context_length")||msg.includes("too long")||r.status===413;
        lastErr=`${model}: ${msg.slice(0,120)}`;
        if(skip){ continue; }
        return res.status(500).json({error:`Groq error: ${msg}`});
      }
      answer=d.choices[0].message.content; break;
    }
    if(!answer) return res.status(500).json({error:`All models failed. Last error: ${lastErr}. Check Groq API key at console.groq.com`});

    answer=answer.replace(/<think>[\s\S]*?<\/think>/g,"").trim()
      .replace(/\*\*(.*?)\*\*/gs,"$1").replace(/\*(.*?)\*/gs,"$1")
      .replace(/^#{1,6}\s+/gm,"").replace(/^\|.*\|.*$/gm,"")
      .replace(/\n{3,}/g,"\n\n").trim();
    return res.json({answer});

  } catch(err) {
    console.error("Victoria error:",err);
    return res.status(500).json({error:"Failed to fetch data. Please try again."});
  }
}
