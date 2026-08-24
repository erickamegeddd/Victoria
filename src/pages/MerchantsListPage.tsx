// @ts-nocheck
import { useEffect, useState, useRef } from "react";
import { Card, Table, Tag, Typography, Space, Input, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { supabase } from "../utils/supabase";
const { Title, Text } = Typography;

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
  const [activeFilter, setActiveFilter] = useState(null); // 'active' | 'inactive' | 'residuals' | null
  const searchInput = useRef(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: mData }, { data: rData }] = await Promise.all([
      supabase.from("merchants").select("*,isos(name,slug)").order("business_name"),
      supabase.from("residuals").select("mid,business_name,isos(name)").order("mid")
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

  const activeCount = merchants.filter(m => m.status === "active").length;
  const inactiveCount = merchants.filter(m => m.status !== "active").length;

  const filteredMerchants = activeFilter === "residuals" ? [] :
    activeFilter ? merchants.filter(m => activeFilter === "active" ? m.status === "active" : m.status !== "active") : merchants;

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

  const columns = [
    { title: "MID", dataIndex: "mid", key: "mid", width: 160, ...getSearchProps("mid", "MID") },
    { title: "Business Name", dataIndex: "business_name", key: "dba", ellipsis: true, ...getSearchProps("business_name", "Business Name") },
    { title: "ISO", key: "iso", width: 130,
      render: (_, r) => r.isos?.name || "—",
      filters: [...new Set(merchants.map(m => m.isos?.name).filter(Boolean))].sort().map(n => ({ text: n, value: n })),
      onFilter: (v, r) => r.isos?.name === v, filterSearch: true },
    { title: "Status", dataIndex: "status", key: "s", width: 110,
      render: v => <Tag color={v === "active" ? "green" : "default"} style={{ fontWeight: 600 }}>{v === "active" ? "✓ Active" : "✗ Inactive"}</Tag> },
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Merchants / MIDs</Title>
        <Text style={{ color: "var(--muted-color)", fontSize: 13 }}>{activeFilter === "residuals" ? residualsOnly.length : merchants.length} {activeFilter === "residuals" ? "residual entries" : "total"}</Text>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: `✓ ${activeCount} Active`, key: "active", color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
          { label: `✗ ${inactiveCount} Inactive`, key: "inactive", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
          { label: `⚠ ${residualsOnly.length} Residuals Only`, key: "residuals", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
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

      {activeFilter && activeFilter !== "residuals" && (
        <div style={{ marginBottom: 12, padding: "8px 14px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>
            Showing {filteredMerchants.length} {activeFilter} merchant{filteredMerchants.length !== 1 ? "s" : ""}
          </Text>
        </div>
      )}

      <Card>
        {activeFilter === "residuals" ? (
          <Table scroll={{x:"max-content",y:"calc(100vh - 320px)"}} dataSource={residualsOnly} columns={resColumns} rowKey="id" loading={loading}
            pagination={{ pageSize: 50, showTotal: t => `${t} entries` }} size="small" />
        ) : (
          <Table scroll={{x:"max-content",y:"calc(100vh - 320px)"}} dataSource={filteredMerchants} columns={columns} rowKey="id" loading={loading}
            pagination={{ pageSize: 50, showTotal: t => `${t} merchants` }} size="small" />
        )}
      </Card>
    </div>
  );
};
export default MerchantsListPage;
