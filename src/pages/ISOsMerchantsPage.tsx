// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, Tag, Typography, Space, Table, Button, Input } from "antd";
import { UserDeleteOutlined, UserAddOutlined, SearchOutlined } from "@ant-design/icons";
import { supabase } from "../utils/supabase";
const { Title, Text } = Typography;

const ISOsMerchantsPage = () => {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedISO, setExpandedISO] = useState(null);
  const [isoFilters, setIsoFilters] = useState({}); // { [isoId]: 'active' | 'inactive' | null }

  useEffect(() => { fetchMerchants(); }, []);

  const fetchMerchants = async () => {
    setLoading(true);
    const { data } = await supabase.from("merchants").select("*,isos(id,name,slug)").order("business_name");
    if (data) setMerchants(data);
    setLoading(false);
  };

  const isoGroups = merchants.reduce((acc, m) => {
    const isoId = m.isos?.id || "unknown";
    const isoName = m.isos?.name || "Unknown ISO";
    if (!acc[isoId]) acc[isoId] = { isoId, isoName, merchants: [] };
    acc[isoId].merchants.push(m);
    return acc;
  }, {});

  const isoList = Object.values(isoGroups).sort((a, b) => b.merchants.length - a.merchants.length);

  const setFilter = (isoId, filter) => {
    setIsoFilters(prev => ({ ...prev, [isoId]: prev[isoId] === filter ? null : filter }));
    // Auto-expand when clicking a pill
    if (expandedISO !== isoId) setExpandedISO(isoId);
  };

  const merchantColumns = [
    { title: "MID", dataIndex: "mid", key: "mid", width: 160 },
    { title: "Business Name", dataIndex: "business_name", key: "dba", ellipsis: true,
      render: v => <Text strong>{v}</Text> },
    { title: "Status", dataIndex: "status", key: "s", width: 110,
      render: v => (
        <Tag color={v === "active" ? "green" : "default"} style={{ fontWeight: 600 }}>
          {v === "active" ? "✓ Active" : "✗ Inactive"}
        </Tag>
      )},
    { title: "Notes", dataIndex: "notes", key: "n", ellipsis: true,
      render: v => <span style={{ color: "var(--muted-color)", fontSize: 11 }}>{v || "—"}</span> },
  ];

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><Text style={{ color: "var(--muted-color)" }}>Loading...</Text></div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>ISOs — Merchant Overview</Title>
        <Text style={{ color: "var(--muted-color)", fontSize: 13 }}>{isoList.length} ISOs · {merchants.length} total merchants</Text>
      </div>

      <Space direction="vertical" style={{ width: "100%" }} size={10}>
        {isoList.map(({ isoId, isoName, merchants: isoMerchants }) => {
          const active = isoMerchants.filter(m => m.status === "active").length;
          const inactive = isoMerchants.filter(m => m.status !== "active").length;
          const isExpanded = expandedISO === isoId;
          const currentFilter = isoFilters[isoId] || null;

          const filteredMerchants = currentFilter
            ? isoMerchants.filter(m => currentFilter === "active" ? m.status === "active" : m.status !== "active")
            : isoMerchants;

          const pills = [
            { label: `✓ ${active} Active`, key: "active", color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
            { label: `✗ ${inactive} Inactive`, key: "inactive", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
            { label: `${isoMerchants.length} Total`, key: null, color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
          ];

          return (
            <Card key={isoId}
              style={{ borderLeft: `4px solid ${active > 0 ? "#1d4ed8" : "#d1d5db"}`, borderRadius: 12 }}
              bodyStyle={{ padding: "14px 18px" }}>

              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <Text strong style={{ fontSize: 15, cursor: "pointer" }}
                    onClick={() => setExpandedISO(isExpanded ? null : isoId)}>
                    {isoName}
                  </Text>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {pills.map(({ label, key: pillKey, color, bg, border }) => (
                      <div key={label}
                        onClick={() => {
                          if (pillKey === null) {
                            // Total pill — clear filter + expand
                            setIsoFilters(prev => ({ ...prev, [isoId]: null }));
                            setExpandedISO(isExpanded && !currentFilter ? null : isoId);
                          } else {
                            setFilter(isoId, pillKey);
                          }
                        }}
                        style={{
                          padding: "3px 12px", borderRadius: 14,
                          background: currentFilter === pillKey ? color : bg,
                          border: `2px solid ${currentFilter === pillKey ? color : border}`,
                          color: currentFilter === pillKey ? "#fff" : color,
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          transition: "all 0.15s",
                          transform: currentFilter === pillKey ? "translateY(-1px)" : "none",
                        }}>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
                <Text onClick={() => setExpandedISO(isExpanded ? null : isoId)}
                  style={{ color: "var(--muted-color)", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", marginLeft: 8 }}>
                  {isExpanded ? "▲ Hide" : "▼ Show"}
                </Text>
              </div>

              {/* Filter indicator */}
              {isExpanded && currentFilter && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "6px 12px", background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8" }}>
                    Showing {filteredMerchants.length} {currentFilter} merchant{filteredMerchants.length !== 1 ? "s" : ""}
                  </Text>
                  <Button size="small" onClick={() => setIsoFilters(prev => ({ ...prev, [isoId]: null }))}
                    style={{ marginLeft: "auto", fontSize: 11, borderRadius: 12 }}>
                    Clear ✕
                  </Button>
                </div>
              )}

              {/* Expanded merchant list */}
              {isExpanded && (
                <div style={{ marginTop: 14, borderTop: "1px solid var(--line-color)", paddingTop: 14 }}>
                  <Table
                    dataSource={filteredMerchants}
                    columns={merchantColumns}
                    rowKey="id"
                    pagination={{ pageSize: 20, showTotal: t => `${t} merchants` }}
                    size="small"
                  />
                </div>
              )}
            </Card>
          );
        })}
      </Space>
    </div>
  );
};
export default ISOsMerchantsPage;
