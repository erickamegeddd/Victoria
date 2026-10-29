// @ts-nocheck
// Where to find each ISO's residual report for reconciliation: Portal, Email or Sheet.
// Add each ISO's portal link in PORTAL_URLS (keyed by the normalized name below) and the "Portal" word on the Payments page becomes a clickable link.
const norm = (n) => String(n || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const SOURCES = {
  altopay: "Email", approvely: "Email", authorizenet: "Portal", cardinsight: "Sheet", cardworks: "Portal",
  ccbill: "Email", celerofinical: "Portal", coastalpay: "Portal", efitnesstoday: "Portal", expitrans: "Portal",
  finns: "Email", firstdirectfinancial: "Portal", frauddeflect: "Portal", get: "Portal", humboldt: "Email",
  maverick: "Portal", merchantindustry: "Email", suede: "Email", merchanteFresno: "Portal", merchantefresno: "Portal",
  merchantesynovous: "Portal", midmetrics: "Email", netevia: "Portal", nexio: "Portal", nmi: "Portal",
  nuvei: "Portal", onyx: "Unknown/New", payarc: "Portal", paymentcloud: "Portal", rac: "Email",
  revitpay: "Portal", seamlesschex: "Email", signapay: "Portal", taluspay: "Portal", thehiriskprocessor: "Email",
  totalapps: "Portal", usag: "Portal", worldpayvantiv: "Portal",
};

// Portal links, e.g. maverick: "https://portal.example.com". Empty until collected.
export const PORTAL_URLS = {};

export const getIsoSource = (isoName) => {
  const k = norm(isoName);
  const key = k.startsWith("merchante") && !SOURCES[k] ? "merchantesynovous" : k;
  return { source: SOURCES[key] || "", url: PORTAL_URLS[key] || "" };
};
