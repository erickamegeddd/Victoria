import { DatePicker, Table, Tag } from "antd";
import type { DatePickerProps } from "antd";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import AgentsPayoutBarChart from "../components/charts/AgentsPayoutBarChart";
import AgentsCardsComponent from "../components/cards/AgentsCardsComponent";
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
  const [date, setDate] = useState<string | string[]>(
    dayjs().subtract(2, "months").format("YYYY-MM-01")
  );
  const [adjData, setAdjData] = useState<any[]>([]);
  const [adjLoading, setAdjLoading] = useState(false);

  const onChange: DatePickerProps["onChange"] = (_, dateString) => {
    setDate(`${dateString}-01`);
  };

  useEffect(() => {
    const fetchAdj = async () => {
      setAdjLoading(true);
      try {
        const { data } = await agentClient.get("/api/agent-adjustments", {
          params: { date: date as string },
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
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <DatePicker
          onChange={onChange}
          picker="month"
          defaultValue={dayjs().subtract(2, "months")}
          size="large"
          style={{ width: 220 }}
          format="MMMM YYYY"
        />
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
        scroll={{ x: 900 }}
        rowClassName={(record: any) => record.field_name === "new_row" ? "" : ""}
      />
    </>
  );
};

export default AgentsPage;
