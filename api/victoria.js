// Victoria AI — Groq backend (v5 — full data coverage, key rotated Aug 17)
const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  });
  return res.json();
}

// Paginated fetch — bypasses Supabase's 1000-row hard cap
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
  if (Math.abs(n) >= 1e3) return `$${(n/1e3).toFixed(2)}K`;
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

// Compute per-agent payouts for one or more months (YYYY-MM-01 strings)
async function computeAgentPayouts(months) {
  const monthArr = Array.isArray(months) ? months : [months];
  // Collect all unique MIDs active in any of the requested months
  const allMids = new Set();
  const agentConfig = {};
  for (const [agentName, merchants] of Object.entries(AGENT_MAP)) {
    agentConfig[agentName] = {};
    for (const m of monthArr) {
      agentConfig[agentName][m] = merchants.filter(e => !e.until || e.until >= m);
      agentConfig[agentName][m].forEach(e => allMids.add(e.mid));
    }
  }
  if (allMids.size === 0) return [];

  // Fetch residuals for all MIDs across all requested months in one pass
  const midList = [...allMids].join(",");
  const monthFilter = monthArr.length === 1
    ? `&report_month=eq.${monthArr[0]}`
    : `&report_month=in.(${monthArr.join(",")})`;
  const rows = await sbGet(
    `residuals?select=mid,paydiversenet,business_name,report_month&mid=in.(${midList})${monthFilter}&limit=5000`
  );
  if (!Array.isArray(rows)) return [];

  // Build mid → { month → net } and mid → name maps
  const netByMidMonth = {};
  const nameByMid = {};
  rows.forEach(r => {
    if (!netByMidMonth[r.mid]) netByMidMonth[r.mid] = {};
    netByMidMonth[r.mid][r.report_month] = (netByMidMonth[r.mid][r.report_month] || 0) + (r.paydiversenet || 0);
    if (!nameByMid[r.mid] && r.business_name) nameByMid[r.mid] = r.business_name;
  });

  // Compute per-agent totals
  return Object.entries(AGENT_MAP).map(([agentName, merchants]) => {
    let totalPayout = 0;
    const breakdown = [];
    for (const m of monthArr) {
      const active = merchants.filter(e => !e.until || e.until >= m);
      active.forEach(({ mid, pct }) => {
        const net = (netByMidMonth[mid] && netByMidMonth[mid][m]) || 0;
        const earning = net * pct / 100;
        totalPayout += earning;
        if (net > 0) {
          breakdown.push({
            month: fmtMonth(m),
            mid,
            merchant: nameByMid[mid] || mid,
            paydiversenet: fmtK(net),
            pct: `${pct}%`,
            agent_earning: fmtK(earning)
          });
        }
      });
    }
    return { agent: agentName, total_payout: fmtK(totalPayout), _raw: totalPayout, merchant_breakdown: breakdown };
  }).sort((a, b) => b._raw - a._raw);
}



// Map quarter/month keywords to YYYY-MM-DD report_month values
function detectMonthFilter(ctx) {
  const monthMap = {
    january: "2026-01-01", february: "2026-02-01", march: "2026-03-01",
    april: "2026-04-01", may: "2026-05-01", june: "2026-06-01",
    july: "2026-07-01", august: "2026-08-01", september: "2026-09-01",
    october: "2026-10-01", november: "2026-11-01", december: "2026-12-01",
    jan: "2026-01-01", feb: "2026-02-01", mar: "2026-03-01",
    apr: "2026-04-01", jun: "2026-06-01", jul: "2026-07-01",
    aug: "2026-08-01", sep: "2026-09-01", oct: "2026-10-01",
    nov: "2026-11-01", dec: "2026-12-01"
  };
  const quarters = {
    "q1": ["2026-01-01","2026-02-01","2026-03-01"],
    "q2": ["2026-04-01","2026-05-01","2026-06-01"],
    "q3": ["2026-07-01","2026-08-01","2026-09-01"],
    "q4": ["2026-10-01","2026-11-01","2026-12-01"]
  };
  for (const [q, months] of Object.entries(quarters)) {
    if (ctx.includes(q)) return months;
  }
  for (const [name, val] of Object.entries(monthMap)) {
    if (ctx.includes(name)) return [val];
  }
  return null;
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
  const fullContext = [...history.map(m => m.content || ""), question].join(" ").toLowerCase();
  // Check current question first for month — history may contain months from prior questions
  // that would incorrectly override the current intent (e.g. "How much Feb?" → "How much March?")
  const monthFilter = detectMonthFilter(question.toLowerCase()) || detectMonthFilter(fullContext);
  // For analysis/comparison questions, ignore month filter so we can compare across months
  const isAnalysisQ = /why|how come|reason|went down|went up|decrease|increase|drop|chang|trend|compar|differ|less than|more than|previous|last month|versus|vs\./.test(fullContext);
  const agentNames = Object.keys(AGENT_MAP).map(n => n.toLowerCase());
  const isAgentQuestion = (fullContext.includes("agent") || agentNames.some(n => fullContext.includes(n.split(" ")[0]) && n.split(" ")[0].length > 3)) && (fullContext.includes("paid") || fullContext.includes("payout") || fullContext.includes("earn") || fullContext.includes("commission") || fullContext.includes("highest") || fullContext.includes("most") || fullContext.includes("who") || fullContext.includes("how much") || fullContext.includes("top") || fullContext.includes("amount") || fullContext.includes("residual") || fullContext.includes("total") || fullContext.includes("rank"));

  try {
    const isos = await sbGet("isos?select=id,name,status&limit=100");
    // Check current question first, then recent history — avoids false matches from history responses
    const currentQ = question.toLowerCase();
    const recentHistory = history.slice(-3).map(m => m.content || "").join(" ").toLowerCase();
    const mentionedISO =
      isos.find(iso => currentQ.includes(iso.name.toLowerCase())) ||
      isos.find(iso => recentHistory.includes(iso.name.toLowerCase()));

    let contextData = {
      iso_list: isos.map(i => i.name).join(", "),
      today,
      data_available: "Residuals: Jan 2026 through Jul 2026. Payments: Jan 2026 through Aug 2026. Agents: Brian Miller, Drew Ukapbi, Michelle W Breier, Meghan Anderson, Tiffany Hoffman, Claudia Perez, Pedro Teixeira Payinsight — payouts computed from residuals × commission %.",
      field_guide: {
        gross_volume: "Total transaction $ volume processed by the merchant",
        gross_revenue: "Processor revenue (fees charged to merchant)",
        net_revenue: "Processor revenue after deductions",
        paydiversenet: "PayDiverse's net income (our earnings from this merchant/ISO)",
        agent_payout: "Amount paid to the referring agent",
        agent_split_pct: "Agent's revenue share percentage"
      }
    };

    if (mentionedISO) {
      // ── ISO-specific: fetch all data for this ISO ──
      const isoId = mentionedISO.id;
      let residualQuery = `residuals?select=report_month,mid,business_name,gross_volume,gross_revenue,net_revenue,paydiversenet,agent_payout,agent_split_pct&iso_id=eq.${isoId}&order=report_month.asc&limit=2000`;
      if (monthFilter && monthFilter.length === 1 && !isAnalysisQ) residualQuery += `&report_month=eq.${monthFilter[0]}`;

      const [merchants, residuals, payments] = await Promise.all([
        sbGetAll(`merchants?select=mid,business_name,status,vertical,merchant_type,is_startup,monthly_volume,notes&current_iso_id=eq.${isoId}`),
        sbGetAll(residualQuery),
        sbGet(`iso_payments?select=report_month,expected_amount,received_amount,payment_date,payment_method,notes,status&iso_id=eq.${isoId}&order=report_month.desc&limit=24`)
      ]);

      const active = merchants.filter(m => m.status === "active");
      const inactive = merchants.filter(m => m.status !== "active");

      // Aggregate residuals by month
      const byMonth = {};
      const byMerchant = {};
      const midsByMonth = {};
      residuals.forEach(r => {
        // By month
        if (!byMonth[r.report_month]) byMonth[r.report_month] = { net: 0, gross_volume: 0, gross_revenue: 0, paydiversenet: 0, agent_payout: 0 };
        byMonth[r.report_month].net += (r.paydiversenet || 0);
        byMonth[r.report_month].gross_volume += (r.gross_volume || 0);
        byMonth[r.report_month].gross_revenue += (r.gross_revenue || 0);
        byMonth[r.report_month].paydiversenet += (r.paydiversenet || 0);
        byMonth[r.report_month].agent_payout += (r.agent_payout || 0);
        // By merchant
        const key = r.business_name || r.mid || "Unknown";
        if (!byMerchant[key]) byMerchant[key] = { mid: r.mid, net: 0, gross_volume: 0, months: new Set() };
        byMerchant[key].net += (r.paydiversenet || 0);
        byMerchant[key].gross_volume += (r.gross_volume || 0);
        byMerchant[key].months.add(r.report_month);
        // MIDs by month
        if (r.mid) { if (!midsByMonth[r.report_month]) midsByMonth[r.report_month] = new Set(); midsByMonth[r.report_month].add(r.mid); }
      });

      const rankedMerchants = Object.entries(byMerchant).sort((a,b) => b[1].net - a[1].net);

      // Month-over-month analysis: who joined, who left, revenue changes
      const monthKeys = Object.keys(byMonth).sort();
      const monthOverMonth = [];
      const merchantByMonth = {}; // mid -> { month -> net }
      residuals.forEach(r => {
        const key = r.business_name || r.mid || "Unknown";
        if (!merchantByMonth[key]) merchantByMonth[key] = {};
        merchantByMonth[key][r.report_month] = (merchantByMonth[key][r.report_month] || 0) + (r.paydiversenet || 0);
      });
      for (let i = 1; i < monthKeys.length; i++) {
        const prev = monthKeys[i-1], curr = monthKeys[i];
        const prevMerchants = new Set(Object.keys(merchantByMonth).filter(k => merchantByMonth[k][prev] != null));
        const currMerchants = new Set(Object.keys(merchantByMonth).filter(k => merchantByMonth[k][curr] != null));
        const left = [...prevMerchants].filter(k => !currMerchants.has(k));
        const joined = [...currMerchants].filter(k => !prevMerchants.has(k));
        const netChange = (byMonth[curr]?.paydiversenet || 0) - (byMonth[prev]?.paydiversenet || 0);
        // Top movers (biggest drops)
        const movers = [...prevMerchants].filter(k => currMerchants.has(k))
          .map(k => ({ name: k, change: (merchantByMonth[k][curr]||0) - (merchantByMonth[k][prev]||0) }))
          .sort((a,b) => a.change - b.change).slice(0, 5);
        monthOverMonth.push({
          from: fmtMonth(prev), to: fmtMonth(curr),
          paydiversenet_change: fmtK(netChange),
          direction: netChange >= 0 ? "increase" : "decrease",
          merchants_left: left.map(k => ({ name: k, prev_residual: fmtK(merchantByMonth[k][prev]) })),
          merchants_joined: joined.map(k => ({ name: k, new_residual: fmtK(merchantByMonth[k][curr]) })),
          biggest_drops: movers.filter(m => m.change < 0).map(m => ({ name: m.name, change: fmtK(m.change) })),
          biggest_gains: movers.filter(m => m.change > 0).map(m => ({ name: m.name, change: fmtK(m.change) }))
        });
      }
      const allTimeNet = Object.values(byMonth).reduce((s,v) => s + v.paydiversenet, 0);

      contextData.focused_iso = {
        name: mentionedISO.name,
        total_merchants: merchants.length,
        active_count: active.length,
        inactive_count: inactive.length,
        active_merchants: active.slice(0,25).map(m => ({ name: m.business_name, mid: m.mid, vertical: m.vertical, is_startup: m.is_startup, notes: m.notes })),
        inactive_merchants: inactive.slice(0,10).map(m => ({ name: m.business_name, mid: m.mid, notes: m.notes })),
        all_time_paydiversenet: fmtK(allTimeNet),
        months_with_data: Object.keys(byMonth).map(fmtMonth),
        revenue_by_month: Object.entries(byMonth).map(([m,v]) => ({
          month: fmtMonth(m),
          paydiversenet: fmtK(v.paydiversenet),
          gross_volume: fmtK(v.gross_volume),
          gross_revenue: fmtK(v.gross_revenue),
          agent_payout: v.agent_payout ? fmtK(v.agent_payout) : null,
          active_merchants: midsByMonth[m] ? midsByMonth[m].size : null
        })),
        top_merchants_by_residual: rankedMerchants.slice(0, 15).map(([name, d], i) => ({
          rank: i+1, merchant: name, mid: d.mid, total_paydiversenet: fmtK(d.net),
          total_gross_volume: fmtK(d.gross_volume), months_active: d.months.size
        })),
        month_over_month_analysis: monthOverMonth,
        payments: payments.map(p => ({
          month: fmtMonth(p.report_month),
          expected: fmtK(p.expected_amount),
          received: p.received_amount != null ? fmtK(p.received_amount) : "not yet received",
          payment_date: p.payment_date || null,
          payment_method: p.payment_method || null,
          due_date: p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1] || null,
          status: p.status,
          overdue: p.received_amount == null && (p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1] || "") < today
        }))
      };

    } else if (category === "payments" || category === "overdue") {
      // Explicit category from tile click — route to payments
      const payments = await sbGet("iso_payments?select=iso_id,report_month,expected_amount,received_amount,payment_date,payment_method,notes,status,isos(name)&order=report_month.desc&limit=200");
      const totalExp = payments.reduce((s,p) => s+(p.expected_amount||0), 0);
      const totalRec = payments.reduce((s,p) => s+(p.received_amount||0), 0);
      const overdue = payments.filter(p => { const exp = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]; return !p.received_amount && exp && exp < today; });
      const pending = payments.filter(p => !p.received_amount);
      contextData.payments = {
        total_expected: fmtK(totalExp), total_received: fmtK(totalRec),
        difference: fmtK(totalRec - totalExp),
        overdue_count: overdue.length,
        overdue_amount: fmtK(overdue.reduce((s,p)=>s+(p.expected_amount||0),0)),
        pending_count: pending.filter(p => !overdue.includes(p)).length,
        overdue_list: overdue.map(p => ({ iso: p.isos?.name, month: fmtMonth(p.report_month), expected: fmtK(p.expected_amount), due_date: p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1] })),
        records: payments.slice(0,40).map(p => ({ iso: p.isos?.name, month: fmtMonth(p.report_month), expected: fmtK(p.expected_amount), received: p.received_amount != null ? fmtK(p.received_amount) : "pending", due_date: p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1], status: p.status, overdue: p.received_amount==null && (p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]||"") < today }))
      };
    } else if (category === "merchants") {
      // Explicit merchants category
      const merchants = await sbGetAll("merchants?select=status,business_name,vertical,is_startup,isos(name)");
      const byISO = {};
      merchants.forEach(m => {
        const n = m.isos?.name || "Unknown";
        if (!byISO[n]) byISO[n] = { active: 0, inactive: 0 };
        if (m.status === "active") byISO[n].active++; else byISO[n].inactive++;
      });
      contextData.merchants = {
        total: merchants.length, active: merchants.filter(m=>m.status==="active").length,
        inactive: merchants.filter(m=>m.status!=="active").length,
        by_iso: Object.entries(byISO).sort((a,b)=>(b[1].active+b[1].inactive)-(a[1].active+a[1].inactive)).map(([n,d])=>`${n}: ${d.active+d.inactive} total (${d.active} active, ${d.inactive} inactive)`)
      };
    } else if (fullContext.includes("overdue") || (fullContext.includes("late") && fullContext.includes("payment")) || fullContext.includes("past due")) {
      const payments = await sbGet("iso_payments?select=iso_id,report_month,expected_amount,received_amount,notes,status,isos(name)&is.received_amount=null&limit=200");
      const overdue = payments.filter(p => { const exp = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]; return exp && exp < today; });
      contextData.overdue_payments = {
        count: overdue.length,
        total_amount: fmtK(overdue.reduce((s,p) => s+(p.expected_amount||0), 0)),
        list: overdue.map(p => ({ iso: p.isos?.name, month: fmtMonth(p.report_month), expected: fmtK(p.expected_amount), due_date: p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1] }))
      };

    } else if (fullContext.includes("merchant") && (fullContext.includes("top") || fullContext.includes("best") || fullContext.includes("most") || fullContext.includes("rank") || fullContext.includes("highest") || fullContext.includes("residual") || fullContext.includes("revenue") || fullContext.includes("earning") || fullContext.includes("perform"))) {
      // Merchant-level residual ranking across all ISOs
      let resQuery = "residuals?select=mid,business_name,gross_volume,gross_revenue,paydiversenet,iso_id,isos(name),report_month&order=paydiversenet.desc";
      if (monthFilter && monthFilter.length === 1) resQuery += `&report_month=eq.${monthFilter[0]}`;
      const residuals = await sbGetAll(resQuery);
      const byMid = {};
      residuals.forEach(r => {
        const key = r.business_name || r.mid || "Unknown";
        if (!byMid[key]) byMid[key] = { name: key, mid: r.mid, iso: r.isos?.name || "Unknown", net: 0, gross_volume: 0, months: new Set() };
        byMid[key].net += (r.paydiversenet || 0);
        byMid[key].gross_volume += (r.gross_volume || 0);
        byMid[key].months.add(r.report_month);
      });
      const ranked = Object.values(byMid).sort((a,b) => b.net - a.net);
      contextData.merchant_residuals = {
        period: monthFilter ? monthFilter.map(fmtMonth).join(", ") : "All time (Jan–Jun 2026)",
        total_merchants_with_data: ranked.length,
        top_20: ranked.slice(0, 20).map((m,i) => ({ rank: i+1, merchant: m.name, iso: m.iso, paydiversenet: fmtK(m.net), gross_volume: fmtK(m.gross_volume), months: m.months.size })),
        bottom_5: ranked.slice(-5).reverse().map((m,i) => ({ rank: ranked.length-i, merchant: m.name, iso: m.iso, paydiversenet: fmtK(m.net) }))
      };

    } else if (fullContext.includes("merchant") && !monthFilter) {
      // General merchant counts
      const merchants = await sbGet("merchants?select=status,business_name,vertical,is_startup,isos(name)&limit=1000");
      const byISO = {};
      let startups = 0, withVertical = {};
      merchants.forEach(m => {
        const n = m.isos?.name || "Unknown";
        if (!byISO[n]) byISO[n] = { active: 0, inactive: 0 };
        if (m.status === "active") byISO[n].active++; else byISO[n].inactive++;
        if (m.is_startup) startups++;
        if (m.vertical) { withVertical[m.vertical] = (withVertical[m.vertical]||0)+1; }
      });
      contextData.merchants = {
        total: merchants.length,
        active: merchants.filter(m => m.status === "active").length,
        inactive: merchants.filter(m => m.status !== "active").length,
        startups: startups,
        by_vertical: Object.entries(withVertical).sort((a,b)=>b[1]-a[1]).map(([v,c])=>`${v}: ${c}`),
        by_iso: Object.entries(byISO).sort((a,b)=>(b[1].active+b[1].inactive)-(a[1].active+a[1].inactive))
          .map(([n,d])=>`${n}: ${d.active+d.inactive} total (${d.active} active, ${d.inactive} inactive)`)
      };

    } else if ((fullContext.includes("payment") || fullContext.includes("collected") || fullContext.includes("received") || fullContext.includes("overdue") || fullContext.includes("reconcil")) && !mentionedISO) {
      let payQuery = "iso_payments?select=iso_id,report_month,expected_amount,received_amount,payment_date,payment_method,notes,status,isos(name)&order=report_month.desc&limit=200";
      if (monthFilter && monthFilter.length === 1) payQuery += `&report_month=eq.${monthFilter[0]}`;
      const payments = await sbGet(payQuery);
      const totalExp = payments.reduce((s,p) => s+(p.expected_amount||0), 0);
      const totalRec = payments.reduce((s,p) => s+(p.received_amount||0), 0);
      const overdue = payments.filter(p => { const exp = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]; return !p.received_amount && exp && exp < today; });
      contextData.payments = {
        total_expected: fmtK(totalExp),
        total_received: fmtK(totalRec),
        difference: fmtK(totalRec - totalExp),
        overdue_count: overdue.length,
        overdue_amount: fmtK(overdue.reduce((s,p)=>s+(p.expected_amount||0),0)),
        records: payments.slice(0, 30).map(p => ({
          iso: p.isos?.name, month: fmtMonth(p.report_month),
          expected: fmtK(p.expected_amount),
          received: p.received_amount != null ? fmtK(p.received_amount) : "pending",
          due_date: p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1] || null,
          payment_date: p.payment_date || null,
          payment_method: p.payment_method || null,
          status: p.status,
          overdue: p.received_amount == null && (p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]||"") < today
        }))
      };

    } else if (isAgentQuestion) {
      // ── Agent payout computation ──────────────────────────────────────────
      const targetMonths = (monthFilter && monthFilter.length > 0 && !isAnalysisQ)
        ? monthFilter
        : ["2026-07-01"]; // default to latest available month
      const payouts = await computeAgentPayouts(targetMonths);
      const period = targetMonths.map(fmtMonth).join(", ");

      // Check if a specific agent is named
      const namedAgent = Object.keys(AGENT_MAP).find(n =>
        fullContext.includes(n.toLowerCase()) ||
        fullContext.includes(n.split(" ")[0].toLowerCase())
      );

      contextData.agent_payouts = {
        period,
        note: "Payout = (commission %) × (PayDiverse net residual for that MID). Data reflects residuals in the Supabase residuals table for those months.",
        ranked_agents: payouts.map(({ _raw, ...rest }) => rest),
        highlighted_agent: namedAgent
          ? payouts.find(p => p.agent === namedAgent)
          : undefined
      };

    } else {
      // General / revenue / time-based / analysis — always fetch ALL months
      const resQuery = "residuals?select=report_month,paydiversenet,gross_volume,gross_revenue,agent_payout,business_name,mid,iso_id,isos(name)&order=report_month.asc";

      const [residuals, payments, merchants] = await Promise.all([
        sbGetAll(resQuery),
        sbGet("iso_payments?select=iso_id,report_month,expected_amount,received_amount,payment_date,payment_method,notes,status,isos(name)&order=report_month.desc&limit=200"),
        sbGet("merchants?select=status,isos(name)&limit=1000")
      ]);

      const byMonth = {}, byISO = {}, merchantByMonth = {};
      residuals.forEach(r => {
        if (!byMonth[r.report_month]) byMonth[r.report_month] = { paydiversenet: 0, gross_volume: 0, gross_revenue: 0, agent_payout: 0 };
        byMonth[r.report_month].paydiversenet += (r.paydiversenet||0);
        byMonth[r.report_month].gross_volume += (r.gross_volume||0);
        byMonth[r.report_month].gross_revenue += (r.gross_revenue||0);
        byMonth[r.report_month].agent_payout += (r.agent_payout||0);
        const n = r.isos?.name||"Unknown";
        if (!byISO[n]) byISO[n] = {};
        if (!byISO[n][r.report_month]) byISO[n][r.report_month] = 0;
        byISO[n][r.report_month] += (r.paydiversenet||0);
        // Track merchant presence by month
        const mKey = r.business_name || r.mid || "Unknown";
        if (!merchantByMonth[mKey]) merchantByMonth[mKey] = {};
        merchantByMonth[mKey][r.report_month] = (merchantByMonth[mKey][r.report_month]||0) + (r.paydiversenet||0);
      });

      const totalNet = Object.values(byMonth).reduce((s,v)=>s+v.paydiversenet,0);
      const totalGrossVol = Object.values(byMonth).reduce((s,v)=>s+v.gross_volume,0);
      const overdue = payments.filter(p=>{ const exp=p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]; return !p.received_amount&&exp&&exp<today; });

      // Month-over-month analysis (all ISOs combined)
      const monthKeys = Object.keys(byMonth).sort();
      const monthOverMonth = [];
      for (let i = 1; i < monthKeys.length; i++) {
        const prev = monthKeys[i-1], curr = monthKeys[i];
        const netChange = (byMonth[curr]?.paydiversenet||0) - (byMonth[prev]?.paydiversenet||0);
        // ISO-level changes
        const isoChanges = Object.entries(byISO).map(([name, months]) => ({
          iso: name,
          prev: months[prev]||0,
          curr: months[curr]||0,
          change: (months[curr]||0) - (months[prev]||0)
        })).filter(x => x.prev > 0 || x.curr > 0).sort((a,b)=>a.change-b.change);
        // Merchant churn
        const prevMs = new Set(Object.keys(merchantByMonth).filter(k=>merchantByMonth[k][prev]!=null));
        const currMs = new Set(Object.keys(merchantByMonth).filter(k=>merchantByMonth[k][curr]!=null));
        const left = [...prevMs].filter(k=>!currMs.has(k)).map(k=>({ name: k, prev_residual: fmtK(merchantByMonth[k][prev]) }));
        const joined = [...currMs].filter(k=>!prevMs.has(k)).map(k=>({ name: k, new_residual: fmtK(merchantByMonth[k][curr]) }));
        monthOverMonth.push({
          from: fmtMonth(prev), to: fmtMonth(curr),
          paydiversenet_change: fmtK(netChange),
          direction: netChange >= 0 ? "UP" : "DOWN",
          biggest_iso_drops: isoChanges.filter(x=>x.change<0).slice(0,5).map(x=>({ iso: x.iso, change: fmtK(x.change), prev: fmtK(x.prev), curr: fmtK(x.curr) })),
          biggest_iso_gains: isoChanges.filter(x=>x.change>0).slice(-5).reverse().map(x=>({ iso: x.iso, change: fmtK(x.change) })),
          merchants_left: left.slice(0,10),
          merchants_joined: joined.slice(0,10)
        });
      }

      contextData.summary = {
        total_isos: isos.length,
        active_isos: isos.filter(i => i.status === "active").length,
        inactive_isos: isos.filter(i => i.status !== "active").length,
        total_merchants: merchants.length,
        active_merchants: merchants.filter(m=>m.status==="active").length,
        all_time_paydiversenet: fmtK(totalNet),
        all_time_gross_volume: fmtK(totalGrossVol),
        overdue_payment_count: overdue.length,
        overdue_amount: fmtK(overdue.reduce((s,p)=>s+(p.expected_amount||0),0)),
        revenue_by_month: Object.entries(byMonth).map(([m,v])=>({ month: fmtMonth(m), paydiversenet: fmtK(v.paydiversenet), gross_volume: fmtK(v.gross_volume), gross_revenue: fmtK(v.gross_revenue) })),
        top_isos_all_time: Object.entries(byISO)
          .map(([n,months])=>{ const raw=Object.values(months).reduce((s,v)=>s+v,0); return {iso:n,paydiversenet:fmtK(raw),_raw:raw}; })
          .sort((a,b)=>b._raw-a._raw)
          .slice(0,10)
          .map(({iso,paydiversenet})=>({iso,paydiversenet})),
        month_over_month_analysis: isAnalysisQ ? monthOverMonth.slice(0,3) : undefined
      };
    }

    const systemPrompt = `You are Victoria, an intelligent data assistant for PayDiverse — a payment facilitator that manages ISO residuals and merchant accounts.

Today: ${today}
Data coverage: Residuals Jan 2026–Jul 2026 | Payments Jan 2026–Aug 2026 | Merchants: 478 total | Agents: 7 agents with commission-based payouts

Key field definitions:
- gross_volume: Total $ transaction volume processed by merchant
- gross_revenue: Revenue the processor (ISO) earns from merchant fees
- net_revenue: Processor revenue after deductions
- paydiversenet: PayDiverse's net income (what we actually earn)
- agent_payout: Amount paid to referring agent
- expected_amount: What we expect the ISO to pay us for that month's residuals
- agent_payout in context: Computed as (agent commission %) × (paydiversenet for their MIDs). Agents: Brian Miller, Drew Ukapbi, Michelle W Breier, Meghan Anderson, Tiffany Hoffman, Claudia Perez (no active MIDs), Pedro Teixeira Payinsight.

Data:
${JSON.stringify(contextData)}

Rules:
1. Answer ONLY from the data above. Never fabricate numbers.
2. Format dollar amounts with $ and commas (e.g. $12,345.67).
3. When user asks to "list all" merchants, list ALL of them.
4. "paydiversenet" is PayDiverse's earnings — use this for revenue/income questions.
5. If asked about a specific month and data exists, show it.
6. Be concise and direct. No filler phrases.
7. If asked about something not in the data (e.g. Jul–Dec 2026 residuals), say the data is not yet available.
8. CRITICAL FORMATTING: plain text only. Do NOT write ** or * around any word. Do NOT use | pipe characters. Do NOT write # headers. Use only "- " for bullet points. Write names and numbers inline like "Finns: -$12.97K", not in a table or bold.`;

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
        lastError = groqData.error.message;
        // Only retry on confirmed rate limit or decommissioned model errors
        const msg = groqData.error.message || "";
        const skipToNext = msg.includes("Rate limit") || msg.includes("decommissioned") || msg.includes("does not exist") || msg.includes("do not have access") || msg.includes("Entity Too Large") || msg.includes("context_length") || msg.includes("context length") || msg.includes("too long") || groqRes.status === 413;
        if (skipToNext) { lastError = (lastError ? lastError + ' | ' : '') + `${model}: ${msg.slice(0,100)}`; continue; }
        // Auth or other non-skippable error — fail fast
        return res.status(500).json({ error: `Groq error: ${msg}` });
      }
      answer = groqData.choices[0].message.content;
      break;
    }
    if (!answer) return res.status(500).json({ error: `All models failed: ${lastError}` });
    // Strip thinking blocks (Qwen 3 and other reasoning models expose <think>...</think>)
    answer = answer.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    // Strip markdown the model may emit despite instructions
    answer = answer
      .replace(/\*\*(.*?)\*\*/gs, '$1')   // **bold** → plain
      .replace(/\*(.*?)\*/gs, '$1')        // *italic* → plain
      .replace(/^#{1,6}\s+/gm, '')         // # headers → removed
      .replace(/^\|.*\|.*$/gm, '')         // | table rows | → removed
      .replace(/\n{3,}/g, '\n\n')          // collapse excess blank lines
      .trim();
    return res.json({ answer });

  } catch (err) {
    console.error("Victoria API error:", err);
    return res.status(500).json({ error: "Failed to fetch data. Please try again." });
  }
}
