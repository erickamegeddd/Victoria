import { useQuery } from "react-query";
import client from "../../utils/axios";
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
import formatCurrency from "../../utils/formatCurrency";
import { useState } from "react";
import * as XLSX from "xlsx";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import NegativeMIDsLineChart from "../charts/NegativeMIDsLineChart";

const { Search } = Input;

interface NegativeRevenuePerCorpTableProps {
  date: string | string[];
}

interface NegativeRevenuePerCorpColumns {
  dba: string;
  corporation: string;
  iso: string;
  mid: string;
  paydiverse_residual: number;
  total_residual: number;
}

const NegativeRevenuePerCorpTable: React.FC<
  NegativeRevenuePerCorpTableProps
> = ({ date }) => {
  const [searchText, setSearchText] = useState<string>("");
  const [currentTableData, setCurrentTableData] = useState<
    NegativeRevenuePerCorpColumns[]
  >([]);

  const columns: any = [
    {
      key: 1,
      title: "ISO",
      dataIndex: "iso",
      width: "300px",
      sorter: (
        a: NegativeRevenuePerCorpColumns,
        b: NegativeRevenuePerCorpColumns
      ) => {
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
      key: 2,
      title: "Corporation",
      dataIndex: "corporation",
      width: "300px",
      sorter: (
        a: NegativeRevenuePerCorpColumns,
        b: NegativeRevenuePerCorpColumns
      ) => {
        if (a.corporation && b.corporation) {
          return a?.corporation?.localeCompare(b?.corporation); // Sort alphabetically if both values exist
        }
        return a?.corporation ? -1 : 1; // Sort non-empty values first
      },
      render: (corporation: string) => {
        if (!corporation) {
          return <Tag color="error">Not Provided</Tag>;
        }
        return corporation;
      },
    },
    {
      key: 3,
      title: "DBA",
      dataIndex: "dba",
      width: "400px",
      sorter: (
        a: NegativeRevenuePerCorpColumns,
        b: NegativeRevenuePerCorpColumns
      ) => {
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
      key: 4,
      title: "MID",
      dataIndex: "mid",
      width: "300px",
      sorter: (
        a: NegativeRevenuePerCorpColumns,
        b: NegativeRevenuePerCorpColumns
      ) => {
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
      key: 5,
      title: "Total Residual",
      dataIndex: "total_residual",
      width: "250px",
      sorter: (
        a: NegativeRevenuePerCorpColumns,
        b: NegativeRevenuePerCorpColumns
      ) => a.total_residual - b.total_residual,
      render: (total_residual: any) => formatCurrency(total_residual),
    },
    {
      key: 6,
      title: "PayDiverse Residual",
      dataIndex: "paydiverse_residual",
      width: "250px",
      sorter: (
        a: NegativeRevenuePerCorpColumns,
        b: NegativeRevenuePerCorpColumns
      ) => a.paydiverse_residual - b.paydiverse_residual,
      render: (paydiverse_residual: any) => formatCurrency(paydiverse_residual),
    },
  ];
  const fetchNegativeRevenuePerCorp = async (date: string | string[]) => {
    const { data } = await client.get<NegativeRevenuePerCorpColumns[]>(
      `/negative-revenue-per-corporation`,
      {
        params: { date },
      }
    );
    setCurrentTableData(data);
    return data;
  };

  const { data, error } = useQuery(
    ["fetchNegativeRevenuePerCorp", date],
    () => fetchNegativeRevenuePerCorp(date),
    {
      enabled: !!date,
    }
  );

  const totalPaydiverse = data?.reduce(
    (acc, curr) => acc + (curr.paydiverse_residual ?? 0),
    0
  );

  const handleDownload = () => {
    const tableData =
      currentTableData.length > 0 ? currentTableData : data || [];

    const filteredData = tableData.filter(
      (item: NegativeRevenuePerCorpColumns) => {
        const searchValue = searchText.toLowerCase();
        return (
          item.corporation?.toLowerCase().includes(searchValue) ||
          item.iso?.toLowerCase().includes(searchValue) ||
          item.dba?.toLowerCase().includes(searchValue) ||
          item.mid?.toLowerCase().includes(searchValue)
        );
      }
    );

    if (filteredData.length === 0) {
      message.error("No data available for download");
      return;
    }

    const formattedData = filteredData.map(
      (item: NegativeRevenuePerCorpColumns) => ({
        ISO: item.iso || "-",
        Corporation: item.corporation || "-",
        DBA: item.dba || "-",
        MID: item.mid || "-",
        "Total Residual": item.total_residual
          ? Number(item.total_residual)
          : 0.0,
        "PayDiverse Residual": item.paydiverse_residual
          ? Number(item.paydiverse_residual)
          : 0.0,
      })
    );

    // Create worksheet with the formatted data
    const worksheet = XLSX.utils.json_to_sheet(formattedData, {
      header: [
        "ISO",
        "Corporation",
        "DBA",
        "MID",
        "Total Residual",
        "PayDiverse Residual",
      ],
    });

    // Set column widths
    worksheet["!cols"] = [
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Negative MID's");
    XLSX.writeFile(workbook, `Negative-MID's-${date}.xlsx`);
    message.success("File downloaded successfully");
  };

  if (error) {
    message.error("Error Fetching data");
  }

  const rowClassName = (record: any) => {
    return record.paydiverse_residual < 0 ? "negative-row" : "";
  };

  const mids =
    data
      ?.filter((item) => item.iso && item.mid) // Ensure both exist
      .map((item) => ({
        iso: item.iso,
        mid: item.mid,
      })) || [];

  return (
    <>
      <Row>
        <Col>
          <h2>Negative MID's</h2>
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
      <span
        style={{
          backgroundColor: "rgb(231, 230, 230)",
          fontWeight: 600,
          fontSize: 22,
          padding: 5,
          borderRadius: 6,
        }}
      >
        Total PayDiversal Residual: {formatCurrency(totalPaydiverse || 0)}
      </span>
      <Table
        style={{ marginTop: 10 }}
        onChange={(
          _pagination: TablePaginationConfig,
          _filters: Record<string, FilterValue | null>,
          _sorter:
            | SorterResult<NegativeRevenuePerCorpColumns>
            | SorterResult<NegativeRevenuePerCorpColumns>[],
          extra: { currentDataSource?: NegativeRevenuePerCorpColumns[] }
        ) => {
          setCurrentTableData(extra.currentDataSource || []); // Handle optional chaining
        }}
        dataSource={data?.filter((item: NegativeRevenuePerCorpColumns) => {
          const dba = item.dba || "";
          const iso = item.iso || "";
          const mid = item.mid || "";
          const corporation = item.corporation || "";

          return (
            dba.toLowerCase().includes(searchText.toLowerCase()) ||
            corporation.toLowerCase().includes(searchText.toLowerCase()) ||
            mid.toLowerCase().includes(searchText.toLowerCase()) ||
            iso.toLowerCase().includes(searchText.toLowerCase())
          );
        })}
        columns={columns}
        rowClassName={rowClassName}
        rowHoverable={false}
        pagination={{ showSizeChanger: true }}
        summary={(pageData) => {
          let paydiverseResidual = 0;

          pageData.forEach(({ paydiverse_residual }) => {
            paydiverseResidual += paydiverse_residual;
          });

          return (
            <Table.Summary.Row className="total-row">
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong>Total PayDiverse Residual</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}></Table.Summary.Cell>
              <Table.Summary.Cell index={3}></Table.Summary.Cell>
              <Table.Summary.Cell index={4}></Table.Summary.Cell>
              <Table.Summary.Cell index={5}>
                <strong>{formatCurrency(paydiverseResidual)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
      <NegativeMIDsLineChart mids={mids} />
    </>
  );
};

export default NegativeRevenuePerCorpTable;
