// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Card, Select, Table, Tag, Typography, Button, Modal, Input, Space, Empty, Statistic, message } from "antd";
import { FileTextOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { supabase } from "../utils/supabase";
import { getUserFromLocalStorage } from "../utils/getUser";
const { Title, Text } = Typography;

const STATUSES = ["Open", "In Progress", "Resolved"];
const STATUS_COLOR = { "Open": "blue", "In Progress": "gold", "Resolved": "green" };
const fmt = (n) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SETUP_SQL = `create table if not exists public.iso_updates (
  id uuid primary key default gen_random_uuid(),
  iso_id uuid not null references public.isos(id) on delete cascade,
  report_month date not null,
  note text not null,
  status text not null default 'Open',
  author text,
  created_at timestamptz not null default now()
);
create index if not exists iso_updates_month_idx on public.iso_updates (report_month, iso_id);
alter table public.iso_updates enable row level security;
create policy "iso_updates_all" on public.iso_updates for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.iso_updates to anon, authenticated;`;

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
  const [month, setMonth] = useState(dayjs().subtract(2, "month").format("YYYY-MM-01"));
  const [isos, setIsos] = useState([]);
  const [residuals, setResiduals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editIso, setEditIso] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [noteStatus, setNoteStatus] = useState("Open");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [i, p, u] = await Promise.all([
      supabase.from("isos").select("id,name").eq("status", "active").order("name"),
      supabase.from("iso_payments").select("iso_id,expected_amount,received_amount,updated_at").eq("report_month", month),
      supabase.from("iso_updates").select("*").eq("report_month", month).order("created_at", { ascending: false }),
    ]);
    // residuals can exceed the 1000-row API cap, so page through them
    let res = [], from = 0;
    while (true) {
      const { data } = await supabase.from("residuals").select("iso_id,paydiversenet").eq("report_month", month).range(from, from + 999);
      if (!data) break;
      res = res.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
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
    residuals.forEach(r => { resMap[r.iso_id] = (resMap[r.iso_id] || 0) + (Number(r.paydiversenet) || 0); });
    const payMap = {};
    payments.forEach(p => { payMap[p.iso_id] = p; });
    const upMap = {};
    updates.forEach(u => { (upMap[u.iso_id] = upMap[u.iso_id] || []).push(u); });
    return isos.map(iso => {
      const p = payMap[iso.id];
      const expected = iso.id in resMap ? resMap[iso.id] : (p?.expected_amount ?? null);
      const received = p?.received_amount ?? null;
      let status;
      if (received == null) status = expected == null ? "no_report" : "pending";
      else if (expected == null) status = "received";
      else { const d = received - expected; status = Math.abs(d) < 0.01 ? "paid" : d < 0 ? "short_paid" : "overpaid"; }
      const history = upMap[iso.id] || [];
      return { isoId: iso.id, name: iso.name, expected, received, status, history, latest: history[0] || null };
    });
  }, [isos, residuals, payments, updates]);

  const pending = rows.filter(r => (r.status === "pending" && r.expected > 0.005) || r.status === "short_paid")
    .map(r => ({ ...r, owed: r.status === "short_paid" ? r.expected - r.received : r.expected }))
    .filter(r => r.latest?.status !== "Resolved");
  const noReport = rows.filter(r => r.status === "no_report" && r.latest?.status !== "Resolved");
  const inLists = new Set([...pending, ...noReport].map(r => r.isoId));
  const resolved = rows.filter(r => r.history.length && !inLists.has(r.isoId));
  const totalPending = pending.reduce((s, r) => s + r.owed, 0);

  const lastChanged = useMemo(() => {
    const stamps = [...updates.map(u => u.created_at), ...payments.map(p => p.updated_at)].filter(Boolean).sort();
    return stamps.length ? dayjs(stamps[stamps.length - 1]).format("MMM D, YYYY h:mm A") : null;
  }, [updates, payments]);

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

  const noteCell = (r) => r.latest ? (
    <div>
      <Tag color={STATUS_COLOR[r.latest.status] || "default"}>{r.latest.status}</Tag>
      <Text>{r.latest.note}</Text>
      <div><Text type="secondary" style={{ fontSize: 11 }}>{dayjs(r.latest.created_at).format("MMM D, YYYY")}{r.latest.author ? " - " + r.latest.author : ""}</Text></div>
    </div>
  ) : <Text type="secondary">--</Text>;

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
  const editCol = canEdit && !setupNeeded ? [{ title: "", width: 60, render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /> }] : [];

  const pendingCols = [
    { title: "ISO", dataIndex: "name", width: 200, sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Commission Pending", dataIndex: "owed", width: 170, align: "right", sorter: (a, b) => a.owed - b.owed, render: (v, r) => <span><b>{fmt(v)}</b>{r.status === "short_paid" ? <Tag color="red" style={{ marginLeft: 6 }}>short paid</Tag> : null}</span> },
    { title: "Expected", dataIndex: "expected", width: 120, align: "right", render: v => fmt(v) },
    { title: "Received", dataIndex: "received", width: 120, align: "right", render: v => v != null ? fmt(v) : "--" },
    { title: "Latest Update", render: (_, r) => noteCell(r) },
    ...editCol,
  ];
  const noReportCols = [
    { title: "ISO", dataIndex: "name", width: 200, sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Why / What is needed", render: (_, r) => noteCell(r) },
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
        <Select value={month} onChange={setMonth} style={{ width: 190 }} options={monthOptions()} />
      </div>

      {setupNeeded && canEdit && (
        <Card style={{ marginBottom: 16, borderColor: "#f59e0b" }}>
          <b>Notes are not set up yet.</b> Run this SQL once in Supabase to enable status notes. The lists below work without it.
          <pre style={{ marginTop: 8, fontSize: 11, whiteSpace: "pre-wrap" }}>{SETUP_SQL}</pre>
        </Card>
      )}

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <Card size="small" style={{ minWidth: 200 }}><Statistic title="Total commission pending" value={fmt(totalPending)} /></Card>
        <Card size="small" style={{ minWidth: 200 }}><Statistic title="ISOs with pending payment" value={pending.length} /></Card>
        <Card size="small" style={{ minWidth: 200 }}><Statistic title="ISOs with no report yet" value={noReport.length} /></Card>
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
