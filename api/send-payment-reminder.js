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
        const htmlBody = body
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>")
          .replace(`$${amt}`, `<strong>$${amt}</strong>`);
        return `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.7;color:#333">
          <p style="margin:0">${htmlBody}</p>
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
