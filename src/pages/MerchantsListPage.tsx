// @ts-nocheck
import { useEffect, useState, useRef } from "react";
import { Card, Table, Tag, Typography, Space, Input, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { supabase } from "../utils/supabase";
const { Title, Text } = Typography;

const MerchantsListPage = () => {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchInput = useRef(null);

  useEffect(() => { fetchMerchants(); }, []);

  const fetchMerchants = async () => {
    setLoading(true);
    const { data } = await supabase.from("merchants").select("*,isos(name,slug)").order("business_name");
    if (data) setMerchants(data);
    setLoading(false);
  };

  const getSearchProps = (dataIndex, label) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8, minWidth: 200 }}>
        <Input ref={searchInput} placeholder={`Search ${label}`} value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={confirm} style={{ marginBottom: 8, display: "block" }} />
        <Space>
          <Button type="primary" onClick={confirm} icon={<SearchOutlined />} size="small" style={{ width: 90 }}>Search</Button>
          <Button onClick={() => { clearFilters(); confirm(); }} size="small" style={{ width: 90 }}>Reset</Button>
        </Space>
      </div>
    ),
    filterIcon: filtered => <SearchOutlined style={{ color: filtered ? "var(--primary-color)" : undefined }} />,
    onFilter: (value, record) => String(record[dataIndex] || "").toLowerCase().includes(String(value).toLowerCase()),
    onFilterDropdownOpenChange: open => { if (open) setTimeout(() => searchInput.current?.select(), 100); },
  });

  const columns = [
    { title: "MID", dataIndex: "mid", key: "mid", width: 160, ...getSearchProps("mid", "MID") },
    { title: "Business Name", dataIndex: "business_name", key: "dba", ellipsis: true, ...getSearchProps("business_name", "Business Name") },
    { title: "ISO", key: "iso", width: 130,
      render: (_, r) => r.isos?.name || "—",
      filters: [...new Set(merchants.map(m => m.isos?.name).filter(Boolean))].sort().map(n => ({ text: n, value: n })),
      onFilter: (v, r) => r.isos?.name === v, filterSearch: true },
    { title: "Status", dataIndex: "status", key: "s", width: 100,
      filters: [{ text: "Active", value: "active" }, { text: "Inactive", value: "inactive" }],
      onFilter: (v, r) => r.status === v,
      render: v => <Tag color={v === "active" ? "green" : "default"}>{v ? v.charAt(0).toUpperCase() + v.slice(1) : "Unknown"}</Tag> },
    { title: "Notes", dataIndex: "notes", key: "n", ellipsis: true, ...getSearchProps("notes", "Notes"),
      render: v => <span style={{ color: "var(--muted-color)", fontSize: 11 }}>{v || "—"}</span> },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Merchants ({merchants.length})</Title>
      </div>
      <Card>
        <Table dataSource={merchants} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 50, showTotal: t => `${t} merchants` }} size="small" />
      </Card>
    </div>
  );
};
export default MerchantsListPage;
