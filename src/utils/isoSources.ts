// @ts-nocheck
// Where to find each ISO's residual report for reconciliation: Portal, Email or Sheet.
// Add each ISO's portal link in PORTAL_URLS (keyed by the normalized name below) and the "Portal" word on the Payments page becomes a clickable link.
const norm = (n) => String(n || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const SOURCES = {
  altopay: "Email", approvely: "Email", authorizenet: "Portal", cardinsight: "Sheet", cardworks: "Portal",
  ccbill: "Email", celerofinical: "Portal", coastalpay: "Portal", efitnesstoday: "Portal", expitrans: "Portal",
  finns: "Email", firstdirectfinancial: "Portal", frauddeflect: "Portal", get: "Portal", humboldt: "Email",
  maverick: "Portal", merchantindustry: "Email", suede: "Email", merchantefresno: "Portal",
  merchantesynovous: "Portal", midmetrics: "Email", netevia: "Portal", nexio: "Portal", nmi: "Portal",
  nuvei: "Portal", onyx: "Unknown/New", payarc: "Portal", paymentcloud: "Portal", rac: "Email",
  revitpay: "Portal", seamlesschex: "Email", signapay: "Portal", taluspay: "Portal", thehiriskprocessor: "Email",
  totalapps: "Portal", usag: "Portal", worldpayvantiv: "Portal",
};

// Portal links, keyed by normalized ISO name.
export const PORTAL_URLS = {
  cardinsight: "https://docs.google.com/spreadsheets/d/1vCAxKLklJXD2yIqA4Kqm7T-SuXhffiN0eo1OzgvCPEU/edit?gid=1614338599#gid=1614338599",
  authorizenet: "http://authorize.net/",
  cardworks: "https://partner.paymentshub.com/dashboard",
  celerofinical: "https://finical-core.artefactscloud.com/",
  coastalpay: "https://www.mycoastalpay.com/login",
  efitnesstoday: "https://safeweborder.limelightcrm.com/admin/login.php?url=%2Fadmin%2Fdashboard.php",
  expitrans: "https://var.expitrans.com/forms.php",
  firstdirectfinancial: "https://login.firstdirectfinancial.com/v2/login?ref=%2Fv2",
  frauddeflect: "https://portal.frauddeflect.net/",
  get: "https://portal.gettrx.com/Account/Signin?ReturnUrl=%2f",
  maverick: "https://dashboard.maverickpayments.com/login",
  merchantefresno: "https://www.merchante-solutions.com/jsp/secure/sLogin.jsp",
  merchantesynovous: "https://www.merchante-solutions.com/jsp/secure/sLogin.jsp",
  netevia: "https://hq.netevia.com/Account/Login",
  nexio: "https://cforce.cmsonline.com/login.php",
  nmi: "https://secure.nmi.com/resellers/login.php",
  nuvei: "https://partner.nuvei.com/",
  payarc: "https://partnerhub.payarc.net/login",
  paymentcloud: "https://stratusapp.io/",
  revitpay: "https://portal.revitpay.com/v2/login?ref=/v2",
  signapay: "https://portal.payhub.com/",
  taluspay: "http://www.taluspayportal.com/",
  totalapps: "https://total-apps.net/superadmin/login",
  usag: "https://thepaymentconnection.com/",
  worldpayvantiv: "https://www.accessmyiq.com/group/merchant",
};

export const getIsoSource = (isoName) => {
  const k = norm(isoName);
  const key = k.startsWith("merchante") && !SOURCES[k] ? "merchantesynovous" : k;
  return { source: SOURCES[key] || "", url: PORTAL_URLS[key] || "" };
};
