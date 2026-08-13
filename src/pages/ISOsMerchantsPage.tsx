// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, Tag, Typography, Space, Table, Button, Select } from "antd";
import { supabase } from "../utils/supabase";
import dayjs from "dayjs";
const { Title, Text } = Typography;
const { Option } = Select;

const GATEWAY_ISO_NAMES = ["nmi", "authorize.net", "e-fitness today", "efitness today", "fraud deflect", "midmetrics"];

const SectionHeader = ({ label, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
    <div style={{ height: 2, flex: 1, background: color, borderRadius: 2 }} />
    <span style={{ fontSize: 14, fontWeight: 800, color: color, letterSpacing: 2, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {label}
    </span>
    <div style={{ height: 2, flex: 1, background: color, borderRadius: 2 }} />
  </div>
);

const ISOsMerchantsPage = () => {
  const [merchants, setMerchants] = useState([]);
  const [midDates, setMidDates] = useState({});
  const [isoStats, setIsoStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedISO, setExpandedISO] = useState(null);
  const [isoFilters, setIsoFilters] = useState({});
  const [sortBy, setSortBy] = useState("alpha");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: merchantData }, { data: residualData }] = await Promise.all([
      supabase.from("merchants").select("*,isos(id,name,slug)").order("business_name"),
      supabase.from("residuals").select("mid, report_month, iso_id, gross_revenue, gross_volume, paydiversenet"),
    ]);

    if (merchantData) setMerchants(merchantData);

    if (residualData) {
      const datesMap = {};
      const statsMap = {};
      residualData.forEach(r => {
        if (r.mid && r.report_month) {
          if (!datesMap[r.mid]) datesMap[r.mid] = { start: r.report_month, end: r.report_month };
          if (r.report_month < datesMap[r.mid].start) datesMap[r.mid].start = r.report_month;
          if (r.report_month > datesMap[r.mid].end) datesMap[r.mid].end = r.report_month;
        }
        if (r.iso_id) {
          if (!statsMap[r.iso_id]) statsMap[r.iso_id] = { volume: 0, residual: 0 };
          statsMap[r.iso_id].volume += (r.gross_volume || r.gross_revenue || 0);
          statsMap[r.iso_id].residual += (r.paydiversenet || 0);
        }
      });
      setMidDates(datesMap);
      setIsoStats(statsMap);
    }
    setLoading(false);
  };

  const isoGroups = merchants.reduce((acc, m) => {
    const isoId = m.isos?.id || "unknown";
    const isoName = m.isos?.name || "Unknown ISO";
    if (!acc[isoId]) acc[isoId] = { isoId, isoName, merchants: [] };
    acc[isoId].merchants.push(m);
    return acc;
  }, {});

  const sortList = (list) => {
    const s = [...list];
    switch (sortBy) {
      case "alpha":    return s.sort((a, b) => a.isoName.localeCompare(b.isoName));
      case "mids":     return s.sort((a, b) => b.merchants.length - a.merchants.length);
      case "volume":   return s.sort((a, b) => (isoStats[b.isoId]?.volume || 0) - (isoStats[a.isoId]?.volume || 0));
      case "residual": return s.sort((a, b) => (isoStats[b.isoId]?.residual || 0) - (isoStats[a.isoId]?.residual || 0));
      default: return s;
    }
  };

  const allISOs = Object.values(isoGroups);
  const regularISOs = sortList(allISOs.filter(iso => !GATEWAY_ISO_NAMES.includes(iso.isoName.toLowerCase())));
  const gatewayISOs = sortList(allISOs.filter(iso => GATEWAY_ISO_NAMES.includes(iso.isoName.toLowerCase())));

  const setFilter = (isoId, filter) => {
    setIsoFilters(prev => ({ ...prev, [isoId]: prev[isoId] === filter ? null : filter }));
    if (expandedISO !== isoId) setExpandedISO(isoId);
  };

  const fmt = (d) => d ? dayjs(d).format("MMM YYYY") : "--";

  const merchantColumns = [
    { title: "MID", dataIndex: "mid", key: "mid", width: 150 },
    { title: "Business Name", dataIndex: "business_name", key: "dba", ellipsis: true, render: v => <Text strong>{v}</Text> },
    { title: "Status", dataIndex: "status", key: "s", width: 110,
      render: v => <Tag color={v === "active" ? "green" : "default"} style={{ fontWeight: 600 }}>{v === "active" ? "Active" : "Inactive"}</Tag> },
    { title: "Start Date", key: "start", width: 110,
      render: (_, r) => { const d = midDates[r.mid]; return d?.start ? <Text style={{ color: "#059669", fontWeight: 600 }}>{fmt(d.start)}</Text> : <Text style={{ color: "var(--muted-color)" }}>--</Text>; } },
    { title: "End Date", key: "end", width: 110,
      render: (_, r) => { const d = midDates[r.mid]; if (!d?.end) return <Text style={{ color: "var(--muted-color)" }}>--</Text>; return r.status === "active" ? <Tag color="green" style={{ fontWeight: 600 }}>Still Active</Tag> : <Text style={{ color: "#dc2626", fontWeight: 600 }}>{fmt(d.end)}</Text>; } },
    { title: "Notes", dataIndex: "notes", key: "n", ellipsis: true, render: v => <span style={{ color: "var(--muted-color)", fontSize: 11 }}>{v || "--"}</span> },
  ];

  const renderISOCard = ({ isoId, isoName, merchants: isoMerchants }) => {
    const active = isoMerchants.filter(m => m.status === "active").length;
    const inactive = isoMerchants.filter(m => m.status !== "active").length;
    const isExpanded = expandedISO === isoId;
    const currentFilter = isoFilters[isoId] || null;
    const filteredMerchants = currentFilter ? isoMerchants.filter(m => currentFilter === "active" ? m.status === "active" : m.status !== "active") : isoMerchants;
    const pills = [
      { label: `${active} Active`, key: "active", color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
      { label: `${inactive} Inactive`, key: "inactive", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
      { label: `${isoMerchants.length} Total`, key: null, color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
    ];
    return (
      <Card key={isoId} style={{ borderLeft: `4px solid ${active > 0 ? "#1d4ed8" : "#d1d5db"}`, borderRadius: 12 }} bodyStyle={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Text strong style={{ fontSize: 15, cursor: "pointer" }} onClick={() => setExpandedISO(isExpanded ? null : isoId)}>{isoName}</Text>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {pills.map(({ label, key: pillKey, color, bg, border }) => (
                <div key={label} onClick={() => { if (pillKey === null) { setIsoFilters(prev => ({ ...prev, [isoId]: null })); setExpandedISO(isExpanded && !currentFilter ? null : isoId); } else { setFilter(isoId, pillKey); } }}
                  style={{ padding: "3px 12px", borderRadius: 14, background: currentFilter === pillKey ? color : bg, border: `2px solid ${currentFilter === pillKey ? color : border}`, color: currentFilter === pillKey ? "#fff" : color, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", transform: currentFilter === pillKey ? "translateY(-1px)" : "none" }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
          <Text onClick={() => setExpandedISO(isExpanded ? null : isoId)} style={{ color: "var(--muted-color)", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", marginLeft: 8 }}>{isExpanded ? "Hide" : "Show"}</Text>
        </div>
        {isExpanded && currentFilter && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "6px 12px", background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
            <Text style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8" }}>Showing {filteredMerchants.length} {currentFilter} merchant{filteredMerchants.length !== 1 ? "s" : ""}</Text>
            <Button size="small" onClick={() => setIsoFilters(prev => ({ ...prev, [isoId]: null }))} style={{ marginLeft: "auto", fontSize: 11, borderRadius: 12 }}>Clear</Button>
          </div>
        )}
        {isExpanded && (
          <div style={{ marginTop: 14, borderTop: "1px solid var(--line-color)", paddingTop: 14 }}>
            <Table dataSource={filteredMerchants} columns={merchantColumns} rowKey="id" pagination={{ pageSize: 20, showTotal: t => `${t} merchants` }} size="small" scroll={{ x: 800 }} />
          </div>
        )}
      </Card>
    );
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><Text style={{ color: "var(--muted-color)" }}>Loading...</Text></div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>ISOs -- Merchant Overview</Title>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Text style={{ color: "var(--muted-color)", fontSize: 12 }}>Sort by:</Text>
          <Select value={sortBy} onChange={setSortBy} size="small" style={{ width: 185 }}>
            <Option value="alpha">Alphabetical</Option>
            <Option value="mids">Number of MIDs</Option>
            <Option value="volume">Transaction Volume</Option>
            <Option value="residual">Residual (High to Low)</Option>
          </Select>
          <Text style={{ color: "var(--muted-color)", fontSize: 13, marginLeft: 4 }}>{allISOs.length} ISOs -- {merchants.length} merchants</Text>
        </div>
      </div>

      <SectionHeader label="Processors / ISOs" color="#1d4ed8" />
      <Space direction="vertical" style={{ width: "100%" }} size={10}>
        {regularISOs.map(iso => renderISOCard(iso))}
      </Space>

      {gatewayISOs.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <SectionHeader label="Gateway" color="#7c3aed" />
          <Space direction="vertical" style={{ width: "100%" }} size={10}>
            {gatewayISOs.map(iso => renderISOCard(iso))}
          </Space>
        </div>
      )}
    </div>
  );
};
export default ISOsMerchantsPage;
