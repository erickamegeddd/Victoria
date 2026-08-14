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

  const { question } = req.body || {};
  if (!question) return res.status(400).json({ error: "No question provided" });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: "GROQ_API_KEY not configured" });

  const q = question.toLowerCase();
  const today = new Date().toISOString().split("T")[0];

  try {
    // Always fetch ISO list
    const isos = await sbGet("isos?select=id,name,status&limit=100");
    const mentionedISO = isos.find(iso => q.includes(iso.name.toLowerCase()));

    let contextData = {
      iso_list: isos.map(i => `${i.name} (${i.status || "active"})`).join(", "),
      today
    };

    if (mentionedISO) {
      const isoId = mentionedISO.id;
      const [merchants, residuals, payments] = await Promise.all([
        sbGet(`merchants?select=status,business_name&current_iso_id=eq.${isoId}&limit=500`),
        sbGet(`residuals?select=report_month,paydiversenet,gross_revenue&iso_id=eq.${isoId}&order=report_month.desc&limit=100`),
        sbGet(`iso_payments?select=report_month,expected_amount,received_amount,notes&iso_id=eq.${isoId}&order=report_month.desc&limit=24`)
      ]);
      const active = merchants.filter(m => m.status === "active");
      const inactive = merchants.filter(m => m.status !== "active");
      const byMonth = {};
      residuals.forEach(r => { if (!byMonth[r.report_month]) byMonth[r.report_month] = 0; byMonth[r.report_month] += (r.paydiversenet || 0); });
      contextData.focused_iso = {
        name: mentionedISO.name,
        total_merchants: merchants.length,
        active_merchants: active.length,
        inactive_merchants: inactive.length,
        all_active_merchant_names: active.map(m => m.business_name),
        all_inactive_merchant_names: inactive.map(m => m.business_name),
        revenue_by_month: Object.entries(byMonth).sort(([a],[b]) => b.localeCompare(a)).map(([m,v]) => `${m}: ${fmtK(v)}`),
        total_net_income: fmtK(Object.values(byMonth).reduce((s,v) => s+v, 0)),
        payments: payments.map(p => ({
          month: p.report_month,
          expected: fmtK(p.expected_amount),
          received: p.received_amount != null ? fmtK(p.received_amount) : "not received",
          expected_date: p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1] || "unknown",
          overdue: !p.received_amount && (p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1] || "") < today
        }))
      };
    } else if (q.includes("overdue") || (q.includes("late") && q.includes("pay"))) {
      const payments = await sbGet("iso_payments?select=iso_id,report_month,expected_amount,received_amount,notes,isos(name)&is.received_amount=null&limit=200");
      const overdue = payments.filter(p => { const exp = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]; return exp && exp < today; });
      contextData.overdue_payments = overdue.map(p => ({
        iso: p.isos?.name,
        month: p.report_month,
        expected: fmtK(p.expected_amount),
        due_date: p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]
      }));
      contextData.total_overdue_count = overdue.length;
      contextData.total_overdue_amount = fmtK(overdue.reduce((s,p) => s+(p.expected_amount||0), 0));
    } else if (q.includes("merchant")) {
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
        by_iso: Object.entries(byISO).sort((a,b) => (b[1].active+b[1].inactive)-(a[1].active+a[1].inactive)).map(([n,d]) => `${n}: ${d.active+d.inactive} total (${d.active} active)`)
      };
    } else if (q.includes("pay") || q.includes("collect") || q.includes("receiv")) {
      const payments = await sbGet("iso_payments?select=iso_id,report_month,expected_amount,received_amount,notes,isos(name)&order=report_month.desc&limit=200");
      const totalExp = payments.reduce((s,p) => s+(p.expected_amount||0), 0);
      const totalRec = payments.reduce((s,p) => s+(p.received_amount||0), 0);
      const pending = payments.filter(p => p.received_amount == null);
      const overdue = pending.filter(p => { const exp = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]; return exp && exp < today; });
      contextData.payments_summary = {
        total_expected: fmtK(totalExp),
        total_received: fmtK(totalRec),
        difference: fmtK(totalRec - totalExp),
        pending_count: pending.length,
        overdue_count: overdue.length,
        recent_records: payments.slice(0,20).map(p => ({ iso: p.isos?.name, month: p.report_month, expected: fmtK(p.expected_amount), received: p.received_amount != null ? fmtK(p.received_amount) : "pending" }))
      };
    } else if (q.includes("revenue") || q.includes("residual") || q.includes("income") || q.includes("earn")) {
      const residuals = await sbGet("residuals?select=report_month,paydiversenet,iso_id,isos(name)&order=report_month.desc&limit=500");
      const byMonth = {};
      const byISO = {};
      residuals.forEach(r => {
        if (!byMonth[r.report_month]) byMonth[r.report_month] = 0;
        byMonth[r.report_month] += (r.paydiversenet || 0);
        const n = r.isos?.name || "Unknown";
        if (!byISO[n]) byISO[n] = 0;
        byISO[n] += (r.paydiversenet || 0);
      });
      const total = Object.values(byMonth).reduce((s,v) => s+v, 0);
      contextData.revenue_summary = {
        all_time_net: fmtK(total),
        months_with_data: Object.keys(byMonth).length,
        by_month: Object.entries(byMonth).sort(([a],[b]) => b.localeCompare(a)).map(([m,v]) => `${m}: ${fmtK(v)}`),
        by_iso: Object.entries(byISO).sort((a,b) => b[1]-a[1]).map(([n,v]) => `${n}: ${fmtK(v)}`)
      };
    } else {
      // General question — fetch overview stats
      const [merchants, residuals, payments] = await Promise.all([
        sbGet("merchants?select=status&limit=1000"),
        sbGet("residuals?select=report_month,paydiversenet&order=report_month.desc&limit=200"),
        sbGet("iso_payments?select=expected_amount,received_amount,notes&limit=200")
      ]);
      const totalNet = residuals.reduce((s,r) => s+(r.paydiversenet||0), 0);
      const totalRec = payments.reduce((s,p) => s+(p.received_amount||0), 0);
      const overdueCount = payments.filter(p => { const exp = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1]; return !p.received_amount && exp && exp < today; }).length;
      contextData.overview = {
        total_isos: isos.length,
        active_isos: isos.filter(i => i.status === "active").length,
        total_merchants: merchants.length,
        active_merchants: merchants.filter(m => m.status === "active").length,
        all_time_net_income: fmtK(totalNet),
        total_payments_received: fmtK(totalRec),
        overdue_payment_count: overdueCount
      };
    }

    const systemPrompt = `You are Victoria, a data assistant for PayDiverse — a payment facilitator that manages ISO (Independent Sales Organization) residual payments and merchant accounts.

Context:
- PayDiverse earns money from residuals (a percentage of merchant transaction volume processed through ISOs)
- "paydiversenet" = PayDiverse's net income from residuals
- "gross_revenue" = total merchant processing volume
- ISOs are payment processors/agents that bring merchants to PayDiverse
- Payments from ISOs to PayDiverse are tracked in iso_payments
- "overdue" = payment has an expected_date in the past and has not been received

Today's date: ${today}

Data available:
${JSON.stringify(contextData, null, 2)}

Instructions:
- Answer ONLY based on the data provided above. Do not make up numbers.
- Be direct and specific. Format dollar amounts with commas (e.g. $12,345.67).
- When listing merchants, list ALL of them (do not truncate).
- Keep answers concise but complete.
- If data is insufficient to answer, say exactly what you don't have.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.1,
        max_tokens: 1500
      })
    });

    const groqData = await groqRes.json();
    if (groqData.error) return res.status(500).json({ error: groqData.error.message });

    return res.json({ answer: groqData.choices[0].message.content });

  } catch (err) {
    console.error("Victoria API error:", err);
    return res.status(500).json({ error: "Failed to fetch data or call AI. Please try again." });
  }
}
