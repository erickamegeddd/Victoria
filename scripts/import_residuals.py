#!/usr/bin/env python3
"""
PayDiverse Residuals Import Script
===================================
Reads ISO report config from iso_report_configs.json, downloads the
corresponding residual files from Dropbox, parses them using the defined
column mappings, and imports/updates the residuals table in Supabase.

Usage:
  python import_residuals.py --month 2026-06 --iso "Maverick" [--dry-run]
  python import_residuals.py --month 2026-06 --all [--dry-run]

Flags:
  --month     Month to import in YYYY-MM format
  --iso       Specific ISO name (must match a key in iso_report_configs.json)
  --all       Import all ISOs that have verified=true configs
  --dry-run   Parse and preview without writing to Supabase
  --force     Allow importing unverified ISOs (verified=false)
"""

import sys
import os
import json
import argparse
import zipfile
import xml.etree.ElementTree as ET
import re
import urllib.request
import base64
from datetime import datetime
from fnmatch import fnmatch

# ── Config ────────────────────────────────────────────────────────────────────
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "iso_report_configs.json")

SUPA_URL    = "https://vuqflofuzhybutkkzroa.supabase.co"
SUPA_ANON   = os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE")

# Dropbox shared link for Residuals By Year folder
DROPBOX_LINK = "https://www.dropbox.com/scl/fo/gni0p244kbwb82ogm2ded/AHB055Suo8KsSWmVy_zB_wk?rlkey=jiqluxxk1p7lmksy2gwuphj7f&st=qsslffxr&dl=0"

# Pipedream credentials (for Dropbox API access)
PD_CLIENT_ID     = os.environ.get("PD_CLIENT_ID", "6NjkKTBzDSrxC50EtDZEJTHIRQbHNZmQ0k_7iQF8tVg")
PD_CLIENT_SECRET = os.environ.get("PD_CLIENT_SECRET", "bhXvWww8ncATyIYdYGzf22NBBk8b865GV6fsrnpqNMs")
PD_PROJECT_ID    = "proj_vos09Av"
PD_EXTERNAL_USER = "4dd457e9-2528-48c2-81b9-4bd5dad64a83"

# ── Helpers ───────────────────────────────────────────────────────────────────

def col_letter_to_idx(col_str):
    """Convert Excel column letter (A, B, ..., Z, AA, ...) to 0-based index."""
    if not col_str or col_str == "NEEDS_VERIFICATION":
        return None
    idx = 0
    for c in col_str.upper():
        idx = idx * 26 + (ord(c) - ord('A') + 1)
    return idx - 1

def get_pd_token():
    p = json.dumps({
        "grant_type": "client_credentials",
        "client_id": PD_CLIENT_ID,
        "client_secret": PD_CLIENT_SECRET
    }).encode()
    r = urllib.request.Request(
        "https://api.pipedream.com/v1/oauth/token",
        data=p, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read())["access_token"]

def dropbox_list(pd_token, path):
    """List contents of a path inside the Residuals By Year shared link."""
    url = "https://api.dropboxapi.com/2/files/list_folder"
    b64url = base64.b64encode(url.encode()).decode().replace("+", "-").replace("/", "_").rstrip("=")
    pu = f"https://api.pipedream.com/v1/connect/{PD_PROJECT_ID}/proxy/{b64url}?account_id=dropbox&external_user_id={PD_EXTERNAL_USER}"
    body = {"path": path, "shared_link": {"url": DROPBOX_LINK}, "recursive": False}
    req = urllib.request.Request(
        pu, data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {pd_token}", "x-pd-environment": "production", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read()).get("entries", [])

def dropbox_download(pd_token, dropbox_path, local_path):
    """Download a file from the shared link by path."""
    url = "https://content.dropboxapi.com/2/sharing/get_shared_link_file"
    arg = json.dumps({"url": DROPBOX_LINK, "path": dropbox_path})
    encoded_arg = urllib.parse.quote(arg) if hasattr(urllib, 'parse') else urllib.request.quote(arg)
    import urllib.parse
    encoded_arg = urllib.parse.quote(arg)
    full_url = f"{url}?arg={encoded_arg}"
    b64url = base64.b64encode(full_url.encode()).decode().replace("+", "-").replace("/", "_").rstrip("=")
    pu = f"https://api.pipedream.com/v1/connect/{PD_PROJECT_ID}/proxy/{b64url}?account_id=dropbox&external_user_id={PD_EXTERNAL_USER}"
    req = urllib.request.Request(
        pu, headers={"Authorization": f"Bearer {pd_token}", "x-pd-environment": "production"}
    )
    with urllib.request.urlopen(req) as r:
        with open(local_path, "wb") as f:
            f.write(r.read())

def parse_xlsx(path):
    """Parse xlsx file returning list of rows as lists, using correct cell references."""
    with zipfile.ZipFile(path) as z:
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            tree = ET.parse(z.open("xl/sharedStrings.xml"))
            for si in tree.getroot():
                texts = "".join(t.text or "" for t in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"))
                shared_strings.append(texts)
        tree = ET.parse(z.open("xl/worksheets/sheet1.xml"))
        root = tree.getroot()
        ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
        rows_data = []
        for row in root.iter(f"{ns}row"):
            row_dict = {}
            for cell in row:
                ref = cell.get("r", "")
                col_m = re.match(r"([A-Z]+)", ref)
                if not col_m:
                    continue
                col_idx = col_letter_to_idx(col_m.group(1))
                t = cell.get("t", "")
                v_el = cell.find(f"{ns}v")
                val = v_el.text if v_el is not None else ""
                if t == "s" and val:
                    val = shared_strings[int(val)]
                row_dict[col_idx] = val
            if row_dict:
                max_col = max(row_dict.keys())
                rows_data.append([row_dict.get(i, "") for i in range(max_col + 1)])
    return rows_data

def f(v):
    """Parse numeric cell value — handles negatives stored as (500.00) accounting format."""
    if v is None or v == "":
        return 0.0
    try:
        s = str(v).strip().replace(",", "").replace("$", "").replace(" ", "")
        if s.startswith("(") and s.endswith(")"):
            return -float(s[1:-1])  # (500.00) → -500.0
        return float(s) if s else 0.0
    except:
        return 0.0

def get_col(row, col_letter):
    """Get value from row by column letter (e.g. 'A', 'L', 'AP')."""
    idx = col_letter_to_idx(col_letter)
    if idx is None or idx >= len(row):
        return ""
    return row[idx]

def sb_get(path):
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1/{path}",
        headers={"apikey": SUPA_ANON, "Authorization": f"Bearer {SUPA_ANON}"}
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def sb_delete_iso_month(iso_id, report_month, victoria_key):
    """Delete existing residuals for this ISO+month using Victoria service key."""
    url = f"{SUPA_URL}/rest/v1/residuals?iso_id=eq.{iso_id}&report_month=eq.{report_month}"
    req = urllib.request.Request(
        url, headers={"apikey": victoria_key, "Authorization": f"Bearer {victoria_key}", "Prefer": "return=minimal"},
        method="DELETE"
    )
    with urllib.request.urlopen(req) as r:
        return r.status

def sb_insert_residuals(records, victoria_key):
    """Insert residual records using Victoria service key."""
    payload = json.dumps(records).encode()
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1/residuals",
        data=payload,
        headers={"apikey": victoria_key, "Authorization": f"Bearer {victoria_key}",
                 "Content-Type": "application/json", "Prefer": "return=minimal"},
        method="POST"
    )
    with urllib.request.urlopen(req) as r:
        return r.status

# ── Custom parsers ────────────────────────────────────────────────────────────

def parse_midmetrics_rows(rows, iso_id, report_month, file_name):
    """
    Midmetrics grouped summary format.
    Each section (Alerts, RDR, Transactions, etc.) has rows like:
      col A = 'midmetrics_XXX Total', col D = Gross Profit, col E = PayDiverse share.
    Sums col D and col E per merchant across all sections.
    Row where A == 'Total' is a section subtotal — skip it.
    """
    SECTION_NAMES = {'Alerts', 'RDR', 'Transactions', 'Disputes',
                     'Representment Submissions', 'Total', 'B', 'Count'}
    merchants = {}

    for row in rows:
        if not row or len(row) == 0:
            continue
        a_val = str(row[0] if len(row) > 0 else '').strip()
        if not a_val or a_val == 'Total' or a_val in SECTION_NAMES:
            continue
        if not a_val.endswith(' Total'):
            continue
        merchant_name = a_val[:-len(' Total')].strip()
        gross = f(row[3] if len(row) > 3 else '')
        pdn   = f(row[4] if len(row) > 4 else '')
        if merchant_name not in merchants:
            merchants[merchant_name] = {'gross': 0.0, 'pdn': 0.0}
        merchants[merchant_name]['gross'] += gross
        merchants[merchant_name]['pdn']   += pdn

    records = []
    total_pdn = 0.0
    for name, vals in sorted(merchants.items()):
        pdn = vals['pdn']
        total_pdn += pdn
        records.append({
            "iso_id": iso_id,
            "report_month": report_month,
            "mid": name,
            "business_name": name,
            "gross_volume": 0.0,
            "gross_revenue": vals['gross'],
            "fees_deducted": 0.0,
            "net_revenue": pdn,
            "paydiversenet": pdn,
            "agent_payout": 0.0,
            "agent_split_pct": None,
            "source_file": file_name,
        })
    return records, total_pdn


# ── Main import logic ─────────────────────────────────────────────────────────

def import_iso_month(iso_name, cfg, iso_id, report_month, month_folder, dry_run=False, victoria_key=None):
    """
    Find the ISO's file in Dropbox for this month, parse it, and import to Supabase.
    Returns (rows_imported, total_paydiversenet, error_message)
    """
    if cfg.get("col_paydiversenet") == "NEEDS_VERIFICATION":
        return 0, 0, f"SKIPPED — column mapping not verified for {iso_name}"

    # Find the file in Dropbox
    pd_token = get_pd_token()
    entries = dropbox_list(pd_token, month_folder)

    # Try subfolders too (e.g. Breier)
    all_entries = list(entries)
    for e in entries:
        if e.get(".tag") == "folder":
            sub_entries = dropbox_list(pd_token, f"{month_folder}/{e['name']}")
            all_entries.extend(sub_entries)

    # Match file by pattern
    patterns = cfg.get("file_pattern", [])
    if isinstance(patterns, str):
        patterns = [patterns]

    matched_file = None
    for entry in all_entries:
        if entry.get(".tag") != "file":
            continue
        name = entry.get("name", "")
        for pat in patterns:
            if fnmatch(name, pat):
                matched_file = entry
                break
        if matched_file:
            break

    if not matched_file:
        return 0, 0, f"No file found for {iso_name} in {month_folder} (patterns: {patterns})"

    file_name = matched_file["name"]
    print(f"  Found: {file_name}")

    # Download
    import tempfile
    local_path = f"/tmp/import_{iso_name.replace(' ', '_')}_{report_month}.xlsx"
    try:
        dropbox_download(pd_token, matched_file.get("path_display", f"{month_folder}/{file_name}"), local_path)
    except Exception as e:
        return 0, 0, f"Download failed: {e}"

    # Parse
    try:
        rows = parse_xlsx(local_path)
    except Exception as e:
        return 0, 0, f"Parse failed: {e}"

    # Dispatch to custom parsers where needed
    if cfg.get("custom_parser") == "midmetrics":
        records, total_pdn = parse_midmetrics_rows(rows, iso_id, report_month, file_name)
        print(f"  Parsed {len(records)} merchants | paydiversenet total: ${total_pdn:,.2f}")
        if dry_run:
            print(f"  DRY RUN — not writing to Supabase")
            return len(records), total_pdn, None
        if not victoria_key:
            return 0, total_pdn, "No Victoria service key provided — cannot write to Supabase"
        sb_delete_iso_month(iso_id, report_month, victoria_key)
        if records:
            sb_insert_residuals(records, victoria_key)
        return len(records), total_pdn, None

    skip = cfg.get("skip_header_rows", 1)
    headers = rows[0] if rows else []
    data = rows[skip:]

    # Extract records
    records = []
    total_pdn = 0
    col_mid       = cfg.get("col_mid")
    col_biz       = cfg.get("col_business_name")
    col_vol       = cfg.get("col_gross_volume")
    col_rev       = cfg.get("col_gross_revenue")
    col_pdn       = cfg.get("col_paydiversenet")
    col_agent_pay = cfg.get("col_agent_payout")
    col_split     = cfg.get("col_agent_split_pct")

    for row in data:
        mid = get_col(row, col_mid) if col_mid else None
        biz = get_col(row, col_biz) if col_biz else None

        vol    = f(get_col(row, col_vol)) if col_vol else 0.0
        rev    = f(get_col(row, col_rev)) if col_rev else 0.0
        pdn    = f(get_col(row, col_pdn)) if col_pdn else 0.0
        a_pay  = f(get_col(row, col_agent_pay)) if col_agent_pay else 0.0
        split_v = f(get_col(row, col_split)) if col_split else None

        if split_v is not None and (split_v <= 0 or split_v >= 1):
            split_v = None  # store only valid percentages

        total_pdn += pdn
        if mid is None and biz is None and pdn == 0 and vol == 0:
            continue  # skip empty rows

        rec = {
            "iso_id": iso_id,
            "report_month": report_month,
            "mid": mid or (biz[:50] if biz else f"ROW{len(records)+1}"),
            "business_name": biz,
            "gross_volume": vol,
            "gross_revenue": rev,
            "fees_deducted": rev - pdn if (rev > 0 and pdn > 0) else 0,
            "net_revenue": pdn,
            "paydiversenet": pdn,
            "agent_payout": a_pay,
            "agent_split_pct": split_v,
            "source_file": file_name,
        }
        records.append(rec)

    print(f"  Parsed {len(records)} rows | paydiversenet total: ${total_pdn:,.2f}")

    if dry_run:
        print(f"  DRY RUN — not writing to Supabase")
        return len(records), total_pdn, None

    if not victoria_key:
        return 0, total_pdn, "No Victoria service key provided — cannot write to Supabase"

    # Delete existing and re-insert
    sb_delete_iso_month(iso_id, report_month, victoria_key)
    if records:
        sb_insert_residuals(records, victoria_key)

    return len(records), total_pdn, None


def main():
    parser = argparse.ArgumentParser(description="Import PayDiverse residuals from Dropbox")
    parser.add_argument("--month", required=True, help="Month in YYYY-MM format, e.g. 2026-06")
    parser.add_argument("--iso", help="Specific ISO name to import")
    parser.add_argument("--all", action="store_true", help="Import all verified ISOs")
    parser.add_argument("--dry-run", action="store_true", help="Parse without writing to Supabase")
    parser.add_argument("--force", action="store_true", help="Import unverified ISOs too")
    parser.add_argument("--victoria-key", help="Victoria Supabase service key (required for writes)")
    args = parser.parse_args()
    # Fall back to env var if --victoria-key not passed (safer for CI/CD)
    if not args.victoria_key:
        args.victoria_key = os.environ.get("SUPABASE_SERVICE_KEY", "")

    # Load config
    with open(CONFIG_FILE) as f:
        config = json.load(f)

    iso_configs = config.get("isos", {})

    # Resolve month folder path (e.g. 2026-06 → /2026/06-2026)
    year, month_num = args.month.split("-")
    month_folder = f"/{month_num}-{year}"
    report_month = f"{year}-{month_num}-01"

    # Get ISO id map from Supabase
    isos = sb_get("isos?select=id,name&limit=100")
    iso_id_map = {iso["name"]: iso["id"] for iso in isos}

    # Determine which ISOs to import
    if args.iso:
        targets = [args.iso]
    elif getattr(args, "all"):
        targets = [name for name, cfg in iso_configs.items()
                   if cfg.get("verified") or args.force]
    else:
        parser.print_help()
        sys.exit(1)

    print(f"\n=== Import: {args.month} ({'DRY RUN' if args.dry_run else 'LIVE'}) ===")
    print(f"Month folder: {month_folder}")
    print(f"ISOs to import: {targets}\n")

    results = []
    for iso_name in targets:
        cfg = iso_configs.get(iso_name)
        if not cfg:
            print(f"[{iso_name}] No config found — skipping")
            results.append((iso_name, 0, 0, "No config"))
            continue

        if not cfg.get("verified") and not args.force:
            print(f"[{iso_name}] Not verified — skipping (use --force to override)")
            results.append((iso_name, 0, 0, "Not verified"))
            continue

        iso_id = iso_id_map.get(iso_name)
        if not iso_id:
            print(f"[{iso_name}] Not found in isos table — skipping")
            results.append((iso_name, 0, 0, "ISO not in DB"))
            continue

        print(f"[{iso_name}]")
        rows_count, total_pdn, error = import_iso_month(
            iso_name, cfg, iso_id, report_month, month_folder,
            dry_run=args.dry_run, victoria_key=args.victoria_key
        )
        if error:
            print(f"  ERROR: {error}")
        results.append((iso_name, rows_count, total_pdn, error or "OK"))
        print()

    print("\n=== Summary ===")
    grand_total = 0
    for iso_name, rows_count, pdn, status in results:
        print(f"  {iso_name:<30} {rows_count:>4} rows | ${pdn:>10,.2f} | {status}")
        grand_total += pdn
    print(f"  {'TOTAL':<30} {'':>4}      | ${grand_total:>10,.2f}")


if __name__ == "__main__":
    main()
