export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(200).json({ error: "No key" });
  try {
    const r = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${GROQ_KEY}` }
    });
    const d = await r.json();
    const ids = (d.data || []).map(m => m.id).sort();
    return res.status(200).json({ available_models: ids, total: ids.length });
  } catch(e) {
    return res.status(200).json({ error: e.message });
  }
}
