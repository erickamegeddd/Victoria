// @ts-nocheck
import { useEffect, useState, useRef } from "react";
import { Card, Table, Tag, Typography, Space, Input, Button, DatePicker } from "antd";
import { SearchOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { supabase } from "../utils/supabase";
import dayjs from "dayjs";
const { Title, Text } = Typography;

const LATEST_MONTH = "2026-07-01";
const GATEWAY_ISO_NAMES = new Set(["nmi","authorize.net","e-fitness today","efitness today","fraud deflect","midmetrics"]);
const AGGREGATE_PREFIXES = ["PC_COMBINED_","RAC_COMBINED_","NMI_COMBINED_","ALTO_COMBINED_"];
const isAggregateMid = (mid) => AGGREGATE_PREFIXES.some(p => String(mid||"").toUpperCase().startsWith(p));

const PLACEHOLDER_PREFIXES = ["-summary","nuvei_r","adj_","card_insight","nexio_adj"];
const isPlaceholder = (mid) => {
  if (!mid) return false;
  const m = String(mid).toLowerCase();
  if (m.startsWith("2026-")) return true;
  if (["none","summary","pc"].includes(m)) return true;
  return PLACEHOLDER_PREFIXES.some(p => m.includes(p));
};

const MerchantsListPage = () => {
  const [merchants, setMerchants] = useState([]);
  const [residualsOnly, setResidualsOnly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(LATEST_MONTH);
  const [monthMids, setMonthMids] = useState(null);
  const [monthLoading, setMonthLoading] = useState(false);
  const searchInput = useRef(null);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchMonthMids(selectedMonth); }, [selectedMonth]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: mData }, { data: rData }] = await Promise.all([
      supabase.from("merchants").select("*,isos(name,slug)").order("business_name"),
      (async () => { let all=[],from=0; while(true){const{data:b}=await supabase.from("residuals").select("mid,business_name,isos(name)").order("mid").range(from,from+999);if(!b||b.length===0)break;all=all.concat(b);if(b.length<1000)break;from+=1000;}return{data:all};})()
    ]);
    if (mData) setMerchants(mData);
    if (mData && rData) {
      const dbMids = new Set(mData.map(m => String(m.mid || "").trim()));
      const seen = new Set();
      const residualsOnlyList = [];
      rData.forEach(r => {
        const mid = String(r.mid || "").trim();
        if (!mid || dbMids.has(mid) || seen.has(mid)) return;
        seen.add(mid);
        residualsOnlyList.push({ id: mid, mid, business_name: r.business_name || "—", iso: r.isos?.name || "—", type: isPlaceholder(mid) ? "Placeholder/Summary" : "Unregistered MID" });
      });
      setResidualsOnly(residualsOnlyList.sort((a,b) => (a.iso||"").localeCompare(b.iso||"")));
    }
    setLoading(false);
  };

  const fetchMonthMids = async (month) => {
    if (!month) { setMonthMids(null); return; }
    setMonthLoading(true);
    const { data } = await supabase.from("residuals").select("mid,isos(name)").eq("report_month", month);
    const mids = new Set(
      (data || []).filter(r => r.mid && !GATEWAY_ISO_NAMES.has((r.isos?.name||"").toLowerCase()) && !isAggregateMid(r.mid)).map(r => String(r.mid).trim())
    );
    setMonthMids(mids);
    setMonthLoading(false);
  };

  const isGateway = (m) => m.merchant_type === "gateway";

  const activeCount = monthMids ? monthMids.size : merchants.filter(m => m.status === "active" && !isGateway(m)).length;
  const inactiveCount = monthMids
    ? merchants.filter(m => !isGateway(m) && m.status !== "mismatch" && !monthMids.has(String(m.mid || "").trim())).length
    : merchants.filter(m => m.status === "inactive" && !isGateway(m)).length;
  const mismatchCount = merchants.filter(m => m.status === "mismatch").length;
  const gatewayCount = merchants.filter(m => isGateway(m) && m.status !== "mismatch").length;

  const isActiveInMonth = (m) => monthMids ? monthMids.has(String(m.mid || "").trim()) : m.status === "active";

  const filteredMerchants =
    activeFilter === "residuals" || activeFilter === "mismatch" || activeFilter === "gateway" ? [] :
    activeFilter === "active" ? merchants.filter(m => !isGateway(m) && m.status !== "mismatch" && isActiveInMonth(m)) :
    activeFilter === "inactive" ? merchants.filter(m => !isGateway(m) && m.status !== "mismatch" && !isActiveInMonth(m)) :
    merchants.filter(m => m.status !== "mismatch");

  const mismatchMerchants = merchants.filter(m => m.status === "mismatch");
  const gatewayMerchants = merchants.filter(m => isGateway(m) && m.status !== "mismatch");

  const prevMonth = () => {
    const prev = dayjs(selectedMonth).subtract(1, "month").format("YYYY-MM-01");
    if (prev >= "2026-01-01") setSelectedMonth(prev);
  };
  const nextMonth = () => {
    const next = dayjs(selectedMonth).add(1, "month").format("YYYY-MM-01");
    if (next <= LATEST_MONTH) setSelectedMonth(next);
  };
  const atStart = selectedMonth <= "2026-01-01";
  const atEnd = selectedMonth >= LATEST_MONTH;

  const getSearchProps = (dataIndex, label) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8, minWidth: 200 }}>
        <Input ref={searchInput} placeholder={`Search ${label}`} value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={confirm} style={{ marginBottom: 8, display: "block" }} />
        <Space>
          <Button type="primary" onClick={confirm} icon={<SearchOutlined />} size="small" style={{ width: 90 }}>Search</Button>
          <Button onClick={() => { clearFilters(); confirm(); }} size="small" style={{ width: 90 }}>Reset</Button>
        </Space>
      </div>
    ),
    filterIcon: filtered => <SearchOutlined style={{ color: filtered ? "var(--primary-color)" : undefined }} />,
    onFilter: (value, record) => String(record[dataIndex] || "").toLowerCase().includes(String(value).toLowerCase()),
    onFilterDropdownOpenChange: open => { if (open) setTimeout(() => searchInput.current?.select(), 100); },
  });

  const monthStatusCol = {
    title: dayjs(selectedMonth).format("MMM YYYY") + " Status",
    key: "monthStatus",
    width: 130,
    render: (_, r) => {
      if (isGateway(r)) return <Tag color="blue" style={{fontSize:11}}>Reseller</Tag>;
      if (r.status === "mismatch") return <Tag color="purple" style={{fontSize:11}}>Mismatch</Tag>;
      const active = monthMids ? monthMids.has(String(r.mid || "").trim()) : r.status === "active";
      return <Tag color={active ? "green" : "default"} style={{fontSize:11,fontWeight:600}}>{active ? "✓ Active" : "✗ Inactive"}</Tag>;
    }
  };

  const columns = [
    { title: "MID", dataIndex: "mid", key: "mid", width: 160, ...getSearchProps("mid", "MID") },
    { title: "Business Name", dataIndex: "business_name", key: "dba", ellipsis: true, ...getSearchProps("business_name", "Business Name") },
    { title: "ISO", key: "iso", width: 130,
      render: (_, r) => r.isos?.name || "—",
      filters: [...new Set(merchants.map(m => m.isos?.name).filter(Boolean))].sort().map(n => ({ text: n, value: n })),
      onFilter: (v, r) => r.isos?.name === v, filterSearch: true },
    monthStatusCol,
    { title: "Notes", dataIndex: "notes", key: "n", ellipsis: true, ...getSearchProps("notes", "Notes"),
      render: v => <span style={{ color: "var(--muted-color)", fontSize: 11 }}>{v || "—"}</span> },
  ];

  const resColumns = [
    { title: "MID", dataIndex: "mid", key: "mid", width: 200, ...getSearchProps("mid", "MID") },
    { title: "Name in Residuals", dataIndex: "business_name", key: "biz", ellipsis: true, ...getSearchProps("business_name", "Name") },
    { title: "ISO", dataIndex: "iso", key: "iso", width: 150,
      filters: [...new Set(residualsOnly.map(r => r.iso).filter(Boolean))].sort().map(n => ({ text: n, value: n })),
      onFilter: (v, r) => r.iso === v, filterSearch: true },
    { title: "Type", dataIndex: "type", key: "t", width: 160,
      render: v => <Tag color={v === "Placeholder/Summary" ? "orange" : "gold"}>{v}</Tag> },
  ];

  const mismatchColumns = [
    { title: "MID", dataIndex: "mid", key: "mid", width: 200, ...getSearchProps("mid", "MID") },
    { title: "Business Name", dataIndex: "business_name", key: "dba", ellipsis: true, ...getSearchProps("business_name", "Business Name") },
    { title: "ISO", key: "iso", width: 150,
      render: (_, r) => r.isos?.name || "—",
      filters: [...new Set(mismatchMerchants.map(m => m.isos?.name).filter(Boolean))].sort().map(n => ({ text: n, value: n })),
      onFilter: (v, r) => r.isos?.name === v, filterSearch: true },
    { title: "Issue", dataIndex: "notes", key: "n", ellipsis: true, ...getSearchProps("notes", "Issue"),
      render: v => <span style={{ color: "#b45309", fontSize: 12 }}>{v || "—"}</span> },
  ];

  const totalDisplayed = activeFilter === "residuals" ? residualsOnly.length
    : activeFilter === "mismatch" ? mismatchMerchants.length
    : activeFilter === "gateway" ? gatewayMerchants.length
    : filteredMerchants.length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>Merchants / MIDs</Title>
        <Text style={{ color: "var(--muted-color)", fontSize: 13 }}>{totalDisplayed} {activeFilter === "residuals" ? "residual entries" : activeFilter === "mismatch" ? "mismatch entries" : activeFilter === "gateway" ? "gateway clients" : "total"}</Text>
      </div>

      {/* Month navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Button icon={<LeftOutlined />} onClick={prevMonth} disabled={atStart || monthLoading} size="small" style={{ borderRadius: 8 }} />
        <DatePicker picker="month" value={dayjs(selectedMonth)} allowClear={false}
          disabledDate={d => d.isBefore(dayjs("2026-01-01")) || d.isAfter(dayjs(LATEST_MONTH))}
          onChange={d => { if(d) setSelectedMonth(d.format("YYYY-MM-01")); }}
          format="MMM YYYY" size="small"
          style={{ fontWeight: 700, fontSize: 14, color: "var(--primary-color)", borderRadius: 8, border: "1.5px solid #bfdbfe", background: "#eff6ff", width: 120 }} />
        <Button icon={<RightOutlined />} onClick={nextMonth} disabled={atEnd || monthLoading} size="small" style={{ borderRadius: 8 }} />
        {monthLoading && <Text style={{ fontSize: 12, color: "var(--muted-color)" }}>Loading…</Text>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: `✓ ${activeCount} Active`, key: "active", color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
          { label: `✗ ${inactiveCount} Inactive`, key: "inactive", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
          { label: `🔗 ${gatewayCount} Reseller Revenue`, key: "gateway", color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
          { label: `⚠ ${residualsOnly.length} Residuals Only`, key: "residuals", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
          { label: `⚡ ${mismatchCount} Mismatch`, key: "mismatch", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
        ].map(({ label, key, color, bg, border }) => (
          <div key={key} onClick={() => setActiveFilter(activeFilter === key ? null : key)}
            style={{ padding: "6px 16px", borderRadius: 20, background: bg,
              border: `2px solid ${activeFilter === key ? color : border}`,
              color, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.18s",
              transform: activeFilter === key ? "translateY(-1px)" : "none",
              boxShadow: activeFilter === key ? `0 4px 12px ${color}30` : "none" }}>
            {label}
          </div>
        ))}
        {activeFilter && <Button size="small" onClick={() => setActiveFilter(null)} style={{ borderRadius: 20, fontSize: 12 }}>Clear ✕</Button>}
      </div>

      {activeFilter === "residuals" && (
        <div style={{ marginBottom: 12, padding: "8px 14px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a" }}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: "#d97706" }}>
            MIDs found in residuals data but not registered in the merchants table. Placeholders/summaries are artificial import entries.
          </Text>
        </div>
      )}

      {activeFilter === "gateway" && (
        <div style={{ marginBottom: 12, padding: "8px 14px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd" }}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: "#0369a1" }}>
            Merchants using PayDiverse gateway services (Authorize.Net / NMI). Revenue tracked separately from ISO processing income — not counted in Active total.
          </Text>
        </div>
      )}

      {activeFilter === "mismatch" && (
        <div style={{ marginBottom: 12, padding: "8px 14px", background: "#f5f3ff", borderRadius: 10, border: "1px solid #ddd6fe" }}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>
            Merchants with data issues that need resolution — unknown ISO, non-standard MID, or missing required fields.
          </Text>
        </div>
      )}

      {activeFilter && activeFilter !== "residuals" && activeFilter !== "mismatch" && activeFilter !== "gateway" && (
        <div style={{ marginBottom: 12, padding: "8px 14px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>
            Showing {filteredMerchants.length} {activeFilter} merchant{filteredMerchants.length !== 1 ? "s" : ""} for {dayjs(selectedMonth).format("MMMM YYYY")}
          </Text>
        </div>
      )}

      <Card>
        {activeFilter === "residuals" ? (
          <Table key="residuals" scroll={{x:"max-content",y:"calc(100vh - 360px)"}} dataSource={residualsOnly} columns={resColumns} rowKey="id" loading={loading}
            pagination={{ pageSize: 50, showTotal: t => `${t} entries` }} size="small" />
        ) : activeFilter === "mismatch" ? (
          <Table key="mismatch" scroll={{x:"max-content",y:"calc(100vh - 360px)"}} dataSource={mismatchMerchants} columns={mismatchColumns} rowKey="id" loading={loading}
            pagination={{ pageSize: 50, showTotal: t => `${t} entries` }} size="small" />
        ) : activeFilter === "gateway" ? (
          <Table key="gateway" scroll={{x:"max-content",y:"calc(100vh - 360px)"}} dataSource={gatewayMerchants} columns={columns} rowKey="id" loading={loading}
            pagination={{ pageSize: 50, showTotal: t => `${t} gateway clients` }} size="small" />
        ) : (
          <Table key={activeFilter ?? "all"} scroll={{x:"max-content",y:"calc(100vh - 360px)"}} dataSource={filteredMerchants} columns={columns} rowKey="id" loading={loading || monthLoading}
            onRow={(r) => {
              if (!monthMids) return {};
              const active = isGateway(r) || monthMids.has(String(r.mid || "").trim());
              return { style: { background: active ? "#f0fdf4" : "#fef2f2" } };
            }}
            pagination={{ pageSize: 50, showTotal: t => `${t} merchants` }} size="small" />
        )}
      </Card>
    </div>
  );
};
export default MerchantsListPage;
