import nodemailer from "nodemailer";

const SB_URL = "https://vuqflofuzhybutkkzroa.supabase.co";

function buildBody(isoName, amount, reportMonth, dueDate) {
  const monthLabel = new Date(reportMonth.slice(0, 7) + "-01T12:00:00Z")
    .toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const amt = (amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const due = new Date(dueDate + "T12:00:00Z")
    .toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `Hi ${isoName},

This is an inquiry regarding your outstanding ${monthLabel} residual payment of $${amt}, which was due on ${due}.

Please communicate the status of this payment as soon as possible.

Thank you for your prompt attention to this matter.

Best,
Robert Sena

--
Robert Sena
PayDiverse Merchant Services
+1.516.776.9060 | rob@paydiverse.com
Telegram: RobertNYC
PayDiverse.com`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Vercel cron sends Authorization: Bearer {CRON_SECRET} when CRON_SECRET is set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers["authorization"] || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const SVC = process.env.SUPABASE_SERVICE_KEY;
  const sbH = {
    apikey: SVC,
    Authorization: `Bearer ${SVC}`,
    "Content-Type": "application/json",
  };

  // 1. Check if auto-send is enabled (defaults to enabled if table/row missing)
  try {
    const sr = await fetch(
      `${SB_URL}/rest/v1/app_settings?key=eq.auto_send_enabled&select=value`,
      { headers: sbH }
    );
    if (sr.ok) {
      const settings = await sr.json();
      if (Array.isArray(settings) && settings[0]?.value === "false") {
        return res.json({ ok: true, skipped: true, reason: "Auto-send is disabled" });
      }
    }
  } catch (_) {
    // Table not yet created — treat as enabled
  }

  // 2. Cutoff = today - 2 days (YYYY-MM-DD)
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // 3. Fetch Sep 2026+ payments with no received amount, join ISO info
  const pr = await fetch(
    `${SB_URL}/rest/v1/iso_payments?select=id,iso_id,report_month,notes,email_sent,isos(id,name,email)&received_amount=is.null&report_month=gte.2026-09-01&limit=300`,
    { headers: sbH }
  );
  if (!pr.ok) return res.status(500).json({ ok: false, error: "Failed to fetch payments" });
  const payments = await pr.json();
  if (!Array.isArray(payments)) return res.status(500).json({ ok: false, error: "Unexpected response" });

  // 4. Filter: overdue by 2+ days, not already auto-sent, has ISO email
  const eligible = payments.filter((p) => {
    if (p.email_sent) return false;
    if (!p.isos?.email) return false;
    const m = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/);
    return m && m[1] <= cutoff;
  });

  if (eligible.length === 0) {
    return res.json({ ok: true, sent: 0, eligible: 0, message: "Nothing to send" });
  }

  // 5. Fetch all relevant residuals in one query (group by iso_id + report_month in JS)
  const isoIds = [...new Set(eligible.map((p) => p.iso_id))].join(",");
  const months = [...new Set(eligible.map((p) => p.report_month))].join(",");
  const rr = await fetch(
    `${SB_URL}/rest/v1/residuals?select=iso_id,report_month,paydiversenet&iso_id=in.(${isoIds})&report_month=in.(${months})&limit=5000`,
    { headers: sbH }
  );
  const residuals = rr.ok ? await rr.json() : [];
  const resMap = {};
  if (Array.isArray(residuals)) {
    residuals.forEach((r) => {
      const k = `${r.iso_id}|${r.report_month}`;
      resMap[k] = (resMap[k] || 0) + (r.paydiversenet || 0);
    });
  }

  // 6. Send emails
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  const results = [];
  const errors = [];

  for (const p of eligible) {
    try {
      const dueDate = p.notes.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)[1];
      const amount = Math.round((resMap[`${p.iso_id}|${p.report_month}`] || 0) * 100) / 100;
      if (amount <= 0) continue; // skip zero-amount ISOs

      const isoName = p.isos.name;
      const isoEmail = p.isos.email;
      const body = buildBody(isoName, amount, p.report_month, dueDate);
      const monthLabel = new Date(p.report_month.slice(0, 7) + "-01T12:00:00Z")
        .toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
      const amt = amount.toLocaleString("en-US", { minimumFractionDigits: 2 });
      const subject = `Payment Reminder — ${isoName} Residuals ${monthLabel} ($${amt} past due)`;

      await transporter.sendMail({
        from: `PayDiverse Payments <${process.env.GMAIL_USER}>`,
        to: isoEmail,
        subject,
        text: body,
        html: `<pre style="font-family:inherit;font-size:14px;line-height:1.6">${body}</pre>`,
      });

      // Log to email_logs
      await fetch(`${SB_URL}/rest/v1/email_logs`, {
        method: "POST",
        headers: sbH,
        body: JSON.stringify({
          payment_id: p.id,
          to_email: isoEmail,
          from_email: process.env.GMAIL_USER,
          subject,
        }),
      });

      // Mark email_sent = true
      await fetch(`${SB_URL}/rest/v1/iso_payments?id=eq.${p.id}`, {
        method: "PATCH",
        headers: { ...sbH, Prefer: "return=minimal" },
        body: JSON.stringify({ email_sent: true, email_sent_at: new Date().toISOString() }),
      });

      results.push({ id: p.id, iso: isoName, email: isoEmail, amount });
    } catch (e) {
      errors.push({ id: p.id, error: e.message });
    }
  }

  return res.json({ ok: true, sent: results.length, results, errors });
}
