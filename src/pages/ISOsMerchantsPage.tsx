// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, Tag, Typography, Space, Table, Button, Collapse } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, RightOutlined, DownOutlined } from "@ant-design/icons";
import { supabase } from "../utils/supabase";
const { Title, Text } = Typography;
const { Panel } = Collapse;

const ISOsMerchantsPage = () => {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedISO, setExpandedISO] = useState(null);

  useEffect(() => { fetchMerchants(); }, []);

  const fetchMerchants = async () => {
    setLoading(true);
    const { data } = await supabase.from("merchants").select("*,isos(id,name,slug)").order("business_name");
    if (data) setMerchants(data);
    setLoading(false);
  };

  // Group merchants by ISO
  const isoGroups = merchants.reduce((acc, m) => {
    const isoId = m.isos?.id || "unknown";
    const isoName = m.isos?.name || "Unknown ISO";
    if (!acc[isoId]) acc[isoId] = { isoId, isoName, merchants: [] };
    acc[isoId].merchants.push(m);
    return acc;
  }, {});

  const isoList = Object.values(isoGroups).sort((a, b) => b.merchants.length - a.merchants.length);

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

          return (
            <Card key={isoId}
              style={{ borderLeft: `4px solid ${active > 0 ? "#1d4ed8" : "#d1d5db"}`, cursor: "pointer" }}
              bodyStyle={{ padding: "12px 16px" }}
              onClick={() => setExpandedISO(isExpanded ? null : isoId)}>

              {/* One-liner header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Text strong style={{ fontSize: 15 }}>{isoName}</Text>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ padding: "3px 10px", borderRadius: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#059669", fontSize: 12, fontWeight: 600 }}>
                      ✓ {active} Active
                    </div>
                    <div style={{ padding: "3px 10px", borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 12, fontWeight: 600 }}>
                      ✗ {inactive} Inactive
                    </div>
                    <div style={{ padding: "3px 10px", borderRadius: 14, background: "#f0f6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontSize: 12, fontWeight: 600 }}>
                      {isoMerchants.length} Total
                    </div>
                  </div>
                </div>
                <Text style={{ color: "var(--muted-color)", fontSize: 13 }}>
                  {isExpanded ? "▲ Hide" : "▼ Show merchants"}
                </Text>
              </div>

              {/* Expanded merchant list */}
              {isExpanded && (
                <div style={{ marginTop: 14, borderTop: "1px solid var(--line-color)", paddingTop: 14 }}
                  onClick={e => e.stopPropagation()}>
                  <Table
                    dataSource={isoMerchants}
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
