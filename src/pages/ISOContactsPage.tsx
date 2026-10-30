// @ts-nocheck
import { useState } from "react";
import { Card, Table, Input, Button, Typography, Space } from "antd";
import { ContactsOutlined, DownloadOutlined } from "@ant-design/icons";
import { ISO_CONTACTS } from "../data/isoContacts";
const { Title, Text } = Typography;

const mail = (v) => v ? <a href={`mailto:${v}`} style={{ fontSize: 12 }}>{v}</a> : <Text type="secondary">--</Text>;

const ISOContactsPage = () => {
  const [q, setQ] = useState("");
  const rows = ISO_CONTACTS.filter(r => !q || Object.values(r).join(" ").toLowerCase().includes(q.toLowerCase())).map((r, i) => ({ ...r, key: i }));
  const exportCSV = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["ISO", "Report", "Contact", "Email", "Alt Email", "Alt Email 2", "Phone"];
    const lines = [head.map(esc).join(",")].concat(rows.map(r => [r.iso, r.report, r.name, r.email, r.alt1, r.alt2, r.phone].map(esc).join(",")));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = "iso-contacts.csv";
    a.click();
  };
  const cols = [
    { title: "ISO", dataIndex: "iso", sorter: (a, b) => a.iso.localeCompare(b.iso), render: v => <Text strong>{v}</Text> },
    { title: "Report", dataIndex: "report", width: 110 },
    { title: "Contact", dataIndex: "name" },
    { title: "Email", dataIndex: "email", render: mail },
    { title: "Alt Email", dataIndex: "alt1", render: mail },
    { title: "Alt Email 2", dataIndex: "alt2", render: mail },
    { title: "Phone", dataIndex: "phone", render: v => v ? <a href={`tel:${v.replace(/[^+\d]/g, "")}`} style={{ whiteSpace: "nowrap" }}>{v}</a> : <Text type="secondary">--</Text> },
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
      <Table size="small" columns={cols} dataSource={rows} pagination={false} scroll={{ x: 1000 }} sticky />
    </Card>
  );
};
export default ISOContactsPage;
