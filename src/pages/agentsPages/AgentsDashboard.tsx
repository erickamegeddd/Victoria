import { useEffect, useState } from "react";
import agentClient from "../../utils/agentAxios";
import { message, Table, Input, Row, Col, Button } from "antd";
import { LeftOutlined, RightOutlined, DollarOutlined } from "@ant-design/icons";
import type { TablePaginationConfig } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery } from "react-query";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import * as XLSX from "xlsx";
import { getUserFromLocalStorage } from "../../utils/getUser";
import formatCurrency from "../../utils/formatCurrency";
import { useLatestMonth } from "../../utils/latestMonth";
import { agentColumns } from "../../components/modals/ModalComponentColumns";


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

  const handleDownload = () => {
    // Use the currentTableData for download
    const formattedData = (
      currentTableData.length ? currentTableData : agentData
    )?.map((item: AgentsData) => ({
      ISO: item?.iso || "Not Provided",
      DBA: item?.dba || "Not Provided",
      MID: item?.mid || "Not Provided",
      "Agent Percentage": item?.agent_percentage || "0.00%",
      "Agent Payout": item?.agent_payout ? Number(item.agent_payout) : 0.0,
    }));

    // Create worksheet with the formatted data
    const worksheet = XLSX.utils.json_to_sheet(formattedData || [], {
      header: ["ISO", "DBA", "MID", "Agent Percentage", "Agent Payout"],
    });

    // Set column widths
    const columnWidths = [{ wch: 30 }, { wch: 30 }, { wch: 24 }, { wch: 18 }, { wch: 18 }];
    worksheet["!cols"] = columnWidths;

    // Create workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${user?.name}`);

    // Download the file
    XLSX.writeFile(workbook, `${user?.name}-${date}.xlsx`);
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
            <Button onClick={() => setDate(LATEST_MONTH)} size="middle">Current Month</Button>
          </div>
        </Col>
      </Row>
      <Row gutter={[16, 16]} align="middle" justify="space-between">
        <Col span={24} style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            className="download-btn"
            type="primary"
            onClick={handleDownload}
            disabled={!agentData || agentData.length === 0}
          >
            Download as XLSX <DownloadOutlined />
          </Button>
        </Col>
      </Row>
      <style>{`.ant-layout-content > div.agent-payout-card, div.agent-payout-card { background: linear-gradient(135deg, #047857 0%, #10b981 100%) !important; }`}</style>
      <div className="agent-payout-card" style={{ margin: "16px 0", display: "inline-flex", alignItems: "center", gap: 16, minWidth: 320, padding: "18px 26px", borderRadius: 14, background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", boxShadow: "0 6px 18px rgba(5,150,105,0.28)", color: "#fff" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
          <DollarOutlined />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", opacity: 0.9 }}>
            Your Payout - {dayjs(date as string).format("MMMM YYYY")}
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15 }}>{formatCurrency(calculateTotalPayout())}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{agentData?.length || 0} merchant account{(agentData?.length || 0) === 1 ? "" : "s"}</div>
        </div>
      </div>
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
    </>
  );
};

export default AgentsDashboard;
