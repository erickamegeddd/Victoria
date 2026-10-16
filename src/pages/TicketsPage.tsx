// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Card, Input, Button, Typography, Select, Tag, Table, message, Modal, Radio, Space, Empty } from "antd";
import { PlusOutlined, ToolOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { supabase } from "../utils/supabase";
import { getUserFromLocalStorage } from "../utils/getUser";
const { Title, Text, Paragraph } = Typography;

const PAGES = ["Overview", "ISO Summary", "Revenue/MID", "Payments", "Insights", "Outreach", "Industry", "Users", "Adjustments", "Agents Data", "Logs", "Bank Mappings", "Ask Victoria", "Other"];
const STATUSES = ["Open", "In Progress", "Done", "Won't Do"];
const STATUS_COLOR = { "Open": "blue", "In Progress": "gold", "Done": "green", "Won't Do": "default" };
const PRIORITY_COLOR = { Low: "default", Medium: "orange", High: "red" };
const empty = { type: "Issue", page: undefined, priority: "Medium", title: "", description: "" };

const TicketsPage = () => {
  const user = getUserFromLocalStorage();
  const isAdmin = user?.role === "admin";
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [fStatus, setFStatus] = useState("All");
  const [fPage, setFPage] = useState("All");
  const [fType, setFType] = useState("All");
  const [detail, setDetail] = useState(null);
  const [reply, setReply] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });
    if (error) { setSetupNeeded(true); setTickets([]); }
    else { setSetupNeeded(false); setTickets(data || []); }
    setLoading(false);
  };

  const submit = async () => {
    if (!form.page) { message.warning("Please pick the page this ticket is about (or Other)"); return; }
    if (!form.title.trim()) { message.warning("Please add a short title"); return; }
    if (!form.description.trim()) { message.warning("Please describe the issue or request"); return; }
    setSaving(true);
    const { error } = await supabase.from("tickets").insert({
      type: form.type, page: form.page, priority: form.priority,
      title: form.title.trim(), description: form.description.trim(),
      submitted_by: user?.name || user?.email || "Unknown", status: "Open",
    });
    setSaving(false);
    if (error) { message.error("Could not save ticket: " + error.message); return; }
    message.success("Ticket submitted");
    setOpen(false); setForm(empty); load();
  };

  const updateTicket = async (id, patch) => {
    const { error } = await supabase.from("tickets").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { message.error("Update failed: " + error.message); return false; }
    await load(); return true;
  };

  const rows = useMemo(() => tickets.filter(t =>
    (fStatus === "All" || t.status === fStatus) && (fPage === "All" || t.page === fPage) && (fType === "All" || t.type === fType)
  ), [tickets, fStatus, fPage, fType]);

  const columns = [
    { title: "#", dataIndex: "ticket_no", width: 60, sorter: (a, b) => a.ticket_no - b.ticket_no },
    { title: "Type", dataIndex: "type", width: 120, render: v => <Tag color={v === "Issue" ? "red" : "purple"}>{v}</Tag> },
    { title: "Page", dataIndex: "page", width: 140 },
    { title: "Title", dataIndex: "title", render: (v, r) => <a onClick={() => { setDetail(r); setReply(r.response || ""); }}>{v}</a> },
    { title: "Priority", dataIndex: "priority", width: 100, render: v => <Tag color={PRIORITY_COLOR[v]}>{v}</Tag> },
    { title: "Status", dataIndex: "status", width: 120, render: v => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    { title: "Submitted by", dataIndex: "submitted_by", width: 150 },
    { title: "Created", dataIndex: "created_at", width: 120, render: v => dayjs(v).format("MMM D, YYYY"), sorter: (a, b) => a.created_at.localeCompare(b.created_at), defaultSortOrder: "descend" },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}><ToolOutlined /> Tickets</Title>
          <Text type="secondary">Report an issue or request an enhancement for Victoria.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>New Ticket</Button>
      </div>

      {setupNeeded && (
        <Card style={{ marginBottom: 16, borderColor: "#f59e0b" }}>
          <b>Tickets are not set up yet.</b> The tickets table has not been created in the database. Ask the administrator to run the tickets setup SQL once.
        </Card>
      )}

      <Card bodyStyle={{ padding: 16 }}>
        <Space wrap style={{ marginBottom: 12 }}>
          <Select value={fStatus} onChange={setFStatus} style={{ width: 150 }} options={["All", ...STATUSES].map(v => ({ value: v, label: v === "All" ? "All statuses" : v }))} />
          <Select value={fPage} onChange={setFPage} style={{ width: 170 }} options={["All", ...PAGES].map(v => ({ value: v, label: v === "All" ? "All pages" : v }))} />
          <Select value={fType} onChange={setFType} style={{ width: 160 }} options={["All", "Issue", "Enhancement"].map(v => ({ value: v, label: v === "All" ? "All types" : v }))} />
        </Space>
        <Table rowKey="id" size="middle" loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize: 15, showSizeChanger: false }}
          locale={{ emptyText: <Empty description="No tickets yet" /> }} />
      </Card>

      <Modal title="New Ticket" open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Submit" confirmLoading={saving} destroyOnClose>
        <Space direction="vertical" style={{ width: "100%" }} size={14}>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Type</div>
            <Radio.Group value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <Radio.Button value="Issue">Issue / Bug</Radio.Button>
              <Radio.Button value="Enhancement">Enhancement</Radio.Button>
            </Radio.Group>
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Which page is this about?</div>
            <Select placeholder="Select a page" style={{ width: "100%" }} value={form.page} onChange={v => setForm({ ...form, page: v })}
              options={PAGES.map(p => ({ value: p, label: p }))} />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Priority</div>
            <Radio.Group value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <Radio.Button value="Low">Low</Radio.Button>
              <Radio.Button value="Medium">Medium</Radio.Button>
              <Radio.Button value="High">High</Radio.Button>
            </Radio.Group>
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Title</div>
            <Input value={form.title} maxLength={140} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Short summary" />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Details</div>
            <Input.TextArea rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="What happened or what would you like? Include the ISO, month or merchant if it applies." />
          </div>
        </Space>
      </Modal>

      <Modal title={detail ? `#${detail.ticket_no} - ${detail.title}` : ""} open={!!detail} onCancel={() => setDetail(null)} footer={null} width={620} destroyOnClose>
        {detail && (
          <Space direction="vertical" style={{ width: "100%" }} size={10}>
            <Space wrap>
              <Tag color={detail.type === "Issue" ? "red" : "purple"}>{detail.type}</Tag>
              <Tag>{detail.page}</Tag>
              <Tag color={PRIORITY_COLOR[detail.priority]}>{detail.priority}</Tag>
              <Tag color={STATUS_COLOR[detail.status]}>{detail.status}</Tag>
            </Space>
            <Text type="secondary">Submitted by {detail.submitted_by} on {dayjs(detail.created_at).format("MMM D, YYYY h:mm A")}</Text>
            <Paragraph style={{ whiteSpace: "pre-wrap", background: "#f9fafb", padding: 12, borderRadius: 8 }}>{detail.description}</Paragraph>
            {isAdmin ? (
              <>
                <div style={{ fontWeight: 600 }}>Status</div>
                <Select value={detail.status} style={{ width: 180 }} options={STATUSES.map(s => ({ value: s, label: s }))}
                  onChange={async v => { if (await updateTicket(detail.id, { status: v })) setDetail({ ...detail, status: v }); }} />
                <div style={{ fontWeight: 600 }}>Response / notes</div>
                <Input.TextArea rows={3} value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply to the requester" />
                <Button type="primary" onClick={async () => { if (await updateTicket(detail.id, { response: reply })) { message.success("Saved"); setDetail({ ...detail, response: reply }); } }}>Save response</Button>
              </>
            ) : (
              detail.response && (<><div style={{ fontWeight: 600 }}>Response</div><Paragraph style={{ whiteSpace: "pre-wrap" }}>{detail.response}</Paragraph></>)
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};
export default TicketsPage;
