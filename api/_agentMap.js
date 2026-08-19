// Agent-to-MID commission mapping
// Sourced from "Approved & Active Accounts" Google Sheet + old dashboard portfolio data
// Last updated: 2026-08-19
// `until` = last eligible report_month (YYYY-MM-01) for terminated merchants

export const AGENT_MAP = {
  "Brian Miller": [
    { mid: "6322970303054495", pct: 25 },
    { mid: "201100029389",     pct: 25 },
    { mid: "301128356190",     pct: 25 },
    { mid: "970100005349",     pct: 25 },
  ],
  "Drew Ukapbi": [
    { mid: "85543291507",      pct: 25 },
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
    { mid: "134751",           pct: 25    },  // APD Pass LLC - Seamless Chex (active)
    { mid: "30110847657",      pct: 25    },  // APD Pass LLC - Maverick
    { mid: "40110375519",      pct: 25    },  // Assured Pet LLC - Maverick
    { mid: "40110423921",      pct: 25    },  // Preferred Savings LLC - Maverick
    { mid: "40111744200",      pct: 18    },  // Doc by Phone LLC - Maverick
    { mid: "50110094839",      pct: 18.75 },  // Oncall Health Group LLC - Maverick
    { mid: "50110214619",      pct: 25    },  // Distance Pet Med Services - Maverick
    { mid: "520003548246",     pct: 33.33 },  // Gregory Dale Alexander - Worldpay + Authorize.Net
    { mid: "941000137678",     pct: 18    },  // Oncall Health Group LLC - MerchantE-Fresno
    { mid: "926700017431398",  pct: 33.33 },  // Ben Oberg / Millionaire Mafia - PayArc
    { mid: "926700149318205",  pct: 33.33 },  // Common Wealth Web Solutions - PayArc
    { mid: "926700416741292",  pct: 90    },  // Cardenas Management Group - PayArc
    { mid: "998300034884",     pct: 33.33 },  // Pro Art & Framing - Authorize.Net + Nuvei
    { mid: "700257",           pct: 33.33 },  // Financial Consulting Mgmt Group - CC Bill
    { mid: "580400000002212",  pct: 33.33 },  // GNX Web Enterprises LLC - First Direct Financial
    { mid: "633200000177278",  pct: 33.33 },  // 7-Gates Credit Solutions - NMI
    { mid: "8034751340",       pct: 33.33 },  // 9361-7165 Quebec Inc - Payment Cloud NXGEN
    { mid: "998300008813",     pct: 25    },  // Pet Direct Savings LLC - Nuvei
    { mid: "998300028357",     pct: 18, until: "2026-04-01" },  // Doc by Phone LLC - Nuvei (terminated Apr 21 2026)
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

// Returns MIDs active for a given report month (YYYY-MM-01).
export function getActiveMids(agentName, month) {
  return (AGENT_MAP[agentName] || [])
    .filter((m) => !m.until || m.until >= month)
    .map((m) => m.mid);
}

// Returns all MIDs for an agent regardless of termination status.
export function getMids(agentName) {
  return (AGENT_MAP[agentName] || []).map((m) => m.mid);
}

// Returns commission pct for a specific agent+mid. Optionally checks termination for a given month.
export function getPct(agentName, mid, month) {
  const entry = (AGENT_MAP[agentName] || []).find(
    (m) => m.mid === mid && (!m.until || !month || m.until >= month)
  );
  return entry ? entry.pct : 0;
}
