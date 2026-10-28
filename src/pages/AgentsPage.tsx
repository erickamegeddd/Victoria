import { Button, Table, Tag, Tabs, DatePicker } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useLatestMonth } from "../utils/latestMonth";
import AgentsPayoutBarChart from "../components/charts/AgentsPayoutBarChart";
import AgentsCardsComponent from "../components/cards/AgentsCardsComponent";
import AgentsTrendTable from "../components/tables/AgentsTrendTable";
import AgentMidsSummaryTable from "../components/tables/AgentMidsSummaryTable";
import RevenuePerAgentTable from "../components/tables/RevenuePerAgentTable";
import agentClient from "../utils/agentAxios";
import formatCurrency from "../utils/formatCurrency";

const FIELD_LABELS: Record<string, string> = {
  paydiverse_residual: "PayDiverse Residual",
  total_residual: "Total Residual",
  agent_payout: "Agent Payout",
};

const adjColumns: any[] = [
  { title: "Agent", dataIndex: "agent_name", width: "160px", ellipsis: true },
  { title: "MID", dataIndex: "mid", width: "140px", render: (v: string) => v || <Tag>—</Tag> },
  {
    title: "Type", dataIndex: "field_name", width: "160px",
    render: (v: string) =>
      v === "new_row"
        ? <Tag color="green">New Row Added</Tag>
        : <Tag color="orange">{FIELD_LABELS[v] || v}</Tag>,
  },
  {
    title: "Original", dataIndex: "original_value", width: "120px",
    render: (v: any) => (v != null ? formatCurrency(v) : "—"),
  },
  { title: "Adjusted", dataIndex: "adjusted_value", width: "120px", render: formatCurrency },
  {
    title: "DBA / Notes", dataIndex: "notes", ellipsis: true,
    render: (v: string, record: any) => {
      if (!v) return "—";
      if (record.field_name === "new_row") {
        try { const p = JSON.parse(v); return p.dba || p.iso || "—"; } catch { return "—"; }
      }
      return v;
    },
  },
  {
    title: "Date", dataIndex: "created_at", width: "155px",
    render: (v: string) => dayjs(v).format("MMM DD, YYYY HH:mm"),
  },
];

const AgentsPage = () => {
  const LATEST_MONTH = useLatestMonth();
  const [date, setDate] = useState<string>(LATEST_MONTH);
  useEffect(() => { setDate(LATEST_MONTH); }, [LATEST_MONTH]);
  const [adjData, setAdjData] = useState<any[]>([]);
  const [adjLoading, setAdjLoading] = useState(false);

  const go = (months: number) => setDate(dayjs(date).add(months, "month").format("YYYY-MM-01"));

  useEffect(() => {
    const fetchAdj = async () => {
      setAdjLoading(true);
      try {
        const { data } = await agentClient.get("/api/agent-adjustments", {
          params: { date },
        });
        setAdjData(Array.isArray(data) ? data : []);
      } catch {
        setAdjData([]);
      } finally {
        setAdjLoading(false);
      }
    };
    fetchAdj();
  }, [date]);

  return (
    <Tabs
      defaultActiveKey="month"
      items={[
        {
          key: "month",
          label: "Monthly View",
          children: (
            <>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Button icon={<LeftOutlined />} onClick={() => go(-1)} />
        <DatePicker
          picker="month"
          value={dayjs(date)}
          onChange={(d) => d && setDate(d.startOf("month").format("YYYY-MM-DD"))}
          format="MMMM YYYY"
          allowClear={false}
          style={{ width: 170 }}
        />
        <Button icon={<RightOutlined />} onClick={() => go(1)} />
        <Button onClick={() => setDate(LATEST_MONTH)} size="middle">Current Month</Button>
      </div>

      <AgentsCardsComponent date={date} />

      <h2 style={{ marginTop: 24 }}>Revenue Per Agent</h2>
      <RevenuePerAgentTable date={date} />

      <h2 style={{ marginTop: 24 }}>Agents Total Payout</h2>
      <AgentsPayoutBarChart date={date} />

      <h2 style={{ marginTop: 32 }}>Adjustments Log</h2>
      <Table
        loading={adjLoading}
        dataSource={adjData}
        rowKey="id"
        size="small"
        columns={adjColumns}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: "No adjustments or custom rows recorded for this month." }}
        scroll={{x:900,y:'calc(100vh - 300px)'}}
        
      />
            </>
          ),
        },
        { key: "trend", label: "Monthly Trend", children: <AgentsTrendTable /> },
        { key: "mids", label: "MIDs Summary", children: <AgentMidsSummaryTable /> },
      ]}
    />
  );
};

export default AgentsPage;
