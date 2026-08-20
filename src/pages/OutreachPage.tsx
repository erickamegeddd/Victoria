// @ts-nocheck
import { useState, useEffect } from "react";
import { Table, Button, Popconfirm, Tag, Input, Tooltip, message, Modal } from "antd";
import { MailOutlined, EditOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";

const sbHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

function buildEmailBody(isoName: string, amount: number, month: string, dueDate: string) {
  const monthLabel = dayjs(month).format("MMMM YYYY");
  const amt = amount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Hi ${isoName} Team,

We hope this message finds you well. This is a friendly reminder that your residual payment for ${monthLabel} in the amount of $${amt} was due on ${dayjs(dueDate).format("MMMM D, YYYY")} and has not yet been received.

Please arrange payment at your earliest convenience. If you have already submitted payment, kindly reply to this email with the transaction reference so we can reconcile our records.

If you have any questions or concerns, please don't hesitate to reach out — we're happy to assist.

Thank you for your continued partnership.

Best regards,
PayDiverse Payments Team`;
}

const OutreachPage = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [editingEmail, setEditingEmail] = useState<Record<string, string>>({});
  const [savingEmail, setSavingEmail] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<any>(null);

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
      }).map(p => ({
        ...p,
        due_date: p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1],
        iso_name: p.isos?.name,
        iso_email: p.isos?.email || "",
        body: buildEmailBody(p.isos?.name, p.expected_amount, p.report_month, p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1])
      }));

      setRecords(overdue);
    } catch (e) { message.error("Failed to load overdue payments"); }
    finally { setLoading(false); }
  };

  const saveEmail = async (isoId: string, email: string) => {
    setSavingEmail(isoId);
    await fetch(`${SUPABASE_URL}/rest/v1/isos?id=eq.${isoId}`, {
      method: "PATCH",
      headers: { ...sbHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ email })
    });
    setSavingEmail(null);
    setEditingEmail(prev => { const n = {...prev}; delete n[isoId]; return n; });
    fetchOverdue();
    message.success("Email saved");
  };

  const sendEmail = async (record: any) => {
    const emailToUse = editingEmail[record.iso_id] ?? record.iso_email;
    if (!emailToUse) { message.error("Please add an email address for this ISO first"); return; }
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
        fetchOverdue();
      } else {
        message.error(result.error || "Failed to send email");
      }
    } catch (e) {
      message.error("Failed to send email");
    } finally {
      setSending(prev => { const n = {...prev}; delete n[record.id]; return n; });
    }
  };

  const columns = [
    {
      title: "ISO Name",
      dataIndex: "iso_name",
      width: 160,
      render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>
    },
    {
      title: "Month",
      dataIndex: "report_month",
      width: 120,
      render: (v: string) => dayjs(v).format("MMM YYYY")
    },
    {
      title: "Amount Due",
      dataIndex: "expected_amount",
      width: 120,
      render: (v: number) => <span style={{ color: "#dc2626", fontWeight: 600 }}>${(v||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span>
    },
    {
      title: "Due Date",
      dataIndex: "due_date",
      width: 110,
      render: (v: string) => <span style={{ color: "#f59e0b" }}>{dayjs(v).format("MMM D, YYYY")}</span>
    },
    {
      title: "ISO Email",
      dataIndex: "iso_email",
      width: 230,
      render: (_: any, record: any) => {
        const isEditing = editingEmail[record.iso_id] !== undefined;
        const val = isEditing ? editingEmail[record.iso_id] : record.iso_email;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Input
              size="small"
              placeholder="Add email..."
              value={val}
              onChange={e => setEditingEmail(prev => ({...prev, [record.iso_id]: e.target.value}))}
              style={{ flex: 1, fontSize: 12 }}
            />
            {isEditing && (
              <Button size="small" type="primary" loading={savingEmail === record.iso_id}
                onClick={() => saveEmail(record.iso_id, editingEmail[record.iso_id])}>
                Save
              </Button>
            )}
          </div>
        );
      }
    },
    {
      title: "Email Body",
      dataIndex: "body",
      render: (v: string, record: any) => (
        <Button size="small" icon={<MailOutlined />} onClick={() => setPreviewRecord(record)}>
          Preview template
        </Button>
      )
    },
    {
      title: "Status",
      dataIndex: "email_sent",
      width: 110,
      render: (sent: boolean, record: any) => sent
        ? <Tag icon={<CheckCircleOutlined />} color="success">Sent {record.email_sent_at ? dayjs(record.email_sent_at).format("MMM D") : ""}</Tag>
        : <Tag icon={<ClockCircleOutlined />} color="warning">Pending</Tag>
    },
    {
      title: "",
      width: 120,
      render: (_: any, record: any) => (
        <Popconfirm
          title="Send payment reminder?"
          description={`Send email to ${record.isos?.name}?`}
          onConfirm={() => sendEmail(record)}
          okText="Yes, Send"
          cancelText="Cancel"
          disabled={record.email_sent}
        >
          <Button
            type="primary"
            icon={<MailOutlined />}
            size="small"
            loading={sending[record.id]}
            disabled={record.email_sent || (!record.iso_email && !editingEmail[record.iso_id])}
            style={{ background: record.email_sent ? undefined : "#0f2040" }}
          >
            {record.email_sent ? "Sent" : "Send Now"}
          </Button>
        </Popconfirm>
      )
    }
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

      <Table
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 25, showSizeChanger: false }}
        scroll={{ x: 1100 }}
        locale={{ emptyText: "No past-due payments — great!" }}
      />

      <Modal
        open={!!previewRecord}
        title={`Email template — ${previewRecord?.iso_name} (${previewRecord?.report_month ? dayjs(previewRecord.report_month).format("MMM YYYY") : ""})`}
        onCancel={() => setPreviewRecord(null)}
        footer={[
          <Button key="close" onClick={() => setPreviewRecord(null)}>Close</Button>,
          <Popconfirm
            key="send"
            title="Send this reminder?"
            description={`Send to ${previewRecord?.iso_email || "this ISO"}?`}
            onConfirm={() => { sendEmail(previewRecord); setPreviewRecord(null); }}
            okText="Yes, Send Now"
          >
            <Button type="primary" icon={<MailOutlined />} style={{ background: "#0f2040" }}>
              Send Now
            </Button>
          </Popconfirm>
        ]}
        width={600}
      >
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, background: "#f9fafb", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" }}>
          {previewRecord?.body}
        </pre>
      </Modal>
    </>
  );
};

export default OutreachPage;
