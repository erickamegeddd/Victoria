import { AGENT_MAP } from "./_agentMap.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const agents = Object.keys(AGENT_MAP).map((name) => ({ agent_name: name }));
  return res.json(agents);
}
