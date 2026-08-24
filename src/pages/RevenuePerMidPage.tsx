// @ts-nocheck
import { useEffect, useState, useRef } from "react";
import { Card, Table, Select, Typography, Space, Statistic, Row, Col, Tag, Input, Button, DatePicker } from "antd";
const { RangePicker } = DatePicker;
import { SearchOutlined, DollarOutlined } from "@ant-design/icons";
import { supabase } from "../utils/supabase";
import dayjs from "dayjs";
const { Title, Text } = Typography;
const { Option } = Select;
const fmt = (n) => n != null ? `$${Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}` : "—";

const RevenuePerMidPage = () => {
  const [data, setData] = useState([]);
  const [isos, setIsos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIso, setSelectedIso] = useState(undefined);
  const [selectedDateRange, setSelectedDateRange] = useState(null); // [startDate, endDate] or null for all
  const [filteredData, setFilteredData] = useState([]);
  const searchInput = useRef(null);

  useEffect(() => { fetchIsos(); }, []);
  useEffect(() => { fetchData(); }, [selectedIso, selectedDateRange]);

  const fetchIsos = async () => {
    const { data } = await supabase.from("isos").select("id,name").eq("status","active").order("name");
    if (data) setIsos(data);
  };

  const fetchAllRows = async (baseQuery) => {
    let all = [], from = 0;
    while (true) {
      const { data: batch } = await baseQuery.range(from, from + 999);
      if (!batch || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < 1000) break;
      from += 1000;
    }
    return all;
  };

  const fetchData = async () => {
    setLoading(true);
    let base = supabase.from("residuals").select("*,isos(id,name)").order("report_month", { ascending: true });
    if (selectedIso) base = base.eq("iso_id", selectedIso);
    if (selectedDateRange && selectedDateRange[0]) base = base.gte("report_month", selectedDateRange[0]);
    if (selectedDateRange && selectedDateRange[1]) base = base.lte("report_month", selectedDateRange[1]);
    const rows = await fetchAllRows(base);

    if (!rows) { setLoading(false); return; }

    // Aggregate by MID
    const map = {};
    rows.forEach(r => {
      const key = r.mid;
      if (!map[key]) map[key] = {
        mid: r.mid,
        business_name: r.business_name || r.mid,
        iso_name: r.isos?.name || "—",
        iso_id: r.iso_id,
        total_net: 0,
        total_volume: 0,
        total_gross: 0,
        months: new Set(),
        last_month: null,
      };
      map[key].total_net += (r.paydiversenet || 0);
      map[key].total_volume += (r.gross_volume || 0);
      map[key].total_gross += (r.gross_revenue || 0);
      if (r.report_month) {
        map[key].months.add(r.report_month);
        if (!map[key].last_month || r.report_month > map[key].last_month) map[key].last_month = r.report_month;
      }
    });

    const aggregated = Object.values(map).map(r => ({
      ...r,
      months: r.months.size,
    })).sort((a, b) => b.total_net - a.total_net);

    setData(aggregated);
    setFilteredData(aggregated);
    setLoading(false);
  };

  const totalNet = filteredData.reduce((s, r) => s + r.total_net, 0);
  const totalVol = filteredData.reduce((s, r) => s + r.total_volume, 0);

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
    { title: "#", key: "rank", width: 50, render: (_, __, i) => <Text style={{ color: "var(--muted-color)", fontWeight: 700 }}>{i + 1}</Text> },
    { title: "MID", dataIndex: "mid", key: "mid", width: 160, ...getSearchProps("mid", "MID") },
    { title: "Business Name", dataIndex: "business_name", key: "dba", ellipsis: true, ...getSearchProps("business_name", "Business Name"),
      render: v => <Text strong>{v}</Text> },
    { title: "ISO", dataIndex: "iso_name", key: "iso", width: 130,
      filters: [...new Set(data.map(r => r.iso_name).filter(Boolean))].sort().map(n => ({ text: n, value: n })),
      onFilter: (v, r) => r.iso_name === v,
      render: v => <Tag color="blue">{v}</Tag> },
    { title: "Total Net Income", dataIndex: "total_net", key: "net", align: "right", sorter: (a, b) => a.total_net - b.total_net, defaultSortOrder: "descend",
      render: v => <Text strong style={{ color: v > 0 ? "#059669" : "#dc2626" }}>{fmt(v)}</Text> },
    { title: "Total Volume", dataIndex: "total_volume", key: "vol", align: "right", sorter: (a, b) => a.total_volume - b.total_volume,
      render: v => fmt(v) },
    { title: "Gross Revenue", dataIndex: "total_gross", key: "gr", align: "right", sorter: (a, b) => a.total_gross - b.total_gross,
      render: v => fmt(v) },
    { title: "Months Active", dataIndex: "months", key: "mo", width: 120, align: "center", sorter: (a, b) => a.months - b.months,
      render: v => <Tag>{v} month{v !== 1 ? "s" : ""}</Tag> },
    { title: "Last Report", dataIndex: "last_month", key: "last", width: 110, align: "center", sorter: (a, b) => (a.last_month||"").localeCompare(b.last_month||""),
      render: v => v ? dayjs(v).format("MMM YYYY") : "—" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Revenue per MID</Title>
      </div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card><Statistic title="Total Net Income" value={totalNet} prefix="$" precision={2} valueStyle={{ color: "var(--primary-color)", fontWeight: 700 }} formatter={v => Number(v).toLocaleString("en-US",{minimumFractionDigits:2})}/></Card></Col>
        <Col span={8}><Card><Statistic title="Total Volume Processed" value={totalVol} prefix="$" precision={2} valueStyle={{ color: "#6b7a99", fontWeight: 700 }} formatter={v => Number(v).toLocaleString("en-US",{minimumFractionDigits:2})}/></Card></Col>
        <Col span={8}><Card><Statistic title="Unique MIDs" value={filteredData.length} valueStyle={{ color: "var(--primary-color)", fontWeight: 700 }}/></Card></Col>
      </Row>
      <Card style={{ marginBottom: 12 }}>
        <Space wrap>
          <Select placeholder="All ISOs" allowClear style={{ width: 200 }} onChange={v => setSelectedIso(v)}>
            {isos.map(iso => <Option key={iso.id} value={iso.id}>{iso.name}</Option>)}
          </Select>
          <RangePicker picker="month" placeholder={["From month", "To month"]} allowClear onChange={dates => setSelectedDateRange(dates ? [dates[0].startOf("month").format("YYYY-MM-DD"), dates[1].endOf("month").startOf("month").format("YYYY-MM-DD")] : null)} style={{ width: 260 }} />
          <Text style={{ color: "var(--muted-color)", fontSize: 12 }}>{filteredData.length} of {data.length} MIDs</Text>
        </Space>
      </Card>
      <Card>
        <Table dataSource={data} columns={columns} rowKey="mid" loading={loading}
          pagination={{ pageSize: 50, showTotal: t => `${t} MIDs` }}
          size="small" scroll={{x:900,y:'calc(100vh - 420px)'}} onChange={(_, __, ___, { currentDataSource }) => setFilteredData(currentDataSource)} />
      </Card>
    </div>
  );
};
export default RevenuePerMidPage;
