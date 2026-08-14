// Victoria AI — Groq Llama 3.3 backend (v3 — conversation history + full data)
const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  });
  return res.json();
}

function fmtK(n) {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n/1e3).toFixed(2)}K`;
  return `$${Number(n).toFixed(2)}`;
}

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

  // Build full conversation context for keyword detection
  // Include current question + recent history to detect ISO names and topics
  const fullContext = [
    ...history.map(m => m.content || ""),
    question
  ].join(" ").toLowerCase();

  try {
    // Always fetch ISO list
    const isos = await sbGet("isos?select=id,name,status&limit=100");

    // Find ANY ISO mentioned across the entire conversation (not just current question)
    const mentionedISO = isos.find(iso => fullContext.includes(iso.name.toLowerCase()));

    // Detect time-related keywords across full context
    const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
    const hasMonthRef = monthNames.some(m => fullContext.includes(m)) || fullContext.includes("last month") || fullContext.includes("this month") || fullContext.includes("q1") || fullContext.includes("q2") || fullContext.includes("q3") || fullContext.includes("q4");

    let contextData = {
      iso_list: isos.map(i => `${i.name} (${i.status || "active"})`).join(", "),
      today,
      note: "Data covers Jan 2026 – Aug 2026"
    };

    if (mentionedISO) {
      // Fetch comprehensive data for the mentioned ISO
      const isoId = mentionedISO.id;
      const [merchants, residuals, payments] = await Promise.all([
        sbGet(`merchants?select=status,business_name&current_iso_id=eq.${isoId}&limit=500`),
        sbGet(`residuals?select=report_month,paydiversenet,gross_revenue&iso_id=eq.${isoId}&order=report_month.asc&limit=200`),
        sbGet(`iso_payments?select=report_month,expected_amount,received_amount,notes&iso_id=eq.${isoId}&order=report_month.desc&limit=24`)
      ]);
      const active = merchants.filter(m => m.status === "active");
      const inactive = merchants.filter(m => m.status !== "active");
      const byMonth = {};
      residuals.forEach(r => {
        if (!byMonth[r.report_month]) byMonth[r.report_month] = { net: 0, gross: 0 };
        byMonth[r.report_month].net += (r.paydiversenet || 0);
        byMonth[r.report_month].gross += (r.gross_revenue || 0);
      });
      contextData.focused_iso = {
        name: mentionedISO.name,
        total_merchants: merchants.length,
        active_count: active.length,
        inactive_count: inactive.length,
        active_merchant_names: active.map(m => m.business_name),
        inactive_merchant_names: inactive.map(m => m.business_name),
        revenue_by_month: Object.entries(byMonth).map(([m, v]) => `${m}: net=${fmtK(v.net)}, gross=${fmtK(v.gross)}`),
        all_time_net: fmtK(Object.values(byMonth).reduce((s, v) => s + v.net, 0)),
        payments: payments.map(p => ({
          month: p.report_month,
          expected: fmtK(p.expected_amount),
          received: p.received_amount != null ? fmtK(p.received_amount) : "not yet received",
          due_date: p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1] || "unknown",
          overdue: !p.received_amount && (p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1] || "") < today
        }))
      };
    } else if (fullContext.includes("overdue") || (fullContext.includes("late") && fullContext.includes("pay"))) {
      const payments = await sbGet("iso_payments?select=iso_id,report_month,expected_amount,received_amount,notes,isos(name)&is.received_amount=null&limit=200");
      const overdue = payments.filter(p => { const exp = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]; return exp && exp < today; });
      contextData.overdue_payments = overdue.map(p => ({
        iso: p.isos?.name, month: p.report_month,
        expected: fmtK(p.expected_amount),
        due_date: p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]
      }));
      contextData.total_overdue_count = overdue.length;
      contextData.total_overdue_amount = fmtK(overdue.reduce((s, p) => s + (p.expected_amount || 0), 0));
    } else if (fullContext.includes("merchant") && !hasMonthRef) {
      const merchants = await sbGet("merchants?select=status,business_name,isos(name)&limit=1000");
      const byISO = {};
      merchants.forEach(m => {
        const n = m.isos?.name || "Unknown";
        if (!byISO[n]) byISO[n] = { active: 0, inactive: 0 };
        if (m.status === "active") byISO[n].active++; else byISO[n].inactive++;
      });
      contextData.merchant_summary = {
        total: merchants.length,
        active: merchants.filter(m => m.status === "active").length,
        inactive: merchants.filter(m => m.status !== "active").length,
        by_iso: Object.entries(byISO).sort((a, b) => (b[1].active + b[1].inactive) - (a[1].active + a[1].inactive))
          .map(([n, d]) => `${n}: ${d.active + d.inactive} total (${d.active} active, ${d.inactive} inactive)`)
      };
    } else {
      // General or time-based question — fetch full revenue data + payments + merchants summary
      const [residuals, payments, merchants] = await Promise.all([
        sbGet("residuals?select=report_month,paydiversenet,gross_revenue,isos(name)&order=report_month.asc&limit=2000"),
        sbGet("iso_payments?select=iso_id,report_month,expected_amount,received_amount,notes,isos(name)&order=report_month.desc&limit=200"),
        sbGet("merchants?select=status,isos(name)&limit=1000")
      ]);

      // Revenue by month (all ISOs combined)
      const byMonth = {};
      const byISO = {};
      residuals.forEach(r => {
        if (!byMonth[r.report_month]) byMonth[r.report_month] = { net: 0, gross: 0 };
        byMonth[r.report_month].net += (r.paydiversenet || 0);
        byMonth[r.report_month].gross += (r.gross_revenue || 0);
        const n = r.isos?.name || "Unknown";
        if (!byISO[n]) byISO[n] = 0;
        byISO[n] += (r.paydiversenet || 0);
      });

      const totalNet = Object.values(byMonth).reduce((s, v) => s + v.net, 0);
      const overdueCount = payments.filter(p => { const exp = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]; return !p.received_amount && exp && exp < today; }).length;

      contextData.overview = {
        total_isos: isos.length,
        total_merchants: merchants.length,
        active_merchants: merchants.filter(m => m.status === "active").length,
        all_time_net_income: fmtK(totalNet),
        overdue_payment_count: overdueCount,
        revenue_by_month: Object.entries(byMonth).map(([m, v]) => `${m}: net=${fmtK(v.net)}, gross=${fmtK(v.gross)}`),
        top_isos_by_net: Object.entries(byISO).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, v]) => `${n}: ${fmtK(v)}`)
      };
    }

    const systemPrompt = `You are Victoria, a data assistant for PayDiverse — a payment facilitator managing ISO residual payments and merchant accounts.

Context:
- PayDiverse earns residuals (a percentage of merchant transaction volume processed through ISOs)
- "paydiversenet" / net = PayDiverse's earnings; "gross_revenue" = total merchant processing volume
- ISOs are agents/processors that bring merchants to PayDiverse
- "overdue" = payment expected_date is past today and received_amount is null
- Data available: January 2026 through August 2026

Today: ${today}

Available data:
${JSON.stringify(contextData, null, 2)}

Rules:
- Answer ONLY from the data above. Never fabricate numbers.
- If the user asks about a specific month and you have that month in revenue_by_month, show it.
- Format dollar amounts with commas (e.g. $12,345.67).
- When listing merchants, list ALL of them — do not truncate.
- Keep answers direct and concise. No filler phrases.
- If data is missing for something specific, say exactly what you don't have.`;

    // Build messages array including conversation history
    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8), // last 8 messages for context
      { role: "user", content: question }
    ];

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: 0.1,
        max_tokens: 1500
      })
    });

    const groqData = await groqRes.json();
    if (groqData.error) return res.status(500).json({ error: groqData.error.message });

    return res.json({ answer: groqData.choices[0].message.content });

  } catch (err) {
    console.error("Victoria API error:", err);
    return res.status(500).json({ error: "Failed to fetch data. Please try again." });
  }
}
