import { useEffect, useState } from "react";
import agentClient from "../../utils/agentAxios";
import { message, Table, Input, Row, Col, Button } from "antd";
import { LeftOutlined, RightOutlined, DollarOutlined, ShopOutlined } from "@ant-design/icons";
import type { TablePaginationConfig } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery } from "react-query";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import { getUserFromLocalStorage } from "../../utils/getUser";
import formatCurrency from "../../utils/formatCurrency";
import { useLatestMonth } from "../../utils/latestMonth";
import { agentColumns } from "../../components/modals/ModalComponentColumns";
import { AgentsTrendRibbons } from "../../components/tables/AgentsTrendTable";


const AgentsDashboard = () => {
  const user = getUserFromLocalStorage();
  const [currentTableData, setCurrentTableData] = useState<AgentsData[]>([]);
  const LATEST_MONTH = useLatestMonth();
  const [date, setDate] = useState<string | string[]>(LATEST_MONTH);
  useEffect(() => { setDate(LATEST_MONTH); }, [LATEST_MONTH]);


  const fetchAgentData = async (
    date: string | string[],
    agent_name: string
  ) => {
    const { data } = await agentClient.get<AgentsData[]>("/api/each-agent-data", {
      params: { date, agent_name },
    });
    setCurrentTableData(data);
    return data;
  };

  const {
    data: agentData,
    error: agentError,
    isLoading: agentLoading,
  } = useQuery(
    ["fetchAgentData", date, user?.name],
    () => fetchAgentData(date, user?.name || ""),
    {
      enabled: !!date,
    }
  );

  const calculateTotalPayout = () => {
    return (
      agentData?.reduce((total, item) => total + Math.max(0, item.agent_payout || 0), 0) ||
      0
    );
  };

  // unique MID numbers (the same MID can appear under more than one row)
  const uniqueMidCount = () => new Set((agentData || []).map((i: any) => String(i?.mid || "").trim()).filter(Boolean)).size;

  const handleDownload = () => {
    const src = (currentTableData.length ? currentTableData : agentData) || [];
    const esc = (v: any) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["ISO", "DBA", "MID", "Agent Percentage", "Agent Payout"];
    const monthLabel = dayjs(date as string).format("MMMM YYYY");
    const lines = [
      ["Agent", user?.name || ""].map(esc).join(","),
      ["Month", monthLabel].map(esc).join(","),
      ["Your Payout", calculateTotalPayout().toFixed(2)].map(esc).join(","),
      ["Total MIDs", uniqueMidCount()].map(esc).join(","),
      "",
      header.join(","),
    ].concat(
      src.map((item: AgentsData) =>
        [
          item?.iso || "Not Provided",
          item?.dba || "Not Provided",
          item?.mid || "Not Provided",
          item?.agent_percentage || "0.00%",
          (Number(item?.agent_payout) || 0).toFixed(2),
        ].map(esc).join(",")
      )
    );
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${user?.name}-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success("File downloaded successfully");
  };

  if (agentError) message.error("Error Fetching data");
  return (
    <>
      <Row align="middle" justify="end">
        <Col
          xs={24}
          sm={24}
          md={12}
          lg={8}
          style={{ display: "flex", justifyContent: "flex-end" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button icon={<LeftOutlined />} onClick={() => setDate(dayjs(date as string).subtract(1, "month").format("YYYY-MM-01"))} />
            <span style={{ minWidth: 140, textAlign: "center", fontWeight: 600, fontSize: 15 }}>
              {dayjs(date as string).format("MMMM YYYY")}
            </span>
            <Button icon={<RightOutlined />} onClick={() => setDate(dayjs(date as string).add(1, "month").format("YYYY-MM-01"))} />
            <Button onClick={() => setDate(dayjs().startOf("month").format("YYYY-MM-01"))} size="middle">Current Month</Button>
          </div>
        </Col>
      </Row>
      <style>{`.ant-layout-content > div.agent-payout-card, div.agent-payout-card { background: linear-gradient(135deg, #047857 0%, #10b981 100%) !important; }`}</style>
      <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", flexWrap: "wrap", gap: 16, marginTop: 20 }}>
      <div className="agent-payout-card" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 16, minWidth: 320, padding: "18px 26px", borderRadius: 14, background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", boxShadow: "0 6px 18px rgba(5,150,105,0.28)", color: "#fff" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
          <DollarOutlined />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", opacity: 0.9 }}>
            Your Payout - {dayjs(date as string).format("MMMM YYYY")}
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15 }}>{formatCurrency(calculateTotalPayout())}</div>
        </div>
      </div>
      <div style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 16, minWidth: 220, padding: "18px 26px", borderRadius: 14, background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 4px 14px rgba(15,32,64,0.08)" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
          <ShopOutlined />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#64748b" }}>Total MIDs</div>
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15, color: "#0f172a" }}>{uniqueMidCount()}</div>
        </div>
      </div>
      <Button style={{ marginLeft: "auto" }} type="primary" size="large" icon={<DownloadOutlined />} onClick={handleDownload} disabled={!agentData || agentData.length === 0}>
        Download as CSV
      </Button>
      </div>
      <div style={{ height: 16 }} />
      <Table
        columns={agentColumns.filter((c: any) => ["iso", "dba", "mid", "agent_percentage", "agent_payout"].includes(c.dataIndex))}
        loading={agentLoading}
        rowHoverable={false}
        onChange={(
          _pagination: TablePaginationConfig,
          _filters: Record<string, FilterValue | null>,
          _sorter: SorterResult<AgentsData> | SorterResult<AgentsData>[],
          extra: { currentDataSource?: AgentsData[] }
        ) => {
          setCurrentTableData(
            extra.currentDataSource || (agentData as AgentsData[])
          ); // Handle optional chaining
        }}
        dataSource={agentData}
        rowKey={(r: any) => `${r.iso}|${r.mid}`}
        scroll={{ x: 768 }}
      />
      <div style={{ fontSize: 16, fontWeight: 700, margin: "28px 0 12px" }}>Monthly Trend</div>
      <AgentsTrendRibbons hideTotal endMonth={date as string} />
    </>
  );
};

export default AgentsDashboard;
