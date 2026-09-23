// @ts-nocheck
import { useState, useEffect } from "react";
import { Table, Button, Popconfirm, Tag, Input, message, Modal, Drawer, Spin } from "antd";
import { MailOutlined, EditOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";
const sbHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

function buildEmailBody(isoName, amount, month, dueDate) {
  const monthLabel = dayjs(month).format("MMMM YYYY");
  const amt = (amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Hi ${isoName},

This is an inquiry regarding your outstanding ${monthLabel} residual payment of $${amt}, which was due on ${dayjs(dueDate).format("MMMM D, YYYY")}.

Please communicate the status of this payment as soon as possible.

Thank you for your prompt attention to this matter.

Best,
Robert Sena

--
Robert Sena
PayDiverse Merchant Services
+1.516.776.9060 | rob@paydiverse.com
Telegram: RobertNYC
PayDiverse.com`;
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
  const [filteredOutreach, setFilteredOutreach] = useState([]);
  const [historyRecord, setHistoryRecord] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => { fetchOverdue(); }, []);

  const fetchEmailLogs = async (paymentId) => {
    setLogsLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/email_logs?payment_id=eq.${paymentId}&order=sent_at.desc&limit=50`,
        { headers: sbHeaders }
      );
      const data = await res.json();
      setEmailLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setEmailLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchOverdue = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/iso_payments?select=id,iso_id,report_month,expected_amount,received_amount,notes,email_sent,email_sent_at,isos(id,name,email)&received_amount=is.null&order=report_month.asc&limit=300`,
        { headers: sbHeaders }
      );
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const today = dayjs().format("YYVY-MM-DD");
      const overdue = data.filter(p => {
        const m = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/);
        return !!m;
      }).map(p => {
        const due = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1];
        const payment_status = due < today ? "overdue" : "due_soon";
        return { ...p, due_date: due, iso_name: p.isos?.name, iso_email: p.isos?.email || "", payment_status };
      }).sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));

      // Fetch residuals to compute correct expected amounts (expected_amount is now null)
      let enriched = overdue;
      if (overdue.length > 0) {
        const isoIds = [...new Set(overdue.map(p => p.iso_id))].join(",");
        const resResp = await fetch(
          `${SUPABASE_URL}/rest/v1/residuals?select=iso_id,report_month,paydiversenet&iso_id=in.(${isoIds})&limit=2000`,
          { headers: sbHeaders }
        );
        const residuals = await resResp.json();
        const resMap = {};
        if (Array.isArray(residuals)) {
          residuals.forEach(r => {
            const key = `${r.iso_id}|${r.report_month}`;
            resMap[key] = (resMap[key] || 0) + (r.paydiversenet || 0);
          });
        }
        enriched = overdue.map(p => {
          const computedAmount = Math.round((resMap[`${p.iso_id}|${p.report_month}`] || 0) * 100) / 100;
          return { ...p, computed_amount: computedAmount, body: buildEmailBody(p.iso_name, computedAmount, p.report_month, p.due_date) };
        });
      }
      setRecords(enriched.filter(p => (p.computed_amount || 0) > 0));
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
      // Reset email_sent since the address changed (prior sends were to the old address)
      await fetch(`${SUPABASE_URL}/rest/v1/iso_payments?id=eq.${recordId}`, {
        method: "PATCH",
        headers: { ...sbHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ email_sent: false, email_sent_at: null })
      });
      // Clear just this row's editing state
      setEditingEmail(prev => { const n = { ...prev }; delete n[recordId]; return n; });
      // Update local records — also reset email_sent status
      setRecords(prev => prev.map(r =>
        r.iso_id === isoId ? { ...r, iso_email: email, email_sent: false, email_sent_at: null } : r
      ));
      message.success("Email saved — status reset to Pending");
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
          amount: record.computed_amount,
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
      sorter: (a, b) => (a.iso_name || "").localeCompare(b.iso_name || ""),
      defaultSortOrder: "ascend",
      filters: [...new Set(records.map(r => r.iso_name).filter(Boolean))].sort().map(n => ({ text: n, value: n })),
      onFilter: (value, record) => record.iso_name === value,
      filterSearch: true,
      render: (v) => <span style={{ fontWeight: 600 }}>{v}</span>
    },
    {
      title: "Month",
      dataIndex: "report_month",
      width: 100,
      sorter: (a, b) => (a.report_month || "").localeCompare(b.report_month || ""),
      filters: [...new Set(records.map(r => r.report_month).filter(Boolean))].sort().map(m => ({ text: dayjs(m).format("MMM YYYY"), value: m })),
      onFilter: (value, record) => record.report_month === value,
      render: (v) => dayjs(v).format("MMM YYYY")
    },
    {
      title: "Amount Due",
      dataIndex: "computed_amount",
      width: 120,
      sorter: (a, b) => (a.computed_amount || 0) - (b.computed_amount || 0),
      render: (v) => <span style={{ color: "#dc2626", fontWeight: 600 }}>${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    },
    {
      title: "Due Date",
      dataIndex: "due_date",
      width: 110,
      sorter: (a, b) => (a.due_date || "").localeCompare(b.due_date || ""),
      render: (v) => <span style={{ color: "#f59e0b" }}>{dayjs(v).format("MMM D, YYYY")}</span>
    },
    {
      title: "Payment Status",
      dataIndex: "payment_status",
      width: 120,
      filters: [{ text: "Overdue", value: "overdue" }, { text: "Due Soon", value: "due_soon" }],
      onFilter: (value, record) => record.payment_status === value,
      render: (v) => v === "overdue"
        ? <Tag color="error" style={{ fontWeight: 600 }}>OVERDUE</Tag>
        : <Tag color="orange" style={{ fontWeight: 600 }}>DUE SOON</Tag>
    },
    {
      title: "ISO Contact Email",
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
      sorter: (a, b) => (a.email_sent ? 1 : 0) - (b.email_sent ? 1 : 0),
      filters: [{ text: "Sent", value: "sent" }, { text: "Pending", value: "pending" }],
      onFilter: (value, record) => value === "sent" ? !!record.email_sent : !record.email_sent,
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
          <p style={{ color: "#6f7280", margin: "4px 0 0", fontSize: 13 }}>
            {records.filter(r => r.payment_status === "overdue").length} overdue &nbsp;·&nbsp; {records.filter(r => r.payment_status === "due_soon").length} due soon — add emails and send reminders
          </p>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, padding: "2px 10px", fontSize: 12, color: "#15803d", fontWeight: 600 }}>
            <MailOutlined style={{ fontSize: 11 }} /> Sending from: residuals@elmpayments.com
          </span>
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
        scroll={{x:1000,y:'calc(100vh - 300px)'}}
        locale={{ emptyText: "No past-due payments — great!" }}
        onChange={(_,__,___,{currentDataSource})=>setFilteredOutreach(currentDataSource)}
        onRow={(record)=>({
          onClick:(e)=>{if(e.target.closest('button')||e.target.closest('input'))return;setHistoryRecord(record);fetchEmailLogs(record.id);},
          style:{cursor:'pointer'}
        })}
        summary={()=>{
          const src = filteredOutreach.length ? filteredOutreach : records;
          const total = src.reduce((s,r)=>s+(r.computed_amount||0),0);
          return (
            <Table.Summary fixed>
              <Table.Summary.Row style={{background:'#0f2040',height:48}}>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <span style={{color:'rgba(255,255,255,0.8)',fontWeight:700,fontSize:14,textTransform:'uppercase',letterSpacing:'1px'}}>Total — {src.length} rows</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span style={{color:'#fca5a5',fontWeight:900,fontSize:16}}>${total.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} colSpan={5} />
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />

      <Modal
        open={!!previewRecord}
        title={`Email preview └ ${previewRecord?.iso_name} (${previewRecord?.report_month ? dayjs(previewRecord.report_month).format("MMM YYYY") : ""})`}
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
      <Drawer
        open={!!historyRecord}
        title={`Email History — ${historyRecord?.iso_name || ""}`}
        onClose={(()=>{setHistoryRecord(null);setEmailLogs([]);}}
        width={780}
      >
        <p style={{color:"#6b7280",marginTop:0,fontSize:13}}>
          Emails sent for {historyRecord?.report_month ? dayjs(historyRecord.report_month).format("MMM YYYY") : ""} residuals
        </p>
        {logsLoading ? (
          <div style={{textAlign:"center",padding:40}}><Spin /></div>
        ) : emailLogs.length === 0 ? (
          <p style={{color:"#9ca3af",textAlign:"center",padding:40}}>No emails sent yet for this record.</p>
        ) : (
          <Table
            dataSource={emailLogs}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              {title:"Sent At",dataIndex:"sent_at",width:200,render:(v)=>dayjs(v).format("MMM D, YYYY h:mm A")},
              {title:"Sent To",dataIndex:"to_email",width:240,render:(v)=><span style={{fontSize:12}}>{v}</span>},
              {title:"Sent From",dataIndex:"from_email",width:240,render:(v)=><span style={{fontSize:12,color:"#6b7280"}}>{v}</span>},
            ]}
          />
        )}
      </Drawer>
    </>
  );
};

export default OutreachPage;
