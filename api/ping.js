export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(200).json({ error: "No GROQ_API_KEY set" });

  const models = ["llama-3.1-8b-instant", "gemma2-9b-it", "llama3-70b-8192", "llama-3.3-70b-versatile"];
  const results = {};

  for (const model of models) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: "Say: OK" }], max_tokens: 5 })
      });
      const d = await r.json();
      if (d.error) {
        results[model] = `ERROR: ${d.error.message.slice(0, 120)}`;
      } else {
        results[model] = `OK: ${d.choices?.[0]?.message?.content || "no content"}`;
      }
    } catch(e) {
      results[model] = `EXCEPTION: ${e.message}`;
    }
  }

  return res.status(200).json({ key_prefix: GROQ_KEY.slice(0, 12) + "...", results });
}
