// api/send-payment-reminder.js
// Handles manual send (POST), auto-send cron (GET ?action=cron), and toggle (GET/POST ?action=toggle)

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";

import nodemailer from "nodemailer";

function buildAutoBody(isoName, amount, reportMonth, dueDate) {
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

async function handleToggleGet(res) {
  const SVC = process.env.SUPABASE_SERVICE_KEY;
  const sbH = { apikey: SVC, Authorization: `Bearer ${SVC}` };
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/app_settings?key=eq.auto_send_enabled&select=value`,
      { headers: sbH }
    );
    if (!r.ok) return res.json({ enabled: true });
    const data = await r.json();
    const enabled = !Array.isArray(data) || data.length === 0 || data[0].value !== "false";
    return res.json({ enabled });
  } catch (_) {
    return res.json({ enabled: true });
  }
}

async function handleTogglePost(req, res) {
  const SVC = process.env.SUPABASE_SERVICE_KEY;
  const sbH = {
    apikey: SVC,
    Authorization: `Bearer ${SVC}`,
    "Content-Type": "application/json",
  };
  const { enabled } = req.body || {};
  const value = enabled === false ? "false" : "true";
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/app_settings`, {
      method: "POST",
      headers: { ...sbH, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ key: "auto_send_enabled", value }),
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ ok: false, error: err });
    }
    return res.json({ ok: true, enabled: value === "true" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

async function handleCron(req, res) {
  // Auth check — Vercel sets Authorization: Bearer {CRON_SECRET} on cron calls
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

  // Check if auto-send is enabled (default: enabled if table/row missing)
  try {
    const sr = await fetch(
      `${SUPABASE_URL}/rest/v1/app_settings?key=eq.auto_send_enabled&select=value`,
      { headers: sbH }
    );
    if (sr.ok) {
      const settings = await sr.json();
      if (Array.isArray(settings) && settings[0]?.value === "false") {
        return res.json({ ok: true, skipped: true, reason: "Auto-send is disabled" });
      }
    }
  } catch (_) { /* table not yet created — treat as enabled */ }

  // Cutoff = today minus 2 days
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Fetch Sep 2026+ payments with no received amount
  const pr = await fetch(
    `${SUPABASE_URL}/rest/v1/iso_payments?select=id,iso_id,report_month,notes,email_sent,isos(id,name,email)&received_amount=is.null&report_month=gte.2026-09-01&limit=300`,
    { headers: sbH }
  );
  if (!pr.ok) return res.status(500).json({ ok: false, error: "Failed to fetch payments" });
  const payments = await pr.json();
  if (!Array.isArray(payments)) return res.status(500).json({ ok: false, error: "Unexpected response" });

  // Filter: overdue 2+ days, not already sent, has ISO email
  const eligible = payments.filter((p) => {
    if (p.email_sent) return false;
    if (!p.isos?.email) return false;
    const m = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/);
    return m && m[1] <= cutoff;
  });

  if (eligible.length === 0) {
    return res.json({ ok: true, sent: 0, message: "Nothing to send" });
  }

  // Fetch residuals in batch
  const isoIds = [...new Set(eligible.map((p) => p.iso_id))].join(",");
  const months = [...new Set(eligible.map((p) => p.report_month))].join(",");
  const rr = await fetch(
    `${SUPABASE_URL}/rest/v1/residuals?select=iso_id,report_month,paydiversenet&iso_id=in.(${isoIds})&report_month=in.(${months})&limit=5000`,
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
      if (amount <= 0) continue;

      const isoName = p.isos.name;
      const isoEmail = p.isos.email;
      const body = buildAutoBody(isoName, amount, p.report_month, dueDate);
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

      await fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
        method: "POST",
        headers: sbH,
        body: JSON.stringify({ payment_id: p.id, to_email: isoEmail, from_email: process.env.GMAIL_USER, subject }),
      });

      await fetch(`${SUPABASE_URL}/rest/v1/iso_payments?id=eq.${p.id}`, {
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query?.action;

  // Toggle state read/write — called via /api/auto-send-toggle rewrite
  if (action === "toggle") {
    if (req.method === "GET") return handleToggleGet(res);
    if (req.method === "POST") return handleTogglePost(req, res);
    return res.status(405).end();
  }

  // Cron auto-send — called via /api/auto-reminders rewrite (Vercel cron uses GET)
  if (action === "cron" || (req.method === "GET" && !action)) {
    return handleCron(req, res);
  }

  // Manual send (existing behavior) — POST without action
  if (req.method !== "POST") return res.status(405).end();

  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;

  if (!GMAIL_USER || !GMAIL_PASS) {
    return res.status(500).json({ ok: false, error: "GMAIL_USER or GMAIL_APP_PASSWORD not configured in Vercel env vars" });
  }

  const { paymentId, isoName, isoEmail, amount, month, dueDate, body } = req.body || {};
  if (!paymentId || !isoEmail || !body) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }

  const monthLabel = new Date(month.slice(0, 7) + "-01T00:00:00Z").toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const amt = (amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    });

    await transporter.sendMail({
      from: `PayDiverse Payments <${GMAIL_USER}>`,
      to: isoEmail,
      subject: `Payment Reminder — ${isoName} Residuals ${monthLabel} ($${amt} past due)`,
      text: body,
      html: (() => {
        const msgOnly = body.split("\n--\n")[0].trim();
        const htmlBody = msgOnly
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>")
          .replace(`$${amt}`, `<strong>$${amt}</strong>`);
        const signature = `
          <table style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:13px;color:#333;border-collapse:collapse">
            <tr>
              <td style="padding-right:20px;border-right:2px solid #d1d5db;vertical-align:top;text-align:center">
                <img src="https://victoria-ericka3.vercel.app/paydiverse-logo.webp" alt="PayDiverse" style="height:40px;margin-bottom:6px"><br>
                <a href="https://www.paydiverse.com" style="color:#2563eb;font-size:12px;text-decoration:none">PayDiverse.com</a>
              </td>
              <td style="padding-left:20px;vertical-align:top;line-height:1.8">
                <strong style="color:#2563eb;font-size:14px">Robert Sena</strong><br>
                PayDiverse Merchant Services<br>
                +1.516.776.9060&nbsp;|&nbsp;<a href="mailto:rob@paydiverse.com" style="color:#2563eb">rob@paydiverse.com</a><br>
                Telegram:&nbsp;<span style="color:#2563eb">RobertNYC</span><br>
              </td>
            </tr>
          </table>`;
        return `<div style="font-family:Arial,sans-serif;max-width:620px;line-height:1.7;color:#333;padding:20px">
          <p style="margin:0 0 16px 0">${htmlBody}</p>
          ${signature}
        </div>`;
      })()
    });

    await fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json", Prefer: "return=minimal"
      },
      body: JSON.stringify({
        payment_id: paymentId,
        to_email: isoEmail,
        from_email: GMAIL_USER,
        subject: `Payment Reminder — ${isoName} Residuals ${monthLabel} ($${amt} past due)`
      })
    });

    await fetch(`${SUPABASE_URL}/rest/v1/iso_payments?id=eq.${paymentId}`, {
      method: "PATCH",
      headers: {
        apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json", Prefer: "return=minimal"
      },
      body: JSON.stringify({ email_sent: true, email_sent_at: new Date().toISOString() })
    });

    return res.json({ ok: true });

  } catch (err) {
    console.error("send-payment-reminder error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
