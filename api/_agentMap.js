// Agent-to-MID commission mapping sourced from "Approved & Active Accounts" Google Sheet
// Columns: B=MID, F=ISO, N=Lead Agent #1, O=Agent #1 %, P=Lead Agent #2, Q=Agent #2 %
// Last updated: 2026-08-19

export const AGENT_MAP = {
  "Brian Miller": [
    { mid: "6322970303054495", pct: 25 },
    { mid: "201100029389",     pct: 25 },
    { mid: "301128356190",     pct: 25 },
    { mid: "970100005349",     pct: 25 },
  ],
  "Drew Ukapbi": [
    { mid: "85543291507",      pct: 25 },  // Shop Linda Wolschlager LLC
    { mid: "016233303005",     pct: 25 },
    { mid: "086993303104",     pct: 25 },
    { mid: "201100313023",     pct: 25 },
    { mid: "201100313015",     pct: 25 },
    { mid: "937500000052639",  pct: 25 },
    { mid: "937500000052621",  pct: 25 },
    { mid: "8739759987787143", pct: 25 },
    { mid: "8739785911030320", pct: 25 },
    { mid: "002081335951",     pct: 25 },
  ],
  "Michelle W Breier": [
    { mid: "134751", pct: 25 },  // APD Pass LLC - Seamless Chex
  ],
  "Claudia Perez": [
    // No active MIDs at this time
  ],
  "Tiffany Hoffman": [
    { mid: "30119824509", pct: 10 },
  ],
  "Meghan Anderson": [
    { mid: "567000000860502", pct: 25 },  // The Credit Pros - PayArc
    { mid: "5160041877686",   pct: 25 },  // The Credit Pros - Cardworks
    { mid: "941000137750",    pct: 25 },  // The Credit Pros - MerchantE-Synovous
  ],
  "Pedro Teixeira Payinsight": [
    { mid: "002327562203", pct: 30 },  // styraapp.com - Nexio | CMS
  ],
};

export function getMids(agentName) {
  return (AGENT_MAP[agentName] || []).map((m) => m.mid);
}

export function getPct(agentName, mid) {
  const entry = (AGENT_MAP[agentName] || []).find((m) => m.mid === mid);
  return entry ? entry.pct : 0;
}
