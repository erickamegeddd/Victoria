// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, Tag, Typography, Table, Select, Input, Segmented, Row, Col, Statistic, Empty } from "antd";
import { supabase } from "../utils/supabase";
import dayjs from "dayjs";
const { Title, Text } = Typography;

const fetchAllPaginated = async (build) => {
  let all = [], from = 0;
  while (true) {
    const { data: batch } = await build().range(from, from + 999);
    if (!batch || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  return all;
};

const fmt = (d) => d ? dayjs(d).format("MMM YYYY") : "--";

const ISOsMerchantsPage = () => {
  const [isos, setIsos] = useState([]);
  const [counts, setCounts] = useState({});
  const [isoId, setIsoId] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [midDates, setMidDates] = useState({});
  const [loadingIsos, setLoadingIsos] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [isoData, mData] = await Promise.all([
        supabase.from("isos").select("id,name").order("name").then(r => r.data || []),
        fetchAllPaginated(() => supabase.from("merchants").select("current_iso_id")),
      ]);
      const c = {};
      mData.forEach(m => { c[m.current_iso_id] = (c[m.current_iso_id] || 0) + 1; });
      setIsos(isoData);
      setCounts(c);
      setLoadingIsos(false);
    })();
  }, []);

  useEffect(() => {
    if (!isoId) { setMerchants([]); setMidDates({}); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [mData, rData] = await Promise.all([
        fetchAllPaginated(() => supabase.from("merchants").select("*").eq("current_iso_id", isoId).order("business_name")),
        fetchAllPaginated(() => supabase.from("residuals").select("mid,report_month").eq("iso_id", isoId).order("report_month")),
      ]);
      if (cancelled) return;
      const dates = {};
      rData.forEach(r => {
        if (!r.mid || !r.report_month) return;
        if (!dates[r.mid]) dates[r.mid] = { start: r.report_month, end: r.report_month };
        if (r.report_month < dates[r.mid].start) dates[r.mid].start = r.report_month;
        if (r.report_month > dates[r.mid].end) dates[r.mid].end = r.report_month;
      });
      setMerchants(mData);
      setMidDates(dates);
      setStatus("all");
      setSearch("");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isoId]);

  const active = merchants.filter(m => m.status === "active").length;
  const inactive = merchants.length - active;
  const q = search.trim().toLowerCase();
  const rows = merchants.filter(m =>
    (status === "all" || (status === "active" ? m.status === "active" : m.status !== "active")) &&
    (!q || (m.mid || "").toLowerCase().includes(q) || (m.business_name || "").toLowerCase().includes(q))
  );

  const columns = [
    { title: "MID", dataIndex: "mid", key: "mid", width: 170, sorter: (a, b) => (a.mid || "").localeCompare(b.mid || ""), render: v => v || "--" },
    { title: "Business Name", dataIndex: "business_name", key: "name", ellipsis: true, defaultSortOrder: "ascend",
      sorter: (a, b) => (a.business_name || "").localeCompare(b.business_name || ""), render: v => <Text strong>{v}</Text> },
    { title: "Status", dataIndex: "status", key: "status", width: 110,
      render: v => <Tag color={v === "active" ? "green" : "default"} style={{ fontWeight: 600 }}>{v === "active" ? "Active" : "Inactive"}</Tag> },
    { title: "First Residual", key: "start", width: 130,
      render: (_, r) => midDates[r.mid]?.start ? <Text style={{ color: "#059669", fontWeight: 600 }}>{fmt(midDates[r.mid].start)}</Text> : "--" },
    { title: "Last Residual", key: "end", width: 130,
      render: (_, r) => midDates[r.mid]?.end ? <Text style={{ fontWeight: 600 }}>{fmt(midDates[r.mid].end)}</Text> : "--" },
    { title: "Notes", dataIndex: "notes", key: "notes", ellipsis: true,
      render: v => <span style={{ color: "var(--muted-color)", fontSize: 11 }}>{v || "--"}</span> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ margin: 0 }}>ISO &amp; Merchants</Title>
      <Text style={{ color: "var(--muted-color)" }}>Select an ISO to see the merchants under it.</Text>

      <div style={{ margin: "16px 0" }}>
        <Select
          showSearch
          allowClear
          size="large"
          style={{ width: 360 }}
          placeholder="Select an ISO"
          loading={loadingIsos}
          value={isoId}
          onChange={v => setIsoId(v || null)}
          optionFilterProp="label"
          options={isos.map(i => ({ value: i.id, label: `${i.name} (${counts[i.id] || 0})` }))}
        />
      </div>

      {!isoId ? (
        <Card><Empty description="Choose an ISO from the dropdown" /></Card>
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col><Card size="small"><Statistic title="Total MIDs" value={merchants.length} /></Card></Col>
            <Col><Card size="small"><Statistic title="Active" value={active} valueStyle={{ color: "#059669" }} /></Card></Col>
            <Col><Card size="small"><Statistic title="Inactive" value={inactive} valueStyle={{ color: inactive ? "#dc2626" : undefined }} /></Card></Col>
          </Row>
          <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <Segmented value={status} onChange={setStatus} options={[{ label: "All", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} />
            <Input.Search allowClear placeholder="Search MID or business name" style={{ width: 300 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Table
            rowKey={r => r.id || r.mid}
            size="small"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 50, showSizeChanger: true, showTotal: t => `${t} merchants` }}
          />
        </>
      )}
    </div>
  );
};
export default ISOsMerchantsPage;
