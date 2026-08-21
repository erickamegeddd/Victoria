// @ts-nocheck
import { useState, useEffect } from "react";
import { Table, Button, Popconfirm, Tag, Input, message, Modal } from "antd";
import { MailOutlined, EditOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";
const sbHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

function buildEmailBody(isoName, amount, month, dueDate) {
  const monthLabel = dayjs(month).format("MMMM YYYY");
  const amt = (amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Hi ${isoName} Team,

We hope you're doing well!

We just wanted to send a quick follow-up regarding your ${monthLabel} residual payment of $${amt}, which was due on ${dayjs(dueDate).format("MMMM D, YYYY")}. It looks like we haven't received the payment yet, so we wanted to kindly check in.

When you have a chance, please arrange payment at your convenience. If payment has already been sent, no worries at all — simply reply to this email with the transaction reference so we can make sure our records are updated accordingly.

If you have any questions or concerns, please don't hesitate to reach out — we're happy to assist.

Thank you so much for your continued partnership.

Best regards,
PayDiverse Payments Team`;
}

const OutreachPage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState({});
  // Key by record.id (payment ID) — each row is independent
  const [editingEmail, setEditingEmail] = useState({});
  const [savingEmail, setSavingEmail] = useState(null);
  const [previewRecord, setPreviewRecord] = useState(null);
  const [editingBody, setEditingBody] = useState(null);

  useEffect(() => { fetchOverdue(); }, []);

  const fetchOverdue = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/iso_payments?select=id,iso_id,report_month,expected_amount,received_amount,notes,email_sent,email_sent_at,isos(id,name,email)&received_amount=is.null&order=report_month.asc&limit=300`,
        { headers: sbHeaders }
      );
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const today = dayjs().format("YYYY-MM-DD");
      const overdue = data.filter(p => {
        const m = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/);
        return m && m[1] < today && (p.expected_amount || 0) > 0;
      }).map(p => {
        const due = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1];
        return {
          ...p,
          due_date: due,
          iso_name: p.isos?.name,
          iso_email: p.isos?.email || "",
          body: buildEmailBody(p.isos?.name, p.expected_amount, p.report_month, due)
        };
      });
      setRecords(overdue);
    } catch (e) {
      message.error("Failed to load overdue payments");
    } finally {
      setLoading(false);
    }
  };

  const saveEmail = async (recordId, isoId, email) => {
    setSavingEmail(recordId);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/isos?id=eq.${isoId}`, {
        method: "PATCH",
        headers: { ...sbHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ email: email || null })
      });
      // Clear just this row's editing state
      setEditingEmail(prev => { const n = { ...prev }; delete n[recordId]; return n; });
      // Update local records so the email shows immediately without full reload
      setRecords(prev => prev.map(r =>
        r.iso_id === isoId ? { ...r, iso_email: email } : r
      ));
      message.success("Email saved");
    } catch (e) {
      message.error("Failed to save email");
    } finally {
      setSavingEmail(null);
    }
  };

  const cancelEdit = (recordId) => {
    setEditingEmail(prev => { const n = { ...prev }; delete n[recordId]; return n; });
  };

  const sendEmail = async (record) => {
    const emailToUse = editingEmail[record.id] ?? record.iso_email;
    if (!emailToUse) { message.error("Please add an email address first"); return; }
    setSending(prev => ({ ...prev, [record.id]: true }));
    try {
      const res = await fetch("/api/send-payment-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: record.id,
          isoName: record.iso_name,
          isoEmail: emailToUse,
          amount: record.expected_amount,
          month: record.report_month,
          dueDate: record.due_date,
          body: record.body
        })
      });
      const result = await res.json();
      if (result.ok) {
        message.success(`Reminder sent to ${emailToUse}`);
        setRecords(prev => prev.map(r =>
          r.id === record.id ? { ...r, email_sent: true, email_sent_at: new Date().toISOString() } : r
        ));
      } else {
        message.error(result.error || "Failed to send email");
      }
    } catch (e) {
      message.error("Failed to send email");
    } finally {
      setSending(prev => { const n = { ...prev }; delete n[record.id]; return n; });
    }
  };

  const columns = [
    {
      title: "ISO Name",
      dataIndex: "iso_name",
      width: 160,
      render: (v) => <span style={{ fontWeight: 600 }}>{v}</span>
    },
    {
      title: "Month",
      dataIndex: "report_month",
      width: 100,
      render: (v) => dayjs(v).format("MMM YYYY")
    },
    {
      title: "Amount Due",
      dataIndex: "expected_amount",
      width: 120,
      render: (v) => <span style={{ color: "#dc2626", fontWeight: 600 }}>${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
    },
    {
      title: "Due Date",
      dataIndex: "due_date",
      width: 110,
      render: (v) => <span style={{ color: "#f59e0b" }}>{dayjs(v).format("MMM D, YYYY")}</span>
    },
    {
      title: "ISO Email",
      dataIndex: "iso_email",
      width: 270,
      render: (_, record) => {
        const isEditing = editingEmail[record.id] !== undefined;
        const val = isEditing ? editingEmail[record.id] : (record.iso_email || "");
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Input
              size="small"
              placeholder="Add email..."
              value={val}
              onChange={e => setEditingEmail(prev => ({ ...prev, [record.id]: e.target.value }))}
              style={{ flex: 1, fontSize: 12 }}
            />
            {isEditing && (
              <>
                <Button size="small" type="primary" loading={savingEmail === record.id}
                  onClick={() => saveEmail(record.id, record.iso_id, editingEmail[record.id])}>
                  Save
                </Button>
                <Button size="small" onClick={() => cancelEdit(record.id)}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        );
      }
    },
    {
      title: "Email Body",
      width: 140,
      render: (_, record) => (
        <Button size="small" icon={<MailOutlined />} onClick={() => { setPreviewRecord(record); setEditingBody(null); }}>
          Preview email
        </Button>
      )
    },
    {
      title: "Status",
      dataIndex: "email_sent",
      width: 120,
      render: (sent, record) => sent
        ? <Tag icon={<CheckCircleOutlined />} color="success">Sent {record.email_sent_at ? dayjs(record.email_sent_at).format("MMM D") : ""}</Tag>
        : <Tag icon={<ClockCircleOutlined />} color="warning">Pending</Tag>
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Payment Outreach</h2>
          <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 13 }}>
            {records.length} past-due ISO payment{records.length !== 1 ? "s" : ""} — add emails and send reminders
          </p>
        </div>
        <Button onClick={fetchOverdue} size="small">Refresh</Button>
      </div>

      <Table scroll={{x:'max-content',y:'calc(100vh - 300px)'}}
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 25, showSizeChanger: false }}
        scroll={{ x: 1000 }}
        locale={{ emptyText: "No past-due payments — great!" }}
      />

      <Modal
        open={!!previewRecord}
        title={`Email preview — ${previewRecord?.iso_name} (${previewRecord?.report_month ? dayjs(previewRecord.report_month).format("MMM YYYY") : ""})`}
        onCancel={() => { setPreviewRecord(null); setEditingBody(null); }}
        footer={[
          <Button key="close" onClick={() => { setPreviewRecord(null); setEditingBody(null); }}>Close</Button>,
          <Button key="edit" icon={<EditOutlined />}
            onClick={() => setEditingBody(editingBody !== null ? null : (previewRecord?.body || ""))}>
            {editingBody !== null ? "Cancel edit" : "Edit email"}
          </Button>,
          <Popconfirm
            key="send"
            title="Send this reminder?"
            description={`Send to ${previewRecord?.iso_email || "this ISO"}?`}
            onConfirm={() => {
              const toSend = editingBody !== null ? { ...previewRecord, body: editingBody } : previewRecord;
              sendEmail(toSend);
              setPreviewRecord(null);
              setEditingBody(null);
            }}
            okText="Yes, Send Now"
            disabled={!previewRecord?.iso_email}
          >
            <Button type="primary" icon={<MailOutlined />} style={{ background: "#0f2040" }}
              disabled={!previewRecord?.iso_email}>
              Send Now
            </Button>
          </Popconfirm>
        ]}
        width={620}
      >
        {editingBody !== null ? (
          <Input.TextArea
            value={editingBody}
            onChange={e => setEditingBody(e.target.value)}
            autoSize={{ minRows: 12, maxRows: 20 }}
            style={{ fontFamily: "inherit", fontSize: 13 }}
          />
        ) : (
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, background: "#f9fafb", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb", maxHeight: 400, overflowY: "auto" }}>
            {previewRecord?.body}
          </pre>
        )}
      </Modal>
    </>
  );
};

export default OutreachPage;
