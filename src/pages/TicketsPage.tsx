// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Card, Input, Button, Typography, Select, Tag, Table, message, Modal, Radio, Space, Empty, Upload, Image } from "antd";
import { PlusOutlined, ToolOutlined, PictureOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { supabase } from "../utils/supabase";
import { getUserFromLocalStorage } from "../utils/getUser";
const { Title, Text, Paragraph } = Typography;

const PAGES = ["Overview", "ISO Payment Summary", "Revenue/MID", "Payments", "Insights", "Outreach", "Industry", "Users", "Adjustments", "Agents Data", "Logs", "Bank Mappings", "Ask Victoria", "Other"];
const STATUSES = ["Open", "In Progress", "Done", "Won't Do"];
const STATUS_COLOR = { "Open": "blue", "In Progress": "gold", "Done": "green", "Won't Do": "default" };
const PRIORITY_COLOR = { Low: "default", Medium: "orange", High: "red" };
const MAX_FILES = 5;
const MAX_IMG_MB = 5;
const MAX_VID_MB = 50;
const isVideoUrl = (u) => /\.(mp4|webm|mov)(\?|$)/i.test(u || "");
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
  const [files, setFiles] = useState([]);

  const addFiles = (list) => {
    const imgs = Array.from(list || []).filter(f => f && f.type && (f.type.startsWith("image/") || f.type.startsWith("video/")));
    if (!imgs.length) return;
    const ok = imgs.filter(f => f.size <= (f.type.startsWith("video/") ? MAX_VID_MB : MAX_IMG_MB) * 1024 * 1024);
    if (ok.length < imgs.length) message.warning(`Images must be under ${MAX_IMG_MB} MB and videos under ${MAX_VID_MB} MB`);
    setFiles(prev => {
      const next = [...prev, ...ok].slice(0, MAX_FILES);
      if (prev.length + ok.length > MAX_FILES) message.warning(`Up to ${MAX_FILES} files per ticket`);
      return next;
    });
  };
  const onPaste = (e) => {
    const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
    const imgs = items.filter(i => i.type && i.type.startsWith("image/")).map(i => i.getAsFile()).filter(Boolean);
    if (imgs.length) { e.preventDefault(); addFiles(imgs); }
  };

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
    const urls = [];
    for (const f of files) {
      const ext = (f.name && f.name.includes(".") ? f.name.split(".").pop() : (f.type.split("/")[1] || "png")).toLowerCase();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage.from("ticket-attachments").upload(path, f, { contentType: f.type });
      if (up.error) { setSaving(false); message.error("Screenshot upload failed: " + up.error.message); return; }
      urls.push(supabase.storage.from("ticket-attachments").getPublicUrl(path).data.publicUrl);
    }
    const { data: created, error } = await supabase.from("tickets").insert({
      ...(urls.length ? { attachments: urls } : {}),
      type: form.type, page: form.page, priority: form.priority,
      title: form.title.trim(), description: form.description.trim(),
      submitted_by: user?.name || user?.email || "Unknown", status: "Open",
    }).select().single();
    setSaving(false);
    if (error) { message.error("Could not save ticket: " + error.message); return; }
    try {
      fetch("/api/send-payment-reminder?action=ticket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: created.id }) }).catch(() => {});
    } catch (e) {}
    message.success("Ticket submitted");
    setOpen(false); setForm(empty); setFiles([]); load();
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
    { title: "", dataIndex: "attachments", width: 40, render: v => Array.isArray(v) && v.length ? <PictureOutlined title={`${v.length} attachment(s)`} /> : null },
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
            <Input.TextArea rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} onPaste={onPaste}
              placeholder="What happened or what would you like? Include the ISO, month or merchant if it applies." />
          </div>
          <div onPaste={onPaste}>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Screenshots / videos <Text type="secondary" style={{ fontWeight: 400 }}>(optional - paste, drag in, or browse; videos up to 50 MB)</Text></div>
            <Upload.Dragger multiple accept="image/*,video/mp4,video/webm,video/quicktime" showUploadList={false} beforeUpload={(f, list) => { if (f === list[0]) addFiles(list); return false; }} style={{ padding: 4 }}>
              <div style={{ padding: "6px 0", color: "#6b7280" }}><PictureOutlined /> Click, drag, or paste screenshots or a screen recording here</div>
            </Upload.Dragger>
            {files.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    {f.type.startsWith("video/")
                      ? <video src={URL.createObjectURL(f)} muted style={{ height: 70, borderRadius: 6, border: "1px solid #e5e7eb" }} />
                      : <img src={URL.createObjectURL(f)} alt="" style={{ height: 70, borderRadius: 6, border: "1px solid #e5e7eb" }} />}
                    <span onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ position: "absolute", top: -6, right: -6, background: "#dc2626", color: "#fff", borderRadius: "50%", width: 18, height: 18, lineHeight: "18px", textAlign: "center", cursor: "pointer", fontSize: 12 }}>x</span>
                  </div>
                ))}
              </div>
            )}
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
            {Array.isArray(detail.attachments) && detail.attachments.length > 0 && (
              <Image.PreviewGroup>
                <Space wrap>{detail.attachments.map((u, i) => isVideoUrl(u)
                  ? <video key={i} src={u} controls preload="metadata" style={{ maxWidth: 560, maxHeight: 320, borderRadius: 6, border: "1px solid #e5e7eb" }} />
                  : <Image key={i} src={u} height={90} style={{ borderRadius: 6, border: "1px solid #e5e7eb", objectFit: "cover" }} />)}</Space>
              </Image.PreviewGroup>
            )}
            {isAdmin ? (
              <>
                <div style={{ fontWeight: 600 }}>Status</div>
                <Select value={detail.status} style={{ width: 180 }} options={STATUSES.map(s => ({ value: s, label: s }))}
                  onChange={async v => {
                    if (await updateTicket(detail.id, { status: v })) {
                      let next = { ...detail, status: v };
                      if (v === "Done" && (detail.attachments || []).some(isVideoUrl)) {
                        try {
                          const r = await fetch("/api/send-payment-reminder?action=ticket-cleanup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: detail.id }) });
                          const j = await r.json();
                          if (j.ok && j.removed) { message.info("Video attachments removed to free up storage"); await load(); next = { ...next, attachments: (detail.attachments || []).filter(u => !isVideoUrl(u)) }; }
                        } catch (e) {}
                      }
                      setDetail(next);
                    }
                  }} />
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
