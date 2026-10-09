// Agent-to-MID commission mapping
// Sourced from "Approved & Active Accounts" Google Sheet + old dashboard portfolio data
// Last updated: 2026-10-09 (July 2026 agent-sheet review)
// `until` = last eligible report_month (YYYY-MM-01) for terminated merchants
// `only` = list of report_months the entry applies to; `skip` = list of report_months it must not apply to.
// April-July 2026 were reviewed against the agent sheets (reseller/gateway rows excluded); other months keep the prior mapping.
const APR = "2026-04-01";
const MAY = "2026-05-01";
const JUNE = "2026-06-01";
const JULY = "2026-07-01";

export const AGENT_MAP = {
  "Brian Miller": [
    { mid: "6322970303054495", pct: 25 },
    { mid: "201100029389",     pct: 25 },
    { mid: "301128356190",     pct: 25, skip: [APR, MAY, JUNE, JULY] },
    { mid: "30112835619",      pct: 25, only: [APR, MAY, JUNE, JULY] },
    { mid: "970100005349",     pct: 25 },
  ],
  "Drew Ukapbi": [
    { mid: "85543291507",      pct: 25 },
    { mid: "016233303005",     pct: 25, skip: [JULY] },
    { mid: "086993303104",     pct: 25, skip: [JULY] },
    { mid: "8739785911030320", pct: 25, skip: [APR, MAY, JUNE, JULY] },
    { mid: "16813274602",      pct: 25, only: [APR, MAY, JUNE] },  // HighPlains - Netevia (unprefixed in June)
    { mid: "20543274503",      pct: 25, only: [APR, MAY, JUNE] },  // Hair Pros - Netevia (unprefixed in June)
    { mid: "742174573269800",  pct: 25, only: [APR] },  // Lving Hair Growth - Netevia
    { mid: "742143233270006",  pct: 25, only: [APR] },  // Proskin living - Netevia
    { mid: "742168653291408",  pct: 25, only: [JUNE] },  // Prime Skin Products - Netevia
    { mid: "742185543291507",  pct: 25, only: [APR, MAY, JUNE] },  // Prime Keto Product - Netevia
    { mid: "742116813274602",  pct: 25, only: [JULY] },  // HighPlains Digital Goods - Netevia (stored with 7421 prefix)
    { mid: "742120543274503",  pct: 25, only: [JULY] },  // Hair Pros Healthy Living - Netevia
    { mid: "742116233303005",  pct: 25, only: [JULY] },  // Movaxx Diet Products - Netevia
    { mid: "742186993303104",  pct: 25, only: [JULY] },  // MVXX Skin Product - Netevia
    { mid: "201100313023",     pct: 25 },
    { mid: "201100313015",     pct: 25 },
    { mid: "937500000052639",  pct: 25 },
    { mid: "937500000052621",  pct: 25 },
    { mid: "8739759987787143", pct: 25, skip: [APR, MAY, JUNE] },
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
    { mid: "633200000177278",  pct: 33.33, skip: [APR, MAY, JUNE, JULY] },  // 7-Gates Credit Solutions - NMI (reseller revenue; excluded for July)
    { mid: "8034751340",       pct: 33.33 },  // 9361-7165 Quebec Inc - Payment Cloud NXGEN
    { mid: "998300008813",     pct: 25    },  // Pet Direct Savings LLC - Nuvei
    { mid: "998300028357",     pct: 18, until: "2026-06-01" },  // Doc by Phone LLC - Nuvei (terminated Apr 21 2026; June agent sheet still carries its -8.50 fee)
  ],
  "Robert Sena": [
    { mid: "567000000053447", pct: 25, only: [APR, MAY, JUNE, JULY] },  // Interstate Plywood - PayArc
  ],
  "Frank Sena": [
    { mid: "926701398962524", pct: 25, only: [APR, MAY, JUNE, JULY] },  // Designer Support - PayArc (Authorize.Net row excluded)
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

// Reseller / gateway revenue is never commissionable - only merchant processing MIDs earn agent payouts.
// Applied to reviewed months only (see REVIEWED_MONTHS); other months keep prior behavior until their agent sheets are reviewed.
const RESELLER_ISOS = new Set(["nmi", "authorize.net", "e-fitness today", "efitness today", "fraud deflect", "midmetrics"]);
const REVIEWED_MONTHS = new Set([APR, MAY, JUNE, JULY]);
export function isReseller(isoName, month) {
  return REVIEWED_MONTHS.has(month) && RESELLER_ISOS.has(String(isoName || "").trim().toLowerCase());
}

// True if a map entry is outside its month scope (only/skip) for the given report month.
export function isScopedOut(entry, month) {
  if (!month) return false;
  if (entry.only && !entry.only.includes(month)) return true;
  if (entry.skip && entry.skip.includes(month)) return true;
  return false;
}

// True if an entry applies to the given report month (scope + termination).
export function isActive(entry, month) {
  return !isScopedOut(entry, month) && (!entry.until || !month || entry.until >= month);
}

// True if every entry for this agent+mid is out of scope for the month.
export function midScopedOut(agentName, mid, month) {
  const es = (AGENT_MAP[agentName] || []).filter((m) => m.mid === mid);
  return es.length > 0 && es.every((e) => isScopedOut(e, month));
}

// Returns MIDs active for a given report month (YYYY-MM-01).
export function getActiveMids(agentName, month) {
  return (AGENT_MAP[agentName] || [])
    .filter((m) => isActive(m, month))
    .map((m) => m.mid);
}

// Returns all MIDs for an agent regardless of termination status.
export function getMids(agentName) {
  return (AGENT_MAP[agentName] || []).map((m) => m.mid);
}

// Returns commission pct for a specific agent+mid. Optionally checks termination for a given month.
export function getPct(agentName, mid, month) {
  const entry = (AGENT_MAP[agentName] || []).find(
    (m) => m.mid === mid && isActive(m, month)
  );
  return entry ? entry.pct : 0;
}
