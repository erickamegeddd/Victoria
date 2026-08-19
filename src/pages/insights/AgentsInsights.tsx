import { useState } from "react";
import {
  Button,
  Col,
  DatePicker,
  message,
  Row,
  Select,
  Table,
  TablePaginationConfig,
} from "antd";
import agentClient from "../../utils/agentAxios";
import { useQuery } from "react-query";
import Spinner from "../../components/general/Spinner";
import dayjs from "dayjs";
import formatCurrency from "../../utils/formatCurrency";
import { DownloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { FilterValue, SorterResult } from "antd/es/table/interface";

const { RangePicker } = DatePicker;
const currentYear = dayjs().year();
const lastYear = currentYear - 1;

interface AgentInsightsColumns {
  month: string;
  paydiverse_residual: number;
  total_residual: number;
  agent_payout: number;
}

const AgentInsights = () => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [currentTableData, setCurrentTableData] = useState<
    AgentInsightsColumns[]
  >([]);

  const fetchUniqueAgentsData = async () => {
    const { data } = await agentClient.get<any[]>("/api/unique-agent-name");
    return data;
  };

  const {
    data: uniqueAgents,
    isLoading: isUniqueAgentsLoading,
    error: uniqueAgentsError,
  } = useQuery("fetchUniqueAgentsData", fetchUniqueAgentsData);

  const fetchRevenuePerAgent = async () => {
    const { data } = await agentClient.get<AgentInsightsColumns[]>(
      `/api/agent-insights`,
      {
        params: {
          start_date: startDate,
          end_date: endDate,
          agent_name: selectedAgent,
        },
      }
    );
    setCurrentTableData(data);
    return data;
  };

  const {
    data: agentData,
    isLoading: agentsDataLoading,
    error: agentError,
  } = useQuery(
    ["fetchRevenuePerAgent", startDate, endDate, selectedAgent],
    fetchRevenuePerAgent,
    {
      enabled: !!startDate && !!endDate && !!selectedAgent,
    }
  );

  const handleDateChange = (_: any, dateString: [string, string]) => {
    const formattedStartDate = `${dateString[0]}-01`;
    const formattedEndDate = `${dateString[1]}-01`;
    setStartDate(formattedStartDate);
    setEndDate(formattedEndDate);
  };

  const handleAgentChange = (value: string) => {
    setSelectedAgent(value);
    setCurrentTableData([]);
  };

  const handleDownload = () => {
    const formattedData = currentTableData?.map((item: any) => ({
      Month: dayjs(item.month).format("MMMM, YYYY"),
      "Total Residual": formatCurrency(item.total_residual),
      "PayDiverse Residual": formatCurrency(item.paydiverse_residual),
      "Agent Payout": formatCurrency(item.agent_payout),
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData || [], {
      header: [
        "Month",
        "Total Residual",
        "PayDiverse Residual",
        "Agent Payout",
      ],
    });

    const columnWidths = [
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
    ];
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Insights Data");

    XLSX.writeFile(
      workbook,
      `Agent-Insights-${dayjs(startDate).format("MMMM-YYYY")}-to-${dayjs(
        endDate
      ).format("MMMM-YYYY")}.xlsx`
    );
    message.success("File downloaded successfully");
  };

  const totalPaydiverse = agentData?.reduce(
    (acc, curr) => acc + (curr.paydiverse_residual ?? 0),
    0
  );
  const totalResidual = agentData?.reduce(
    (acc, curr) => acc + (curr.total_residual ?? 0),
    0
  );
  const agentTotal = agentData?.reduce(
    (acc, curr) => acc + (curr.agent_payout ?? 0),
    0
  );

  const columns: any = [
    {
      key: 1,
      title: "Month",
      dataIndex: "month",
      width: "400px",
      render: (month: string) => {
        return dayjs(month).format("MMMM, YYYY");
      },
      sorter: (a: any, b: any) => {
        const dateA = dayjs(a.month);
        const dateB = dayjs(b.month);
        return dateA.isBefore(dateB) ? -1 : dateA.isAfter(dateB) ? 1 : 0;
      },
    },
    {
      key: 2,
      title: `Total Residual (${formatCurrency(totalResidual || 0)})`,
      dataIndex: "total_residual",
      width: "400px",
      sorter: (a: AgentInsightsColumns, b: AgentInsightsColumns) =>
        a.total_residual - b.total_residual,
      render: (total_residual: any) => formatCurrency(total_residual),
    },
    {
      key: 3,
      title: `PayDiverse Residual (${formatCurrency(totalPaydiverse || 0)})`,
      dataIndex: "paydiverse_residual",
      width: "400px",
      sorter: (a: AgentInsightsColumns, b: AgentInsightsColumns) =>
        a.paydiverse_residual - b.paydiverse_residual,
      render: (paydiverse_residual: any) => formatCurrency(paydiverse_residual),
    },
    {
      key: 4,
      title: `Agent Payout (${formatCurrency(agentTotal || 0)})`,
      dataIndex: "agent_payout",
      width: "400px",
      sorter: (a: AgentInsightsColumns, b: AgentInsightsColumns) =>
        a.agent_payout - b.agent_payout,
      render: (agent_payout: any) => formatCurrency(agent_payout),
    },
  ];

  if (agentError || uniqueAgentsError) message.error("Error fetching MID's");
  return (
    <>
      <Spinner isLoading={agentsDataLoading || isUniqueAgentsLoading} />
      <Row gutter={[16, 16]}>
        <Col xxl={6} xl={6} lg={6} md={24} sm={24} xs={24}>
          <Select
            size="large"
            placeholder="Select Agent Name"
            optionLabelProp="label"
            allowClear
            showSearch
            onChange={handleAgentChange}
            filterOption={(input: any, option: any) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            filterSort={(optionA, optionB) =>
              (optionA?.label ?? "")
                .toLowerCase()
                .localeCompare((optionB?.label ?? "").toLowerCase())
            }
            options={uniqueAgents?.map((agent: any) => ({
              value: agent.agent_name,
              label: agent.agent_name,
            }))}
          />
        </Col>
        <Col xxl={6} xl={6} lg={6} md={24} sm={24} xs={24}>
          <RangePicker
            picker="month"
            onChange={handleDateChange}
            value={
              startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : null
            }
            defaultPickerValue={[
              dayjs(`${lastYear}-01`, "YYYY-MM"),
              dayjs(`${lastYear}-12`, "YYYY-MM"),
            ]}
            allowClear
          />
        </Col>
      </Row>
      <Row justify="end" align="middle">
        <Col span={6} style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            className="download-btn"
            type="primary"
            onClick={handleDownload}
            disabled={
              !agentData ||
              agentData.length === 0 ||
              currentTableData.length === 0
            }
          >
            Download as XLSX <DownloadOutlined />
          </Button>
        </Col>
      </Row>
      <Table
        loading={agentsDataLoading || isUniqueAgentsLoading}
        columns={columns}
        onChange={(
          _pagination: TablePaginationConfig,
          _filters: Record<string, FilterValue | null>,
          _sorter: SorterResult<any> | SorterResult<any>[],
          extra: { currentDataSource?: any[] }
        ) => {
          setCurrentTableData(extra.currentDataSource || []);
        }}
        pagination={{
          pageSize: 1000,
          showSizeChanger: false,
        }}
        dataSource={currentTableData}
        summary={(pageData) => {
          let totalResidual = 0;
          let paydiverseResidual = 0;
          let agentPayout = 0;

          pageData.forEach(
            ({ total_residual, paydiverse_residual, agent_payout }) => {
              totalResidual += total_residual;
              paydiverseResidual += paydiverse_residual;
              agentPayout += agent_payout;
            }
          );

          return (
            agentData &&
            agentData?.length > 0 && (
              <Table.Summary.Row className="total-row">
                <Table.Summary.Cell index={1}>
                  <strong>Total</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <strong>{formatCurrency(totalResidual)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <strong>{formatCurrency(paydiverseResidual)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <strong>{formatCurrency(agentPayout)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )
          );
        }}
      />
    </>
  );
};

export default AgentInsights;
