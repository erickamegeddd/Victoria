import { useQuery } from "react-query";
import {
  Col,
  message,
  Row,
  Table,
  Tag,
  Input,
  Button,
  TablePaginationConfig,
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useState } from "react";
import * as XLSX from "xlsx";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import formatCurrency from "../../utils/formatCurrency";
import agentClient from "../../utils/agentAxios";
import ModalComponent from "../modals/ModalComponent";

const { Search } = Input;

interface RevenuePerAgentTableProps {
  date: string | string[];
}

interface AgentsColumn {
  agent_name: string;
  total_payout: number;
}

const RevenuePerAgentTable: React.FC<RevenuePerAgentTableProps> = ({
  date,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>();
  const [record, setRecord] = useState<AgentsColumn>();
  const [currentTableData, setCurrentTableData] = useState<AgentsColumn[]>([]);
  const [searchText, setSearchText] = useState<string>("");

  const columns: any = [
    {
      key: 1,
      title: "Agent Name",
      dataIndex: "agent_name",
      width: "400px",
      sorter: (a: AgentsColumn, b: AgentsColumn) =>
        a.agent_name.localeCompare(b.agent_name),
      render: (agent_name: string) =>
        agent_name || <Tag color="error">Not Provided</Tag>,
    },
    {
      key: 2,
      title: "Total Payout",
      dataIndex: "total_payout",
      width: "400px",
      sorter: (a: AgentsColumn, b: AgentsColumn) =>
        a.total_payout - b.total_payout,
      render: formatCurrency,
    },
  ];

  const fetchAgentsPayout = async (date: string | string[]) => {
    const { data } = await agentClient.get(`/api/agents-payout`, {
      params: { date },
    });
    setCurrentTableData(data);
    return data;
  };

  const { data: totalPayoutData, error: totalPayoutError } = useQuery(
    ["fetchAgentsPayout", date],
    () => fetchAgentsPayout(date),
    {
      enabled: !!date,
    }
  );

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleRowClick = (record: AgentsColumn) => {
    setRecord(record);
    setIsOpen(true);
  };

  const handleDownload = () => {
    // Use the currentTableData for download
    const formattedData = currentTableData.map((item: AgentsColumn) => ({
      "Agent Name": item.agent_name || "Not Provided",
      "Total Payout": item.total_payout ? Number(item.total_payout) : 0.0,
    }));

    // Create worksheet with the formatted data
    const worksheet = XLSX.utils.json_to_sheet(
      formattedData || totalPayoutData,
      {
        header: ["Agent Name", "Total Payout"],
      }
    );

    // Set column widths
    const columnWidths = [{ wch: 30 }, { wch: 20 }];
    worksheet["!cols"] = columnWidths;

    // Create workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue Per Agent Data");
    XLSX.writeFile(workbook, `Revenue-Per-Agent${date}.xlsx`);
    message.success("File downloaded successfully");
  };

  if (totalPayoutError) {
    message.error("Error Fetching data");
  }

  return (
    <>
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
            disabled={!totalPayoutData || totalPayoutData.length === 0}
          >
            Download as XLSX <DownloadOutlined />
          </Button>
        </Col>
      </Row>
      <Table
        dataSource={totalPayoutData?.filter((item: AgentsColumn) =>
          (item.agent_name || "")
            .toLowerCase()
            .includes(searchText.toLowerCase())
        )}
        onChange={(
          _pagination: TablePaginationConfig,
          _filters: Record<string, FilterValue | null>,
          _sorter: SorterResult<AgentsColumn> | SorterResult<AgentsColumn>[],
          extra: { currentDataSource?: AgentsColumn[] }
        ) => {
          setCurrentTableData(
            extra.currentDataSource || (totalPayoutData as any)
          ); // Handle optional chaining
        }}
        columns={columns}
        scroll={{ x: 768 }}
        rowKey="agent_name"
        onRow={(record: AgentsColumn) => ({
          onClick: () => handleRowClick(record),
        })}
        rowClassName="row"
      />
      {isOpen && record && (
        <ModalComponent
          isOpen={isOpen}
          title={record.agent_name}
          onCancel={handleCancel}
          apiNumber={3}
          date={date}
          paydiverseResidual={record?.total_payout}
        />
      )}
    </>
  );
};

export default RevenuePerAgentTable;
