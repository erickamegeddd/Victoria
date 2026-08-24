// api/send-payment-reminder.js
// Sends payment reminder via Gmail SMTP using app password

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";

import nodemailer from "nodemailer";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
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

  const monthLabel = new Date(month + "-01").toLocaleString("en-US", { month: "long", year: "numeric" });
  const amt = (amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });

  try {
    // Create Gmail transporter using app password
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
        // Build the message body (strip the plain-text signature block we appended)
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

    // Mark email_sent in iso_payments
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
