// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, Table, Input, Button, Typography, Space, Modal, Form, message } from "antd";
import { ContactsOutlined, DownloadOutlined, EditOutlined } from "@ant-design/icons";
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

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("isos").select("id,name,email,notes").eq("status", "active").order("name");
    setIsos(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const rows = isos.map(i => {
    const e = emails(i.email);
    return { key: i.id, id: i.id, iso: i.name, source: tag(i.notes, "SOURCE") || getIsoSource(i.name).source, name: tag(i.notes, "CONTACT"), email: e[0] || "", alt1: e[1] || "", alt2: e.slice(2).join(", "), phone: tag(i.notes, "PHONE"), notes: i.notes };
  }).filter(r => !q || [r.iso, r.name, r.email, r.alt1, r.alt2, r.phone].join(" ").toLowerCase().includes(q.toLowerCase()));

  const openEdit = (r) => { setEdit(r); form.setFieldsValue({ name: r.name, email: r.email, alt1: r.alt1, alt2: r.alt2, phone: r.phone }); };
  const save = async () => {
    const v = form.getFieldsValue();
    const list = [v.email, v.alt1, v.alt2].flatMap(x => emails(x)).filter((x, i, a) => a.findIndex(y => y.toLowerCase() === x.toLowerCase()) === i);
    const clean = (s) => String(s || "").replace(/\|/g, "/").trim();
    const rest = String(edit.notes || "").replace(/(PHONE|CONTACT):[^|]*\|?/g, "").replace(/^\|+/, "");
    let notes = rest && !rest.endsWith("|") ? rest + "|" : rest;
    if (clean(v.phone)) notes += "PHONE:" + clean(v.phone) + "|";
    if (clean(v.name)) notes += "CONTACT:" + clean(v.name) + "|";
    setSaving(true);
    const { error } = await supabase.from("isos").update({ email: list.join(", ") || null, notes: notes || null }).eq("id", edit.id);
    setSaving(false);
    if (error) { message.error("Could not save: " + error.message); return; }
    message.success("Contact updated");
    setEdit(null);
    load();
  };

  const exportCSV = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["ISO", "Source", "Contact", "Email", "Alt Email", "Alt Email 2", "Phone"].map(esc).join(",")].concat(rows.map(r => [r.iso, r.source, r.name, r.email, r.alt1, r.alt2, r.phone].map(esc).join(",")));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = "iso-contacts.csv";
    a.click();
  };

  const cols = [
    { title: "ISO", dataIndex: "iso", sorter: (a, b) => a.iso.localeCompare(b.iso), render: v => <Text strong>{v}</Text> },
    { title: "Source", dataIndex: "source", width: 100, render: v => v || <Text type="secondary">--</Text> },
    { title: "Contact", dataIndex: "name", render: v => v || <Text type="secondary">--</Text> },
    { title: "Email", dataIndex: "email", render: mail },
    { title: "Alt Email", dataIndex: "alt1", render: mail },
    { title: "Alt Email 2", dataIndex: "alt2", render: mail },
    { title: "Phone", dataIndex: "phone", render: v => v ? <a href={`tel:${v.replace(/[^+\d]/g, "")}`} style={{ whiteSpace: "nowrap" }}>{v}</a> : <Text type="secondary">--</Text> },
    { title: "", key: "edit", width: 80, fixed: "right", render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button> },
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
      <Modal open={!!edit} title={"Edit contact - " + (edit?.iso || "")} onCancel={() => setEdit(null)} onOk={save} confirmLoading={saving} okText="Save">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Contact name"><Input /></Form.Item>
          <Form.Item name="email" label="Email (primary)"><Input /></Form.Item>
          <Form.Item name="alt1" label="Alt email"><Input /></Form.Item>
          <Form.Item name="alt2" label="Alt email 2 (more than one: separate with commas)"><Input /></Form.Item>
          <Form.Item name="phone" label="Phone"><Input /></Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>These are the same emails and phone used on the Outreach tab, so changes show up there too.</Text>
        </Form>
      </Modal>
    </Card>
  );
};
export default ISOContactsPage;
