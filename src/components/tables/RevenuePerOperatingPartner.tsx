import {
  Button,
  Col,
  Input,
  message,
  Row,
  Table,
  TablePaginationConfig,
  Tag,
} from "antd";
import { useState } from "react";
import { DownloadOutlined } from "@ant-design/icons";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import formatCurrency from "../../utils/formatCurrency";
import client from "../../utils/axios";
import { useQuery } from "react-query";
import * as XLSX from "xlsx";
import ModalComponent from "../modals/ModalComponent";

interface RevenuePerOperatingPartnerTableProps {
  date: string | string[];
}

interface RevenuePerOperatingPartnerColumns {
  operating_partner: string;
  paydiverse_residual: number;
}

const RevenuePerOperatingPartnerTable: React.FC<
  RevenuePerOperatingPartnerTableProps
> = ({ date }) => {
  const [searchText, setSearchText] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>();
  const [record, setRecord] = useState<RevenuePerOperatingPartnerColumns>();
  const [currentTableData, setCurrentTableData] = useState<
    RevenuePerOperatingPartnerColumns[]
  >([]);

  const columns: any = [
    {
      key: 1,
      title: "Operating Partner",
      dataIndex: "operating_partner",
      width: "400px",
      sorter: (
        a: RevenuePerOperatingPartnerColumns,
        b: RevenuePerOperatingPartnerColumns
      ) => {
        if (a.operating_partner && b.operating_partner) {
          return a.operating_partner.localeCompare(b.operating_partner); // Sort alphabetically if both values exist
        }
        return a.operating_partner ? -1 : 1; // Sort non-empty values first
      },
      render: (operating_partner: string) => {
        if (!operating_partner) {
          return <Tag color="error">Operating Partner Not Provided</Tag>;
        }
        return operating_partner;
      },
    },
    {
      key: 2,
      title: "PayDiverse Residual",
      dataIndex: "paydiverse_residual",
      width: "250px",
      sorter: (
        a: RevenuePerOperatingPartnerColumns,
        b: RevenuePerOperatingPartnerColumns
      ) => a.paydiverse_residual - b.paydiverse_residual,
      render: (paydiverse_residual: any) => formatCurrency(paydiverse_residual),
    },
  ];

  const fetchRevenuePerOperatingPartner = async (date: string | string[]) => {
    const { data } = await client.get<RevenuePerOperatingPartnerColumns[]>(
      `/revenue-per-operating-partner`,
      {
        params: { date },
      }
    );
    setCurrentTableData(data);
    return data;
  };

  const { data, error } = useQuery(
    ["fetchRevenuePerOperatingPartner", date],
    () => fetchRevenuePerOperatingPartner(date),
    {
      enabled: !!date,
    }
  );

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleRowClick = (record: RevenuePerOperatingPartnerColumns) => {
    setRecord(record);
    setIsOpen(true);
  };

  const handleDownload = () => {
    const tableData =
      currentTableData && currentTableData.length > 0
        ? currentTableData?.filter(
            (item: RevenuePerOperatingPartnerColumns) => {
              const corporation = item.operating_partner || "";
              return corporation
                .toLowerCase()
                .includes(searchText.toLowerCase());
            }
          )
        : data?.filter((item: RevenuePerOperatingPartnerColumns) => {
            const corporation = item.operating_partner || "";
            return corporation.toLowerCase().includes(searchText.toLowerCase());
          });

    const formattedData = tableData?.map(
      (item: RevenuePerOperatingPartnerColumns) => ({
        "Operating Partner": item.operating_partner || "-",
        "PayDiverse Residual": item.paydiverse_residual
          ? Number(item.paydiverse_residual)
          : 0.0,
      })
    );

    // Create worksheet with the formatted data
    const worksheet = XLSX.utils.json_to_sheet(formattedData || [], {
      header: ["Operating Partner", "PayDiverse Residual"],
    });

    // Set column widths
    const columnWidths = [{ wch: 30 }, { wch: 20 }];
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Revenue Per Operating Partner"
    );
    XLSX.writeFile(workbook, `Revenue-Per-Operating-Partner-${date}.xlsx`);
    message.success("File downloaded successfully");
  };

  if (error) {
    message.error("Error Fetching data");
  }
  return (
    <>
      <Row>
        <Col>
          <h2>Revenue Per Operating Partner</h2>
        </Col>
      </Row>
      <Row gutter={[16, 16]} justify="space-between">
        <Col span={8}>
          <Input.Search
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
        dataSource={data?.filter((item: RevenuePerOperatingPartnerColumns) => {
          const corporation = item.operating_partner || "";

          return corporation.toLowerCase().includes(searchText.toLowerCase());
        })}
        onChange={(
          _pagination: TablePaginationConfig,
          _filters: Record<string, FilterValue | null>,
          _sorter:
            | SorterResult<RevenuePerOperatingPartnerColumns>
            | SorterResult<RevenuePerOperatingPartnerColumns>[],
          extra: { currentDataSource?: RevenuePerOperatingPartnerColumns[] }
        ) => {
          setCurrentTableData(extra.currentDataSource || []); // Handle optional chaining
        }}
        columns={columns}
        rowClassName="row"
        onRow={(record) => {
          return {
            onClick: () => handleRowClick(record),
          };
        }}
      />
      {isOpen && record && (
        <ModalComponent
          isOpen={isOpen}
          apiNumber={4}
          date={date}
          onCancel={handleCancel}
          title={record.operating_partner}
        />
      )}
    </>
  );
};

export default RevenuePerOperatingPartnerTable;
