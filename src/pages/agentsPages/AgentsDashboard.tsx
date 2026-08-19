import { useState } from "react";
import agentClient from "../../utils/agentAxios";
import { message, Table, Input, Row, Col, DatePicker, Button } from "antd";
import type { DatePickerProps, TablePaginationConfig } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery } from "react-query";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import * as XLSX from "xlsx";
import { getUserFromLocalStorage } from "../../utils/getUser";
import formatCurrency from "../../utils/formatCurrency";
import { agentColumns } from "../../components/modals/ModalComponentColumns";

const { Search } = Input;

const AgentsDashboard = () => {
  const user = getUserFromLocalStorage();
  const [currentTableData, setCurrentTableData] = useState<AgentsData[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [date, setDate] = useState<string | string[]>(
    dayjs().format("YYYY-MM-01")
  );

  const onChange: DatePickerProps["onChange"] = (dayjsObj) => {
    if (dayjsObj) setDate(dayjsObj.format("YYYY-MM-01"));
  };

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
      agentData?.reduce((total, item) => total + (item.agent_payout || 0), 0) ||
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
      Corporation: item?.corporation || "Not Provided",
      MID: item?.mid || "Not Provided",
      "Agent Percentage": item?.agent_percentage || "0.00%",
      "Agent Payout": item?.agent_payout ? Number(item.agent_payout) : 0.0,
      "Total Residual": item?.total_residual
        ? Number(item.total_residual)
        : 0.0,
      "PayDiverse Residual": item?.paydiverse_residual
        ? Number(item.paydiverse_residual)
        : 0.0,
    }));

    // Create worksheet with the formatted data
    const worksheet = XLSX.utils.json_to_sheet(formattedData || [], {
      header: [
        "ISO",
        "DBA",
        "Corporation",
        "MID",
        "Agent Percentage",
        "Agent Payout",
        "Total Residual",
        "PayDiverse Residual",
      ],
    });

    // Set column widths
    const columnWidths = [
      { wch: 30 }, // ISO column
      { wch: 30 }, // ISO column
      { wch: 30 }, // ISO column
      { wch: 30 }, // ISO column
      { wch: 20 }, // Total Residual column
      { wch: 20 }, // Paydiverse Residual column
      { wch: 20 }, // Paydiverse Residual column
      { wch: 20 }, // Paydiverse Residual column
    ];
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
      <h2>Total Payout Per Month</h2>
      <Row align="middle" justify="end">
        <Col
          xs={24}
          sm={24}
          md={12}
          lg={8}
          style={{ display: "flex", justifyContent: "flex-end" }}
        >
          <DatePicker
            onChange={onChange}
            picker="month"
            defaultValue={dayjs()}
          />
        </Col>
      </Row>
      <Row gutter={[16, 16]} align="middle" justify="space-between">
        <Col span={8}>
          <Search
            size="large"
            placeholder="Search"
            allowClear
            enterButton
            onSearch={(value) => setSearchText(value)}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col span={8} style={{ display: "flex", justifyContent: "flex-end" }}>
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
      <h2>Total Payout: {formatCurrency(calculateTotalPayout())}</h2>
      <Table
        columns={agentColumns}
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
        dataSource={agentData?.filter(
          (item: AgentsData) =>
            (item.iso || "").toLowerCase().includes(searchText.toLowerCase()) ||
            (item.dba || "").toLowerCase().includes(searchText.toLowerCase()) ||
            (item.mid || "").toLowerCase().includes(searchText.toLowerCase()) ||
            (item.corporation || "")
              .toLowerCase()
              .includes(searchText.toLowerCase())
        )}
        scroll={{ x: 768 }}
      />
    </>
  );
};

export default AgentsDashboard;
