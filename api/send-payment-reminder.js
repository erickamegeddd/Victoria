// api/send-payment-reminder.js
// Sends a payment reminder email via Resend and marks email_sent in iso_payments

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ ok: false, error: "RESEND_API_KEY not configured in Vercel env vars" });

  const { paymentId, isoName, isoEmail, amount, month, dueDate, body } = req.body || {};
  if (!paymentId || !isoEmail || !body) return res.status(400).json({ ok: false, error: "Missing required fields" });

  const monthLabel = new Date(month + "-01").toLocaleString("en-US", { month: "long", year: "numeric" });
  const amt = (amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });

  try {
    // Send via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "PayDiverse Payments <payments@paydiverse.com>",
        to: [isoEmail],
        subject: `Payment Reminder — ${isoName} Residuals ${monthLabel} ($${amt} past due)`,
        text: body,
        html: `<pre style="font-family:sans-serif;white-space:pre-wrap;line-height:1.6">${body.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>`
      })
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.error("Resend error:", emailData);
      return res.status(500).json({ ok: false, error: emailData.message || "Email send failed" });
    }

    // Mark email_sent in iso_payments
    await fetch(`${SUPABASE_URL}/rest/v1/iso_payments?id=eq.${paymentId}`, {
      method: "PATCH",
      headers: {
        apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json", Prefer: "return=minimal"
      },
      body: JSON.stringify({ email_sent: true, email_sent_at: new Date().toISOString() })
    });

    return res.json({ ok: true, emailId: emailData.id });

  } catch (err) {
    console.error("send-payment-reminder error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
