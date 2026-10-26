// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Card, Select, DatePicker, Table, Tag, Typography, Button, Modal, Input, Space, Empty, Statistic, Popconfirm, Tooltip, message } from "antd";
import { LeftOutlined, RightOutlined, FileTextOutlined, EditOutlined, CheckOutlined, CheckCircleFilled, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { supabase } from "../utils/supabase";
import { getUserFromLocalStorage } from "../utils/getUser";
const { Title, Text } = Typography;

const STATUSES = ["Open", "In Progress", "Resolved"];
const STATUS_COLOR = { "Open": "blue", "In Progress": "gold", "Resolved": "green" };
const fmt = (n) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const monthOptions = () => {
  const out = [];
  let d = dayjs().startOf("month");
  const start = dayjs("2026-01-01");
  while (!d.isBefore(start)) { out.push({ value: d.format("YYYY-MM-01"), label: d.format("MMMM YYYY") }); d = d.subtract(1, "month"); }
  return out;
};

const SummaryUpdatesPage = () => {
  const user = getUserFromLocalStorage();
  const canEdit = user?.role === "admin";
  const LATEST_MONTH = dayjs().subtract(2, "month").format("YYYY-MM-01");
  const [month, setMonth] = useState(LATEST_MONTH);
  const [isos, setIsos] = useState([]);
  const [residuals, setResiduals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [lastChanged, setLastChanged] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editIso, setEditIso] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [noteStatus, setNoteStatus] = useState("Open");
  const [saving, setSaving] = useState(false);
  const [inlineIso, setInlineIso] = useState(null);
  const [inlineText, setInlineText] = useState("");

  const load = async () => {
    setLoading(true);
    const [i, p, u] = await Promise.all([
      supabase.from("isos").select("id,name,status").order("name"),
      supabase.from("iso_payments").select("iso_id,expected_amount,received_amount,updated_at").eq("report_month", month),
      supabase.from("iso_updates").select("*").eq("report_month", month).order("created_at", { ascending: false }),
    ]);
    // residuals can exceed the 1000-row API cap, so page through them
    let res = [], from = 0;
    while (true) {
      const { data } = await supabase.from("residuals").select("iso_id,paydiversenet,created_at").eq("report_month", month).range(from, from + 999);
      if (!data) break;
      res = res.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    const [lp, lu, lr] = await Promise.all([
      supabase.from("iso_payments").select("updated_at").order("updated_at", { ascending: false }).limit(1),
      supabase.from("iso_updates").select("created_at").order("created_at", { ascending: false }).limit(1),
      supabase.from("residuals").select("created_at").order("created_at", { ascending: false }).limit(1),
    ]);
    const stamps = [lp.data?.[0]?.updated_at, lu.data?.[0]?.created_at, lr.data?.[0]?.created_at].filter(Boolean).sort();
    setLastChanged(stamps.length ? dayjs(stamps[stamps.length - 1]).format("MMM D, YYYY h:mm A") : null);
    setIsos(i.data || []);
    setPayments(p.data || []);
    setResiduals(res);
    if (u.error) { setSetupNeeded(true); setUpdates([]); } else { setSetupNeeded(false); setUpdates(u.data || []); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [month]);

  // Same expected / received / status logic as the Payments page
  const rows = useMemo(() => {
    const resMap = {};
    const resFirst = {};
    residuals.forEach(r => { resMap[r.iso_id] = (resMap[r.iso_id] || 0) + (Number(r.paydiversenet) || 0); if (!resFirst[r.iso_id] || r.created_at < resFirst[r.iso_id]) resFirst[r.iso_id] = r.created_at; });
    const payMap = {};
    payments.forEach(p => { payMap[p.iso_id] = p; });
    const upMap = {};
    updates.forEach(u => { (upMap[u.iso_id] = upMap[u.iso_id] || []).push(u); });
    const hasVal = (id) => residuals.some(r => r.iso_id === id && Math.abs(Number(r.paydiversenet) || 0) > 0.005) || payments.some(p => p.iso_id === id && ((Number(p.expected_amount) || 0) !== 0 || (Number(p.received_amount) || 0) !== 0));
    // Archived (inactive) ISOs only appear in months where they have values
    return isos.filter(iso => iso.status === "active" || hasVal(iso.id)).map(iso => {
      const p = payMap[iso.id];
      const expected = iso.id in resMap ? resMap[iso.id] : (p?.expected_amount ?? null);
      const received = p?.received_amount ?? null;
      let status;
      if (received == null) status = expected == null ? "no_report" : "pending";
      else if (expected == null) status = "received";
      else { const d = received - expected; status = Math.abs(d) < 0.01 ? "paid" : d < 0 ? "short_paid" : "overpaid"; }
      const history = upMap[iso.id] || [];
      const latest = history[0] || null;
      const reportIn = expected != null;
      // An ISO whose first note was logged before its report was uploaded stays in the "no reports yet" list (with a green check) until closed
      const oldest = history.length ? history[history.length - 1] : null;
      const fromNoReport = !!oldest && reportIn && (!resFirst[iso.id] || oldest.created_at < resFirst[iso.id]);
      return { isoId: iso.id, name: iso.name, expected, received, status, history, latest, reportIn, fromNoReport, closed: latest?.status === "Resolved" };
    });
  }, [isos, residuals, payments, updates]);

  // Rows stay listed until closed; expected / received / status update by themselves as reports and payments arrive
  const noReport = rows.filter(r => !r.closed && (r.status === "no_report" || r.fromNoReport));
  const noReportIds = new Set(noReport.map(r => r.isoId));
  const pending = rows.filter(r => !r.closed && !noReportIds.has(r.isoId) && (((r.status === "pending" && r.expected > 0.005) || r.status === "short_paid") || (r.history.length && r.expected != null && r.received != null)))
    .map(r => ({ ...r, owed: r.status === "short_paid" ? r.expected - r.received : (r.status === "pending" ? r.expected : 0) }));
  const inLists = new Set([...pending, ...noReport].map(r => r.isoId));
  const resolved = rows.filter(r => r.history.length && !inLists.has(r.isoId));
  const totalPending = pending.reduce((s, r) => s + r.owed, 0);
  const pendingCount = pending.filter(r => r.owed > 0.005).length;
  const noReportCount = noReport.filter(r => !r.reportIn).length;

  const openEdit = (r) => { setEditIso(r); setNoteText(""); setNoteStatus(r.latest?.status || "Open"); };
  const saveNote = async () => {
    if (!noteText.trim()) return message.warning("Please enter a note");
    setSaving(true);
    const { error } = await supabase.from("iso_updates").insert({ iso_id: editIso.isoId, report_month: month, note: noteText.trim(), status: noteStatus, author: user?.name || user?.email || null });
    setSaving(false);
    if (error) return message.error("Could not save: " + error.message);
    setEditIso(null);
    load();
  };

  const closeItem = async (r) => {
    const { error } = await supabase.from("iso_updates").insert({ iso_id: r.isoId, report_month: month, note: "Closed", status: "Resolved", author: user?.name || user?.email || null });
    if (error) return message.error("Could not close: " + error.message);
    load();
  };
  const closeBtn = (r) => (
    <Popconfirm title={"Close " + r.name + "?"} okText="Close" onConfirm={() => closeItem(r)}>
      <Tooltip title="Close this item"><Button size="small" icon={<CheckOutlined />} /></Tooltip>
    </Popconfirm>
  );
  const green = { color: "#16a34a" };
  const reportStatus = (r) => r.reportIn ? <span style={green}><CheckCircleFilled /> Report uploaded</span> : <span style={{ color: "#d97706" }}><ClockCircleOutlined /> Waiting</span>;
  const payStatus = (r) => {
    if (r.status === "paid") return <span style={green}><CheckCircleFilled /> Paid</span>;
    if (r.status === "overpaid") return <span style={green}><CheckCircleFilled /> Paid (over)</span>;
    if (r.status === "received") return <span style={green}><CheckCircleFilled /> Received</span>;
    if (r.status === "short_paid") return <Tag color="red" style={{ margin: 0 }}>Short paid</Tag>;
    return <span style={{ color: "#d97706" }}><ClockCircleOutlined /> Pending</span>;
  };

  const saveInline = async (r) => {
    const t = inlineText.trim();
    if (!t) return message.warning("Please enter an update");
    if (r.latest && t === (r.latest.note || "").trim()) { setInlineIso(null); return; }
    setSaving(true);
    // Edit the existing update in place; only create a new entry when the ISO has none yet
    const { error } = r.latest
      ? await supabase.from("iso_updates").update({ note: t }).eq("id", r.latest.id)
      : await supabase.from("iso_updates").insert({ iso_id: r.isoId, report_month: month, note: t, status: "Open", author: user?.name || user?.email || null });
    setSaving(false);
    if (error) return message.error("Could not save: " + error.message);
    setInlineIso(null);
    load();
  };

  const noteCell = (r) => {
    if (canEdit && !setupNeeded && inlineIso === r.isoId) {
      return (
        <div>
          <Input.TextArea autoFocus autoSize={{ minRows: 2, maxRows: 6 }} value={inlineText} onChange={e => setInlineText(e.target.value)} onKeyDown={e => { if (e.key === "Escape") setInlineIso(null); }} />
          <Space size={6} style={{ marginTop: 6 }}>
            <Button size="small" type="primary" loading={saving} onClick={() => saveInline(r)}>Save</Button>
            <Button size="small" onClick={() => setInlineIso(null)}>Cancel</Button>
          </Space>
        </div>
      );
    }
    const editable = canEdit && !setupNeeded;
    const startEdit = () => { setInlineIso(r.isoId); setInlineText(r.latest?.note || ""); };
    const body = r.latest ? (
      <div>
        <Tag color={STATUS_COLOR[r.latest.status] || "default"}>{r.latest.status}</Tag>
        <Text>{r.latest.note}</Text>
        <div><Text type="secondary" style={{ fontSize: 11 }}>{dayjs(r.latest.created_at).format("MMM D, YYYY")}{r.latest.author ? " - " + r.latest.author : ""}</Text></div>
      </div>
    ) : <Text type="secondary">{editable ? "Click to add an update" : "--"}</Text>;
    return editable ? <div onClick={startEdit} style={{ cursor: "text", minHeight: 22 }} title="Click to edit">{body}</div> : body;
  };

  const expandedRow = (r) => (
    <div style={{ padding: "4px 16px" }}>
      <Text type="secondary" style={{ fontSize: 12 }}>Update history</Text>
      {r.history.map(h => (
        <div key={h.id} style={{ marginTop: 6 }}>
          <Tag color={STATUS_COLOR[h.status] || "default"}>{h.status}</Tag>
          <Text>{h.note}</Text>
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{dayjs(h.created_at).format("MMM D, YYYY")}{h.author ? " - " + h.author : ""}</Text>
        </div>
      ))}
    </div>
  );
  const expandable = { expandedRowRender: expandedRow, rowExpandable: r => r.history.length > 1 };
  const editCol = canEdit && !setupNeeded ? [{ title: "", width: 90, render: (_, r) => <Space size={4}><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />{closeBtn(r)}</Space> }] : [];

  const pendingCols = [
    { title: "ISO", dataIndex: "name", width: 200, sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Commission Pending", dataIndex: "owed", width: 170, align: "right", sorter: (a, b) => a.owed - b.owed, render: (v, r) => <span><b>{fmt(v)}</b></span> },
    { title: "Expected", dataIndex: "expected", width: 120, align: "right", render: v => fmt(v) },
    { title: "Received", dataIndex: "received", width: 120, align: "right", render: v => v != null ? fmt(v) : "--" },
    { title: "Status", width: 150, render: (_, r) => payStatus(r) },
    { title: "Latest Update", render: (_, r) => noteCell(r) },
    ...editCol,
  ];
  const noReportCols = [
    { title: "ISO", dataIndex: "name", width: 200, sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Expected", dataIndex: "expected", width: 120, align: "right", render: v => v != null ? fmt(v) : "--" },
    { title: "Status", width: 170, render: (_, r) => reportStatus(r) },
    { title: "Latest Update", render: (_, r) => noteCell(r) },
    ...editCol,
  ];
  const resolvedCols = [
    { title: "ISO", dataIndex: "name", width: 200 },
    { title: "Latest Update", render: (_, r) => noteCell(r) },
  ];

  const monthLabel = dayjs(month).format("MMMM YYYY");

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}><FileTextOutlined /> Summary / Updates</Title>
          <Text type="secondary">{monthLabel} residual report status. Updates automatically as reports are imported and payments are logged.</Text>
          {lastChanged && <div><Text type="secondary" style={{ fontSize: 12 }}>Last updated: {lastChanged}</Text></div>}
        </div>
        <Space size={8} wrap>
          <Button icon={<LeftOutlined />} size="small" onClick={() => setMonth(dayjs(month).subtract(1, "month").startOf("month").format("YYYY-MM-DD"))} />
          <DatePicker picker="month" value={dayjs(month)} onChange={d => d && setMonth(d.startOf("month").format("YYYY-MM-DD"))} format="MMMM YYYY" allowClear={false} style={{ width: 160 }} />
          <Button icon={<RightOutlined />} size="small" onClick={() => setMonth(dayjs(month).add(1, "month").startOf("month").format("YYYY-MM-DD"))} />
          <Button size="small" onClick={() => setMonth(LATEST_MONTH)} style={{ color: "var(--primary-color)", fontSize: 12, fontWeight: 600 }}>Current Month</Button>
        </Space>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <Card size="small" style={{ minWidth: 200 }}><Statistic title="Total commission pending" value={fmt(totalPending)} /></Card>
        <Card size="small" style={{ minWidth: 200 }}><Statistic title="ISOs with pending payment" value={pendingCount} /></Card>
        <Card size="small" style={{ minWidth: 200 }}><Statistic title="ISOs with no report yet" value={noReportCount} /></Card>
      </div>

      <Card title="ISO with Pending Payment" style={{ marginBottom: 16 }} bodyStyle={{ padding: 12 }}>
        <Table rowKey="isoId" size="middle" loading={loading} columns={pendingCols} dataSource={pending} expandable={expandable} pagination={false}
          locale={{ emptyText: <Empty description={"No pending payments for " + monthLabel} /> }} />
      </Card>

      <Card title="ISO with No Reports Yet" style={{ marginBottom: 16 }} bodyStyle={{ padding: 12 }}>
        <Table rowKey="isoId" size="middle" loading={loading} columns={noReportCols} dataSource={noReport} expandable={expandable} pagination={false}
          locale={{ emptyText: <Empty description={"All reports received for " + monthLabel} /> }} />
      </Card>

      {resolved.length > 0 && (
        <Card title="Resolved this month" bodyStyle={{ padding: 12 }}>
          <Table rowKey="isoId" size="middle" columns={resolvedCols} dataSource={resolved} expandable={expandable} pagination={false} />
        </Card>
      )}

      <Modal title={editIso ? "Update - " + editIso.name : ""} open={!!editIso} onCancel={() => setEditIso(null)} onOk={saveNote} okText="Save update" confirmLoading={saving} destroyOnClose>
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Select value={noteStatus} onChange={setNoteStatus} style={{ width: 180 }} options={STATUSES.map(v => ({ value: v, label: v }))} />
          <Input.TextArea rows={4} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="e.g. Password reset requested, waiting on access code" />
          <Text type="secondary" style={{ fontSize: 12 }}>Each update is saved with today's date so the history shows progress. Marking it Resolved moves the ISO to "Resolved this month".</Text>
        </Space>
      </Modal>
    </div>
  );
};
export default SummaryUpdatesPage;
