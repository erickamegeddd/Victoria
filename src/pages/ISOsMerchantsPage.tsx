// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, Tag, Typography, Space, Table, Button } from "antd";
import { supabase } from "../utils/supabase";
import dayjs from "dayjs";
const { Title, Text } = Typography;

const ISOsMerchantsPage = () => {
  const [merchants, setMerchants] = useState([]);
  const [midDates, setMidDates] = useState({}); // { [mid]: { start, end } }
  const [loading, setLoading] = useState(true);
  const [expandedISO, setExpandedISO] = useState(null);
  const [isoFilters, setIsoFilters] = useState({});

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: merchantData }, { data: residualData }] = await Promise.all([
      supabase.from("merchants").select("*,isos(id,name,slug)").order("business_name"),
      supabase.from("residuals").select("mid, report_month").order("report_month"),
    ]);

    if (merchantData) setMerchants(merchantData);

    // Build start/end date map from residuals
    if (residualData) {
      const datesMap = {};
      residualData.forEach(r => {
        if (!r.mid || !r.report_month) return;
        if (!datesMap[r.mid]) datesMap[r.mid] = { start: r.report_month, end: r.report_month };
        if (r.report_month < datesMap[r.mid].start) datesMap[r.mid].start = r.report_month;
        if (r.report_month > datesMap[r.mid].end) datesMap[r.mid].end = r.report_month;
      });
      setMidDates(datesMap);
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

  const isoList = Object.values(isoGroups).sort((a, b) => b.merchants.length - a.merchants.length);

  const setFilter = (isoId, filter) => {
    setIsoFilters(prev => ({ ...prev, [isoId]: prev[isoId] === filter ? null : filter }));
    if (expandedISO !== isoId) setExpandedISO(isoId);
  };

  const fmt = (d) => d ? dayjs(d).format("MMM YYYY") : "—";

  const merchantColumns = [
    { title: "MID", dataIndex: "mid", key: "mid", width: 150 },
    { title: "Business Name", dataIndex: "business_name", key: "dba", ellipsis: true,
      render: v => <Text strong>{v}</Text> },
    { title: "Status", dataIndex: "status", key: "s", width: 110,
      render: v => (
        <Tag color={v === "active" ? "green" : "default"} style={{ fontWeight: 600 }}>
          {v === "active" ? "✓ Active" : "✗ Inactive"}
        </Tag>
      )},
    {
      title: "Start Date",
      key: "start",
      width: 110,
      render: (_, r) => {
        const dates = midDates[r.mid];
        return dates?.start
          ? <Text style={{ color: "#059669", fontWeight: 600 }}>{fmt(dates.start)}</Text>
          : <Text style={{ color: "var(--muted-color)" }}>—</Text>;
      }
    },
    {
      title: "End Date",
      key: "end",
      width: 110,
      render: (_, r) => {
        const dates = midDates[r.mid];
        if (!dates?.end) return <Text style={{ color: "var(--muted-color)" }}>—</Text>;
        const isRecent = dayjs(dates.end).isAfter(dayjs().subtract(2, "month"));
        return r.status === "active"
          ? <Tag color="green" style={{ fontWeight: 600 }}>Still Active</Tag>
          : <Text style={{ color: "#dc2626", fontWeight: 600 }}>{fmt(dates.end)}</Text>;
      }
    },
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

              {isExpanded && (
                <div style={{ marginTop: 14, borderTop: "1px solid var(--line-color)", paddingTop: 14 }}>
                  <Table
                    dataSource={filteredMerchants}
                    columns={merchantColumns}
                    rowKey="id"
                    pagination={{ pageSize: 20, showTotal: t => `${t} merchants` }}
                    size="small"
                    scroll={{ x: 800 }}
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
