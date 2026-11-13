// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, Table, Input, Button, Typography, Space, Modal, Form, message } from "antd";
import { ContactsOutlined, DownloadOutlined, EditOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { supabase } from "../utils/supabase";
import { getIsoSource } from "../utils/isoSources";
const { Title, Text } = Typography;

const tag = (notes, k) => ((new RegExp(k + ":([^|]*)")).exec(notes || "") || [])[1]?.trim() || "";
const emails = (v) => String(v || "").split(/[,;\s]+/).filter(x => x.includes("@"));
const mail = (v) => v ? <a href={`mailto:${v}`} style={{ fontSize: 12 }}>{v}</a> : <Text type="secondary">--</Text>;

const ISOContactsPage = () => {
  const [isos, setIsos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [contactMap, setContactMap] = useState({});
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("isos").select("id,name,email,notes").eq("status", "active").order("name");
    const { data: cs } = await supabase.from("iso_contacts").select("iso_id,name,email,phone,sort_order").order("sort_order");
    const m = {};
    (cs || []).forEach(c => { (m[c.iso_id] = m[c.iso_id] || []).push(c); });
    setContactMap(m);
    setIsos(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // One table row per contact line; an ISO with no lines still gets one empty row. First row of each ISO carries the rowSpan.
  const rows = isos.flatMap(i => {
    const source = tag(i.notes, "SOURCE") || getIsoSource(i.name).source;
    let lines = (contactMap[i.id] || []).map(c => ({ name: c.name || "", email: c.email || "", phone: c.phone || "" }));
    // Fallback until the ISO has contact lines: the single contact stored on the ISO itself
    if (!lines.length) {
      const e = emails(i.email);
      const n = Math.max(e.length, 1);
      lines = Array.from({ length: n }, (_, k) => ({ name: k === 0 ? tag(i.notes, "CONTACT") : "", email: e[k] || "", phone: k === 0 ? tag(i.notes, "PHONE") : "" }));
    }
    return lines.map((l, k) => ({ key: i.id + ":" + k, id: i.id, iso: i.name, source, ...l, notes: i.notes, lines, first: k === 0, span: lines.length }));
  }).filter(r => !q || [r.iso, ...r.lines.flatMap(l => [l.name, l.email, l.phone])].join(" ").toLowerCase().includes(q.toLowerCase()));

  const openEdit = (r) => { setEdit(r); form.setFieldsValue({ contacts: r.lines.length ? r.lines : [{ name: "", email: "", phone: "" }] }); };
  const save = async () => {
    const v = form.getFieldsValue();
    setSaving(true);
    try {
      const r = await fetch("/api/send-payment-reminder?action=iso-contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ iso_id: edit.id, contacts: v.contacts || [] }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { message.error("Could not save: " + (j.error || ("error " + r.status))); setSaving(false); return; }
    } catch (e) { message.error("Could not save: " + e.message); setSaving(false); return; }
    setSaving(false);
    message.success("Contacts updated");
    setEdit(null);
    load();
  };

  const exportCSV = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["ISO", "Source", "Contact", "Email", "Phone"].map(esc).join(",")].concat(rows.map(r => [r.iso, r.source, r.name, r.email, r.phone].map(esc).join(",")));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = "iso-contacts.csv";
    a.click();
  };

  const span = (r) => ({ rowSpan: r.first ? r.span : 0 });
  const cols = [
    { title: "ISO", dataIndex: "iso", sorter: (a, b) => a.iso.localeCompare(b.iso), onCell: span, render: v => <Text strong>{v}</Text> },
    { title: "Source", dataIndex: "source", width: 100, onCell: span, render: v => v || <Text type="secondary">--</Text> },
    { title: "Contact", dataIndex: "name", render: v => v || <Text type="secondary">--</Text> },
    { title: "Email", dataIndex: "email", render: mail },
    { title: "Phone", dataIndex: "phone", render: v => v ? <a href={`tel:${v.replace(/[^+\d]/g, "")}`} style={{ whiteSpace: "nowrap" }}>{v}</a> : <Text type="secondary">--</Text> },
    { title: "", key: "edit", width: 80, fixed: "right", onCell: span, render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button> },
  ];

  return (
    <Card>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}><ContactsOutlined /> ISO Contacts</Title>
        <Space>
          <Input.Search allowClear placeholder="Search ISO, contact, email, phone..." onChange={e => setQ(e.target.value)} style={{ width: 280 }} />
          <Button icon={<DownloadOutlined />} onClick={exportCSV}>Export CSV</Button>
        </Space>
      </Space>
      <Table size="small" loading={loading} columns={cols} dataSource={rows} pagination={false} scroll={{ x: 1000 }} sticky />
      <Modal open={!!edit} width={760} title={"Edit contacts - " + (edit?.iso || "")} onCancel={() => setEdit(null)} onOk={save} confirmLoading={saving} okText="Save">
        <Form form={form} layout="vertical">
          <Form.List name="contacts">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Space key={key} align="start" style={{ display: "flex", marginBottom: 8 }}>
                    <Form.Item name={[name, "name"]} style={{ marginBottom: 0 }}><Input placeholder="Contact name" style={{ width: 200 }} /></Form.Item>
                    <Form.Item name={[name, "email"]} style={{ marginBottom: 0 }}><Input placeholder="Email" style={{ width: 260 }} /></Form.Item>
                    <Form.Item name={[name, "phone"]} style={{ marginBottom: 0 }}><Input placeholder="Phone" style={{ width: 170 }} /></Form.Item>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ name: "", email: "", phone: "" })}>Add contact</Button>
              </>
            )}
          </Form.List>
          <div style={{ marginTop: 12 }}><Text type="secondary" style={{ fontSize: 12 }}>The first email is the primary one. On the Outreach tab you tick which of these emails a reminder goes to.</Text></div>
        </Form>
      </Modal>
    </Card>
  );
};
export default ISOContactsPage;
