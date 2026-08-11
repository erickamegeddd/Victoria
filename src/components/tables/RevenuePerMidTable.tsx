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
import dayjs from "dayjs";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import formatCurrency from "../../utils/formatCurrency";
import client from "../../utils/axios";

const { Search } = Input;

interface RevenuePerMidTableProps {
  date: string | string[];
}

interface RevenuePerMidColumns {
  dba: string;
  corporation: string;
  iso: string;
  mid: string;
  operating_partner: string | null;
  paydiverse_residual: number;
  total_residual: number;
  volume: number;
  agent1_name: string | null;
  agent1_percentage: number | null;
  agent1_payout: number | null;
  agent2_name: string | null;
  agent2_percentage: number | null;
  agent2_payout: number | null;
}

const RevenuePerMidTable: React.FC<RevenuePerMidTableProps> = ({ date }) => {
  const [searchText, setSearchText] = useState<string>("");
  const [currentTableData, setCurrentTableData] = useState<
    RevenuePerMidColumns[]
  >([]);
  const columns: any = [
    {
      key: 1,
      title: "Operating Partner",
      dataIndex: "operating_partner",
      width: "500px",
      sorter: (a: RevenuePerMidColumns, b: RevenuePerMidColumns) => {
        if (a.operating_partner && b.operating_partner) {
          return a.operating_partner.localeCompare(b.operating_partner); // Sort alphabetically if both values exist
        }
        return a.operating_partner ? -1 : 1; // Sort non-empty values first
      },
      render: (operating_partner: string) => {
        if (!operating_partner) {
          return <Tag color="error">Not Provided</Tag>;
        }
        return operating_partner;
      },
    },
    {
      key: 2,
      title: "MID",
      dataIndex: "mid",
      width: "300px",
      sorter: (a: RevenuePerMidColumns, b: RevenuePerMidColumns) => {
        if (a.mid && b.mid) {
          return a.mid.localeCompare(b.mid); // Sort alphabetically if both values exist
        }
        return a.mid ? -1 : 1; // Sort non-empty values first
      },
      render: (mid: string) => {
        if (!mid) {
          return <Tag color="error">MID Not Provided</Tag>;
        }
        return mid;
      },
    },
    {
      key: 3,
      title: "Corporation",
      dataIndex: "corporation",
      width: "500px",
      sorter: (a: RevenuePerMidColumns, b: RevenuePerMidColumns) => {
        if (a.corporation && b.corporation) {
          return a.corporation.localeCompare(b.corporation); // Sort alphabetically if both values exist
        }
        return a.corporation ? -1 : 1; // Sort non-empty values first
      },
      render: (corporation: string) => {
        if (!corporation) {
          return <Tag color="error">Corporation Not Provided</Tag>;
        }
        return corporation;
      },
    },
    {
      key: 4,
      title: "DBA",
      dataIndex: "dba",
      width: "400px",
      sorter: (a: RevenuePerMidColumns, b: RevenuePerMidColumns) => {
        if (a.dba && b.dba) {
          return a.dba.localeCompare(b.dba); // Sort alphabetically if both values exist
        }
        return a.dba ? -1 : 1; // Sort non-empty values first
      },
      render: (dba: string) => {
        if (!dba) {
          return <Tag color="error">DBA Not Provided</Tag>;
        }
        return dba;
      },
    },
    {
      key: 5,
      title: "ISO",
      dataIndex: "iso",
      width: "500px",
      sorter: (a: RevenuePerMidColumns, b: RevenuePerMidColumns) => {
        if (a.iso && b.iso) {
          return a.iso.localeCompare(b.iso); // Sort alphabetically if both values exist
        }
        return a.iso ? -1 : 1; // Sort non-empty values first
      },
      render: (iso: string) => {
        if (!iso) {
          return <Tag color="error">Not Provided</Tag>;
        }
        return iso;
      },
    },
    {
      key: 7,
      title: "Volume",
      dataIndex: "volume",
      width: "300px",
      sorter: (a: RevenuePerMidColumns, b: RevenuePerMidColumns) =>
        a.volume - b.volume,
      render: (volume: number) => formatCurrency(volume),
    },
    {
      key: 8,
      title: "Total Residual",
      dataIndex: "total_residual",
      width: "300px",
      sorter: (a: RevenuePerMidColumns, b: RevenuePerMidColumns) =>
        a.total_residual - b.total_residual,
      render: (total_residual: number) => formatCurrency(total_residual),
    },
    {
      key: 9,
      title: "PayDiverse Residual",
      dataIndex: "paydiverse_residual",
      width: "300px",
      sorter: (a: RevenuePerMidColumns, b: RevenuePerMidColumns) =>
        a.paydiverse_residual - b.paydiverse_residual,
      render: (paydiverse_residual: number) =>
        formatCurrency(paydiverse_residual),
    },
    {
      key: 10,
      title: "Agent 1 Name",
      dataIndex: "agent1_name",
      width: "400px",
      sorter: (a: IsoData, b: IsoData) => {
        if (a.agent1_name && b.agent1_name) {
          return a.mid.localeCompare(b.agent1_name); // Sort alphabetically if both values exist
        }
        return a.agent1_name ? -1 : 1; // Sort non-empty values first
      },
      render: (agent1_name: string) => {
        if (!agent1_name) {
          return <Tag color="error">Not Provided</Tag>;
        }
        return agent1_name;
      },
    },
    {
      key: 11,
      title: "Agent 1 Percentage",
      dataIndex: "agent1_percentage",
      width: "300px",
      sorter: (a: IsoData, b: IsoData) =>
        (a?.agent1_percentage || 0.0) - (b?.agent1_percentage || 0.0),
      render: (agent1_percentage: any) => {
        if (!agent1_percentage) return <Tag color="error">Not Provided</Tag>;
        return agent1_percentage + " %";
      },
    },
    {
      key: 12,
      title: "Agent 1 Payout",
      dataIndex: "agent1_payout",
      width: "300px",
      sorter: (a: IsoData, b: IsoData) => a.agent1_payout - b.agent1_payout,
      render: (agent1_payout: any) => {
        if (!agent1_payout) return <Tag color="error">Not Provided</Tag>;
        return formatCurrency(agent1_payout);
      },
    },
    {
      key: 13,
      title: "Agent 2 Name",
      dataIndex: "agent2_name",
      width: "400px",
      sorter: (a: IsoData, b: IsoData) => {
        if (a.agent2_name && b.agent2_name) {
          return a.mid.localeCompare(b.agent2_name); // Sort alphabetically if both values exist
        }
        return a.agent2_name ? -1 : 1; // Sort non-empty values first
      },
      render: (agent2_name: string) => {
        if (!agent2_name) {
          return <Tag color="error">Not Provided</Tag>;
        }
        return agent2_name;
      },
    },
    {
      key: 14,
      title: "Agent 2 Percentage",
      dataIndex: "agent2_percentage",
      width: "300px",
      sorter: (a: IsoData, b: IsoData) =>
        (a?.agent2_percentage || 0.0) - (b?.agent2_percentage || 0.0),
      render: (agent2_percentage: any) => {
        if (!agent2_percentage) return <Tag color="error">Not Provided</Tag>;
        return agent2_percentage + " %";
      },
    },
    {
      key: 15,
      title: "Agent 2 Payout",
      dataIndex: "agent2_payout",
      width: "300px",
      sorter: (a: IsoData, b: IsoData) => a.agent2_payout - b.agent2_payout,
      render: (agent2_payout: any) => {
        if (!agent2_payout) return <Tag color="error">Not Provided</Tag>;
        return formatCurrency(agent2_payout);
      },
    },
  ];

  const fetchRevenuePerMid = async (date: string | string[]) => {
    const { data } = await client.get<RevenuePerMidColumns[]>(
      `/revenue-per-mid`,
      {
        params: { date },
      }
    );
    setCurrentTableData(data);
    return data;
  };

  const { data, error } = useQuery(
    ["fetchRevenuePerMid", date],
    () => fetchRevenuePerMid(date),
    {
      enabled: !!date,
    }
  );

  const handleDownload = () => {
    const formattedData = (
      currentTableData && currentTableData.length > 0
        ? currentTableData
        : (data as RevenuePerMidColumns[])
    ).map((item: RevenuePerMidColumns) => ({
      MID: item.mid || "-",
      "Operating Partner": item.operating_partner || "-",
      Corporation: item.corporation || "-",
      DBA: item.dba || "-",
      ISO: item.iso || "-",
      Volume: item?.volume ? item.volume : 0.0,
      "Total Residual": item?.total_residual ? item.total_residual : 0.0,
      "PayDiverse Residual": item?.paydiverse_residual
        ? item.paydiverse_residual
        : 0.0,
      "Agent 1 Name": item?.agent1_name || "-",
      "Agent 1 Percentage": item?.agent1_percentage
        ? item?.agent1_percentage + "%"
        : "0.00%",
      "Agent 1 Payout": item?.agent1_payout ? Number(item.agent1_payout) : 0.0,
      "Agent 2 Name": item?.agent2_name || "-",
      "Agent 2 Percentage": item?.agent2_percentage
        ? item?.agent2_percentage + "%"
        : "0.00%",
      "Agent 2 Payout": item?.agent2_payout ? Number(item.agent2_payout) : 0.0,
    }));

    // Create worksheet with the formatted data
    const worksheet = XLSX.utils.json_to_sheet(formattedData || [], {
      header: [
        "Operating Partner",
        "MID",
        "Corporation",
        "DBA",
        "ISO",
        "VOlume",
        "Total Residual",
        "PayDiverse Residual",
        "Agent 1 Name",
        "Agent 1 Percentage",
        "Agent 1 Payout",
        "Agent 2 Name",
        "Agent 2 Percentage",
        "Agent 2 Payout",
      ],
    });

    // Set column widths
    const columnWidths = [
      { wch: 50 },
      { wch: 30 },
      { wch: 50 },
      { wch: 50 },
      { wch: 30 },
      { wch: 50 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
    ];
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue Per MID Data");
    XLSX.writeFile(
      workbook,
      `Revenue-Per-MID-${dayjs(date as string).format("MM-YYYY")}.xlsx`
    );
    message.success("File downloaded successfully");
  };

  if (error) {
    message.error("Error Fetching data");
  }

  const rowClassName = (record: any) => {
    return record.paydiverse_residual < 0 ? "negative-row" : "";
  };

  return (
    <>
      <Row>
        <Col>
          <h2>Revenue Per MID</h2>
        </Col>
      </Row>
      <Row gutter={[16, 16]} justify="space-between">
        <Col span={8}>
          <Search
            size="large"
            placeholder={"Search"}
            allowClear
            enterButton
            onSearch={(value) => setSearchText(value)}
            onChange={(e) => {
              const newValue = e.target.value;
              setSearchText(newValue);
            }}
          />
        </Col>
        <Col span={8} style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            className="download-btn"
            type="primary"
            onClick={handleDownload}
            disabled={!data || data.length === 0}
          >
            Download as XLSX <DownloadOutlined />
          </Button>
        </Col>
      </Row>
      <Table
        onChange={(
          _pagination: TablePaginationConfig,
          _filters: Record<string, FilterValue | null>,
          _sorter:
            | SorterResult<RevenuePerMidColumns>
            | SorterResult<RevenuePerMidColumns>[],
          extra: { currentDataSource?: RevenuePerMidColumns[] }
        ) => {
          setCurrentTableData(
            extra.currentDataSource || (data as RevenuePerMidColumns[])
          ); // Handle optional chaining
        }}
        dataSource={data?.filter((item: RevenuePerMidColumns) => {
          const dba = item.dba || "";
          const iso = item.iso || "";
          const mid = item.mid || "";
          const corporation = item.corporation || "";
          const agent1_name = item.agent1_name || "";
          const agent2_name = item.agent2_name || "";

          return (
            dba.toLowerCase().includes(searchText.toLowerCase()) ||
            mid.toLowerCase().includes(searchText.toLowerCase()) ||
            corporation.toLowerCase().includes(searchText.toLowerCase()) ||
            agent1_name.toLowerCase().includes(searchText.toLowerCase()) ||
            agent2_name.toLowerCase().includes(searchText.toLowerCase()) ||
            iso.toLowerCase().includes(searchText.toLowerCase())
          );
        })}
        scroll={{ x: 1800 }}
        columns={columns}
        rowClassName={rowClassName}
        rowHoverable={false}
      />
    </>
  );
};

export default RevenuePerMidTable;
