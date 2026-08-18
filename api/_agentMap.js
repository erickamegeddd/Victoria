// Agent-to-MID commission mapping sourced from "Approved & Active Accounts" Google Sheet
// Columns: B=MID, F=ISO, N=Lead Agent #1, O=Agent #1 %, P=Lead Agent #2, Q=Agent #2 %
// Last updated: 2026-08-18

export const AGENT_MAP = {
  "Brian Miller": [
    { mid: "6322970303054495", pct: 25 },
    { mid: "201100029389",     pct: 25 },
    { mid: "301128356190",     pct: 25 },
    { mid: "970100005349",     pct: 25 },
  ],
  "Drew Ukapbi": [
    { mid: "016233303005",       pct: 25 },
    { mid: "086993303104",       pct: 25 },
    { mid: "201100313023",       pct: 25 },
    { mid: "201100313015",       pct: 25 },
    { mid: "937500000052639",    pct: 25 },
    { mid: "937500000052621",    pct: 25 },
    { mid: "8739759987787143",   pct: 25 },
    { mid: "8739785911030320",   pct: 25 },
    { mid: "002081335951",       pct: 25 },
  ],
  "Michelle W Breier": [
    { mid: "134751",       pct: 0  },
    { mid: "998300028357", pct: 18 },
  ],
  "Claudia Perez": [
    { mid: "998300028357", pct: 30 },
  ],
  "Tiffany Hoffman": [
    { mid: "30119824509", pct: 10 },
  ],
};

// Returns the flat list of MIDs for a given agent
export function getMids(agentName) {
  return (AGENT_MAP[agentName] || []).map((m) => m.mid);
}

// Returns pct for a specific agent+mid combo
export function getPct(agentName, mid) {
  const entry = (AGENT_MAP[agentName] || []).find((m) => m.mid === mid);
  return entry ? entry.pct : 0;
}
