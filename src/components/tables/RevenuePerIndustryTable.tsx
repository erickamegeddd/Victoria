import React, { useState } from "react";
import { useQuery } from "react-query";
import {
  message,
  Table,
  Tag,
  Input,
  Row,
  Col,
  Empty,
  Button,
  TablePaginationConfig,
} from "antd";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import { DownloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import formatCurrency from "../../utils/formatCurrency";
import client from "../../utils/axios";

const { Search } = Input;

interface RevenuePerIndustryTableProps {
  date: string | string[];
}

interface RevenuePerIndustryItem {
  four_digit_sic_code_descriptions: string;
  total_residual: number;
  paydiverse_residual: number;
}

interface PaginatedResponse {
  data: RevenuePerIndustryItem[];
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28EFF"];

const RevenuePerIndustryTable: React.FC<RevenuePerIndustryTableProps> = ({
  date,
}) => {
  const [currentTableData, setCurrentTableData] = useState<
    RevenuePerIndustryItem[]
  >([]);
  const [searchText, setSearchText] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const columns = [
    {
      key: 1,
      title: "Industry Name",
      dataIndex: "four_digit_sic_code_descriptions",
      width: "400px",
      render: (dba: string) => {
        if (!dba) {
          return <Tag color="error">Industry Name Not Provided</Tag>;
        }
        return dba;
      },
    },
    {
      key: 2,
      title: "Total Residual",
      dataIndex: "total_residual",
      width: "250px",
      sorter: (a: RevenuePerIndustryItem, b: RevenuePerIndustryItem) =>
        a?.total_residual - b?.total_residual,
      render: (total_residual: number) => formatCurrency(total_residual),
    },
    {
      key: 3,
      title: "PayDiverse Residual",
      dataIndex: "paydiverse_residual",
      width: "250px",
      sorter: (a: RevenuePerIndustryItem, b: RevenuePerIndustryItem) =>
        a?.paydiverse_residual - b?.paydiverse_residual,
      render: (paydiverse_residual: number) =>
        formatCurrency(paydiverse_residual),
    },
  ];

  const fetchRevenuePerIndustry = async (
    date: string | string[],
    page: number,
    pageSize: number
  ): Promise<PaginatedResponse> => {
    const { data } = await client.get<PaginatedResponse>(
      `/revenue-per-industry`,
      {
        params: { date, page, page_size: pageSize },
      }
    );
    setCurrentTableData(data.data);
    return data;
  };

  const { data, error, isLoading } = useQuery(
    ["fetchRevenuePerIndustry", date, page, pageSize],
    () => fetchRevenuePerIndustry(date, page, pageSize),
    {
      enabled: !!date,
      keepPreviousData: true,
    }
  );

  const handleDownload = () => {
    // Use the currentTableData for download
    const formattedData = currentTableData?.map(
      (item: RevenuePerIndustryItem) => ({
        "Industry Description":
          item.four_digit_sic_code_descriptions || "Not Provided",
        "Total Residual": item?.total_residual
          ? Number(item?.total_residual)
          : 0.0,
        "PayDiverse Residual": item?.paydiverse_residual
          ? Number(item?.paydiverse_residual)
          : 0.0,
      })
    );

    // Create worksheet with the formatted data
    const worksheet = XLSX.utils.json_to_sheet(formattedData || [], {
      header: ["Industry Description", "Total Residual", "PayDiverse Residual"],
    });

    // Set column widths
    const columnWidths = [{ wch: 50 }, { wch: 30 }, { wch: 30 }];
    worksheet["!cols"] = columnWidths;

    // Create workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Industries Data");
    XLSX.writeFile(workbook, `Industries-Data.xlsx`);
    message.success("File downloaded successfully");
  };

  if (error) {
    message.error("Error Fetching data");
  }

  // const handleTableChange = (pagination: any) => {
  //   setPage(pagination.current);
  //   setPageSize(pagination.pageSize);
  // };

  // Get the top 5 records based on total_residual
  const topFiveData = (data?.data || [])
    .sort((a, b) => b?.paydiverse_residual - a?.paydiverse_residual)
    .slice(0, 5);

  return (
    <>
      <Row justify="start">
        <Col>
          <h2>Top 5 Industries</h2>
        </Col>
      </Row>
      <Row justify="center" align="middle" style={{ marginTop: 24 }}>
        <Col span={24}>
          {data?.data.length != 0 ? (
            <ResponsiveContainer width="100%" height={500}>
              <PieChart>
                <Pie
                  data={topFiveData}
                  dataKey="paydiverse_residual"
                  nameKey="four_digit_sic_code_descriptions"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  fill="#8884d8"
                  label={({ name, value }) =>
                    `${name}: ${formatCurrency(value as number)}`
                  }
                >
                  {topFiveData.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${
                        index + "" + entry?.four_digit_sic_code_descriptions
                      }`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value as number)}
                  labelFormatter={(name: string) => `Industry: ${name}`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Col>
      </Row>
      <Row gutter={[16, 16]} justify="start">
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
      </Row>
      <Row justify="space-between">
        <Col>
          <h2>Revenue Per Industry</h2>
        </Col>
        <Col>
          <Button
            className="download-btn"
            type="primary"
            onClick={handleDownload}
            disabled={!data?.data || data?.data.length === 0}
          >
            Download as XLSX <DownloadOutlined />
          </Button>
        </Col>
      </Row>
      <Table
        dataSource={data?.data.filter((item: RevenuePerIndustryItem) => {
          const industry = item.four_digit_sic_code_descriptions || "";
          return industry.toLowerCase().includes(searchText.toLowerCase());
        })}
        onChange={(
          _pagination: TablePaginationConfig,
          _filters: Record<string, FilterValue | null>,
          _sorter: SorterResult<any> | SorterResult<any>[],
          extra: { currentDataSource?: any[] }
        ) => {
          setPage(_pagination.current as number);
          setPageSize(_pagination.pageSize as number);
          setCurrentTableData(extra.currentDataSource || []); // Handle optional chaining
        }}
        columns={columns}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: data?.total_count,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        // onChange={handleTableChange}
      />
    </>
  );
};

export default RevenuePerIndustryTable;
