// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, Tag, Typography, Table, Select, Input, Segmented, Row, Col, Statistic, Empty, Modal, Form, DatePicker, Switch, Tooltip, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { supabase } from "../utils/supabase";
import dayjs from "dayjs";
import { AGENT_MAP } from "../../api/_agentMap.js";
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

// Spreadsheet imports left some MIDs as "998300053298.0" or "9.98300053298E11"; show them as plain digits.
const normMid = (mid) => {
  const s = String(mid || "").trim();
  if (/^\d+\.0+$/.test(s)) return s.replace(/\.0+$/, "");
  if (/^\d(\.\d+)?e\+?\d+$/i.test(s)) { try { return BigInt(Math.round(Number(s))).toString(); } catch (e) { return s; } }
  return s;
};

// One row per MID: where a malformed copy ("123.0") sits next to the clean one, keep the clean one.
const dedupe = (list) => {
  const seen = {};
  list.forEach(m => {
    const k = normMid(m.mid) || m.id;
    if (!seen[k] || (seen[k].mid !== normMid(seen[k].mid) && m.mid === normMid(m.mid))) seen[k] = m;
  });
  return list.filter(m => seen[normMid(m.mid) || m.id] === m);
};

// MID -> agent name(s), from the same map that drives agent commissions.
const AGENTS_BY_MID = {};
Object.keys(AGENT_MAP).forEach(name => {
  AGENT_MAP[name].forEach(e => {
    const list = (AGENTS_BY_MID[e.mid] = AGENTS_BY_MID[e.mid] || []);
    if (list.indexOf(name) === -1) list.push(name);
  });
});

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
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    (async () => {
      const [isoData, mData] = await Promise.all([
        supabase.from("isos").select("id,name").order("name").then(r => r.data || []),
        fetchAllPaginated(() => supabase.from("merchants").select("id,mid,current_iso_id")),
      ]);
      const byIso = {};
      mData.forEach(m => { (byIso[m.current_iso_id] = byIso[m.current_iso_id] || []).push(m); });
      const c = {};
      Object.keys(byIso).forEach(k => { c[k] = dedupe(byIso[k]).length; });
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
      const clean = dedupe(mData).map(m => ({ ...m, mid: normMid(m.mid) }));
      setMerchants(clean);
      setMidDates(dates);
      setStatus("all");
      setSearch("");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isoId]);

  const isoName = (isos.find(i => i.id === isoId) || {}).name || "";
  const enriched = merchants.map(m => ({
    ...m,
    agentName: (AGENTS_BY_MID[m.mid] || []).join(", "),
    type: m.merchant_type === "gateway" ? "Gateway" : "MID",
  }));
  const active = merchants.filter(m => m.status === "active").length;
  const inactive = merchants.length - active;
  const q = search.trim().toLowerCase();
  const rows = enriched.filter(m =>
    (status === "all" || (status === "active" ? m.status === "active" : m.status !== "active")) &&
    (!q || (m.mid || "").toLowerCase().includes(q) || (m.business_name || "").toLowerCase().includes(q) || (m.agentName || "").toLowerCase().includes(q))
  );

  const openEdit = (r) => {
    setEditing(r);
  };

  // Entering a termination date on or before today switches the MID to inactive (can still be overridden).
  const onFormChange = (changed) => {
    if (changed.termination_date && !changed.termination_date.isAfter(dayjs(), "day")) form.setFieldsValue({ active: false });
  };

  const saveEdit = async () => {
    const v = form.getFieldsValue();
    const patch = {
      status: v.active ? "active" : "inactive",
      approval_date: v.approval_date ? v.approval_date.format("YYYY-MM-DD") : null,
      termination_date: v.termination_date ? v.termination_date.format("YYYY-MM-DD") : null,
      notes: (v.notes || "").trim() || null,
    };
    setSaving(true);
    const { data, error } = await supabase.from("merchants").update(patch).eq("id", editing.id).select("id");
    setSaving(false);
    if (error || !data || data.length === 0) {
      message.error(error ? "Save failed: " + error.message : "Save was blocked. The merchants edit permission has not been enabled in Supabase yet.");
      return;
    }
    setMerchants(list => list.map(m => m.id === editing.id ? { ...m, ...patch } : m));
    message.success("Saved " + (editing.business_name || editing.mid));
    setEditing(null);
  };

  const muted = <Text style={{ color: "var(--muted-color)" }}>--</Text>;
  const byText = (k) => (a, b) => (a[k] || "").localeCompare(b[k] || "");

  const columns = [
    { title: "MID", dataIndex: "mid", key: "mid", width: 150, sorter: byText("mid"), render: v => v || muted },
    { title: "ISO", key: "iso", width: 120, render: () => isoName },
    { title: "DBA", dataIndex: "business_name", key: "dba", width: 200, ellipsis: true, defaultSortOrder: "ascend", sorter: byText("business_name"), render: v => <Text strong>{v || "--"}</Text> },
    { title: "Corporation", key: "corp", width: 200, render: () => muted },
    { title: "Operating Partner", key: "op", width: 200, render: () => muted },
    { title: "Active", key: "active", width: 80,
      filters: [{ text: "Yes", value: true }, { text: "No", value: false }],
      onFilter: (v, r) => (r.status === "active") === v,
      render: (_, r) => r.status === "active" ? <Tag color="green">Yes</Tag> : <Tag color="error">No</Tag> },
    { title: "Agent", key: "agent", width: 150,
      sorter: (a, b) => (a.agentName || "").localeCompare(b.agentName || ""),
      render: (_, r) => r.agentName || muted },
    { title: "Type", key: "type", width: 90,
      filters: [{ text: "MID", value: "MID" }, { text: "Gateway", value: "Gateway" }],
      onFilter: (v, r) => r.type === v,
      render: (_, r) => <Tag color="blue" style={{ color: "var(--navy-color)" }}>{r.type}</Tag> },
    { title: "Approval Date", key: "start", width: 120,
      render: (_, r) => r.approval_date
        ? <Text style={{ color: "#059669", fontWeight: 600 }}>{dayjs(r.approval_date).format("YYYY-MM-DD")}</Text>
        : midDates[r.mid]?.start
          ? <Tooltip title="Not entered yet; showing the month of the first residual"><Text type="secondary" italic>{fmt(midDates[r.mid].start)}</Text></Tooltip>
          : muted },
    { title: "Termination Date", key: "end", width: 130,
      render: (_, r) => r.termination_date
        ? <Text style={{ color: "#dc2626", fontWeight: 600 }}>{dayjs(r.termination_date).format("YYYY-MM-DD")}</Text>
        : muted },
    { title: "Action", key: "action", width: 70, align: "center", fixed: "right",
      render: (_, r) => <Tooltip title="Edit"><EditOutlined style={{ fontSize: 18, color: "var(--primary-color)", cursor: "pointer" }} onClick={() => openEdit(r)} /></Tooltip> },
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
            <Input.Search allowClear placeholder="Search MID, DBA or agent" style={{ width: 300 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Table
            scroll={{ x: 1510 }}
            rowKey={r => r.id || r.mid}
            size="small"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 50, showSizeChanger: true, showTotal: t => `${t} merchants` }}
          />
        </>
      )}
      <Modal
        open={!!editing}
        title={editing ? "Edit " + (editing.business_name || editing.mid) : ""}
        okText="Save"
        confirmLoading={saving}
        onOk={saveEdit}
        onCancel={() => setEditing(null)}
        destroyOnClose
      >
        {editing && <Text type="secondary">MID {editing.mid} | {isoName}</Text>}
        {editing && <Form form={form} key={editing.id} layout="vertical" onValuesChange={onFormChange}
          initialValues={{
            active: editing.status === "active",
            approval_date: editing.approval_date ? dayjs(editing.approval_date) : null,
            termination_date: editing.termination_date ? dayjs(editing.termination_date) : null,
            notes: editing.notes || "",
          }} style={{ marginTop: 16 }}>
          <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="approval_date" label="Approval Date"><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="termination_date" label="Termination Date" extra="Entering a date on or before today marks the MID inactive. Clear it to remove the date."><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} placeholder="e.g. termination email received Oct 22" /></Form.Item>
        </Form>}
      </Modal>
    </div>
  );
};
export default ISOsMerchantsPage;
