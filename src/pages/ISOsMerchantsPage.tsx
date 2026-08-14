// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, Tag, Typography, Space, Table, Button } from "antd";
import { supabase } from "../utils/supabase";
import dayjs from "dayjs";
const { Title, Text } = Typography;

const GATEWAY_ISO_NAMES = ["nmi", "authorize.net", "e-fitness today", "efitness today", "fraud deflect", "midmetrics"];

const fmtMoney = (n) => {
  if (!n && n !== 0) return "--";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Number(n).toFixed(0)}`;
};

const SectionHeader = ({ label, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0 12px" }}>
    <div style={{ height: 2, flex: 1, background: color, borderRadius: 2 }} />
    <span style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: 2, textTransform: "uppercase", whiteSpace: "nowrap" }}>
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
  const [expandedRows, setExpandedRows] = useState([]);
  const [isoFilters, setIsoFilters] = useState({});

  useEffect(() => { fetchAll(); }, []);

  const fetchAllPaginated = async (query) => {
    let all = [], from = 0;
    while (true) {
      const { data: batch } = await query.range(from, from + 999);
      if (!batch || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < 1000) break;
      from += 1000;
    }
    return all;
  };

  const fetchAll = async () => {
    setLoading(true);
    const [merchantData, residualData] = await Promise.all([
      fetchAllPaginated(supabase.from("merchants").select("*,isos(id,name,slug)").order("business_name")),
      fetchAllPaginated(supabase.from("residuals").select("mid, report_month, iso_id, gross_revenue, gross_volume, paydiversenet").order("report_month")),
    ]);
    if (merchantData) setMerchants(merchantData);
    if (residualData && residualData.length > 0) {
      const datesMap = {}, statsMap = {};
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

  const allRows = Object.values(isoGroups).map(({ isoId, isoName, merchants: ms }) => ({
    isoId,
    isoName,
    isGateway: GATEWAY_ISO_NAMES.includes(isoName.toLowerCase()),
    active: ms.filter(m => m.status === "active").length,
    inactive: ms.filter(m => m.status !== "active").length,
    total: ms.length,
    merchants: ms,
    volume: isoStats[isoId]?.volume || 0,
    residual: isoStats[isoId]?.residual || 0,
  }));

  const regularRows = allRows.filter(r => !r.isGateway);
  const gatewayRows = allRows.filter(r => r.isGateway);

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

  const buildIsoColumns = (showSorter = true) => [
    {
      title: "ISO Name",
      dataIndex: "isoName",
      key: "iso",
      sorter: showSorter ? (a, b) => a.isoName.localeCompare(b.isoName) : false,
      defaultSortOrder: "ascend",
      render: (name) => <Text strong style={{ fontSize: 14 }}>{name}</Text>,
    },
    {
      title: "Active",
      key: "active",
      width: 90,
      align: "center",
      sorter: showSorter ? (a, b) => a.active - b.active : false,
      render: (_, row) => <span style={{ color: "#059669", fontWeight: 700, fontSize: 14 }}>{row.active}</span>,
    },
    {
      title: "Inactive",
      key: "inactive",
      width: 90,
      align: "center",
      sorter: showSorter ? (a, b) => a.inactive - b.inactive : false,
      render: (_, row) => (
        <span style={{ color: row.inactive > 0 ? "#dc2626" : "var(--muted-color)", fontWeight: row.inactive > 0 ? 700 : 400, fontSize: 14 }}>
          {row.inactive}
        </span>
      ),
    },
    {
      title: "Total MIDs",
      key: "total",
      width: 100,
      align: "center",
      sorter: showSorter ? (a, b) => a.total - b.total : false,
      render: (_, row) => <span style={{ fontWeight: 600 }}>{row.total}</span>,
    },
    {
      title: "Volume",
      key: "volume",
      width: 120,
      align: "right",
      sorter: showSorter ? (a, b) => a.volume - b.volume : false,
      render: (_, row) => <Text style={{ color: "var(--muted-color)" }}>{fmtMoney(row.volume)}</Text>,
    },
    {
      title: "Net Residual",
      key: "residual",
      width: 130,
      align: "right",
      sorter: showSorter ? (a, b) => a.residual - b.residual : false,
      render: (_, row) => (
        <Text style={{ color: row.residual > 0 ? "#059669" : "#dc2626", fontWeight: 600 }}>
          {fmtMoney(row.residual)}
        </Text>
      ),
    },
  ];

  const expandableConfig = {
    expandedRowKeys: expandedRows,
    onExpandedRowsChange: (keys) => setExpandedRows(keys),
    expandedRowRender: (row) => {
      const filter = isoFilters[row.isoId] || null;
      const filtered = filter
        ? row.merchants.filter(m => filter === "active" ? m.status === "active" : m.status !== "active")
        : row.merchants;
      return (
        <div style={{ padding: "14px 16px", background: "#f8fafc", borderTop: "1px solid var(--line-color)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: "var(--muted-color)", marginRight: 4 }}>Filter:</Text>
            {[
              { label: `${row.active} Active`, key: "active", color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
              { label: `${row.inactive} Inactive`, key: "inactive", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
              { label: `${row.total} All`, key: null, color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
            ].map(({ label, key: k, color, bg, border }) => (
              <div
                key={label}
                onClick={() => setIsoFilters(prev => ({ ...prev, [row.isoId]: prev[row.isoId] === k ? null : k }))}
                style={{
                  padding: "3px 12px", borderRadius: 14,
                  background: filter === k ? color : bg,
                  border: `2px solid ${filter === k ? color : border}`,
                  color: filter === k ? "#fff" : color,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.15s",
                  transform: filter === k ? "translateY(-1px)" : "none",
                }}
              >
                {label}
              </div>
            ))}
            {filter && (
              <Button size="small" onClick={() => setIsoFilters(prev => ({ ...prev, [row.isoId]: null }))} style={{ marginLeft: "auto", fontSize: 11, borderRadius: 12 }}>
                Clear
              </Button>
            )}
          </div>
          <Table
            dataSource={filtered}
            columns={merchantColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20, showTotal: t => `${t} merchants` }}
            scroll={{ x: 800 }}
          />
        </div>
      );
    },
    expandRowByClick: true,
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><Text style={{ color: "var(--muted-color)" }}>Loading...</Text></div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>ISOs -- Merchant Overview</Title>
        <Text style={{ color: "var(--muted-color)", fontSize: 13 }}>
          {allRows.length} ISOs -- {merchants.length} merchants -- click any row to expand
        </Text>
      </div>

      {/* ISOs section */}
      <Card bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={regularRows}
          columns={buildIsoColumns(true)}
          rowKey="isoId"
          size="middle"
          pagination={false}
          scroll={{ x: 700 }}
          expandable={expandableConfig}
          onRow={() => ({ style: { cursor: "pointer" } })}
        />
      </Card>

      {/* Gateway section */}
      {gatewayRows.length > 0 && (
        <>
          <SectionHeader label="Gateway" color="#7c3aed" />
          <Card bodyStyle={{ padding: 0 }}>
            <Table
              dataSource={gatewayRows}
              columns={buildIsoColumns(true)}
              rowKey="isoId"
              size="middle"
              pagination={false}
              scroll={{ x: 700 }}
              expandable={expandableConfig}
              onRow={() => ({ style: { cursor: "pointer" } })}
            />
          </Card>
        </>
      )}
    </div>
  );
};
export default ISOsMerchantsPage;
