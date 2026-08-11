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
import client from "../../utils/axios";
import { useQuery } from "react-query";
import Spinner from "../../components/general/Spinner";
import dayjs from "dayjs";
import formatCurrency from "../../utils/formatCurrency";
import { DownloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import { columns } from "./columns";

const { RangePicker } = DatePicker;
const currentYear = dayjs().year();
const lastYear = currentYear - 1;

const CorporationInsights = () => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedCorporation, setSelectedCorporation] = useState<string>("");
  const [currentTableData, setCurrentTableData] = useState<Columns[]>([]);

  const fetchUniqueCorporationData = async () => {
    const { data } = await client.get<{ corporation: string }[]>(
      "/unique-corporation"
    );
    return data;
  };

  const {
    data: uniqueCorporations,
    isLoading: isUniqueCorporationsLoading,
    error: uniqueCorporationsError,
  } = useQuery("fetchUniqueCorporationData", fetchUniqueCorporationData);

  const fetchRevenuePerCorporation = async () => {
    const { data } = await client.get<Columns[]>(`/corporation-insights`, {
      params: {
        start_date: startDate,
        end_date: endDate,
        corporation: selectedCorporation,
      },
    });
    setCurrentTableData(data);
    return data;
  };

  const {
    data: corporationData,
    isLoading: corporationDataLoading,
    error: corporationDataError,
  } = useQuery(
    ["fetchRevenuePerCorporation", startDate, endDate, selectedCorporation],
    fetchRevenuePerCorporation,
    {
      enabled: !!startDate && !!endDate && !!selectedCorporation,
    }
  );

  const handleDateChange = (_: any, dateString: [string, string]) => {
    const formattedStartDate = `${dateString[0]}-01`;
    const formattedEndDate = `${dateString[1]}-01`;
    setStartDate(formattedStartDate);
    setEndDate(formattedEndDate);
  };

  const handleCorporationChange = (value: string) => {
    setSelectedCorporation(value);
    setCurrentTableData([]);
  };

  const handleDownload = () => {
    const formattedData = currentTableData?.map((item: any) => ({
      Month: dayjs(item.month).format("MMMM, YYYY"),
      "Total Residual": formatCurrency(item.total_residual),
      "PayDiverse Residual": formatCurrency(item.paydiverse_residual),
    }));

    // Create worksheet with the formatted data
    const worksheet = XLSX.utils.json_to_sheet(formattedData || [], {
      header: ["Month", "Total Residual", "PayDiverse Residual"],
    });

    // Set column widths
    const columnWidths = [
      { wch: 20 }, // Month column
      { wch: 20 }, // Total Residual column
      { wch: 20 }, // Paydiverse Residual column
    ];
    worksheet["!cols"] = columnWidths;

    // Create workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Corporation Data");

    // Download the file
    XLSX.writeFile(
      workbook,
      `Corp-Insights-${dayjs(startDate).format("MM-YYYY")}-to-${dayjs(
        endDate
      ).format("MM-YYYY")}.xlsx`
    );
    message.success("File downloaded successfully");
  };

  if (uniqueCorporationsError || corporationDataError)
    message.error("Error fetching data");
  return (
    <>
      <Spinner
        isLoading={corporationDataLoading || isUniqueCorporationsLoading}
      />
      <Row gutter={[16, 16]}>
        <Col xxl={6} xl={6} lg={6} md={24} sm={24} xs={24}>
          <Select
            size="large"
            placeholder="Select Corporation"
            optionLabelProp="label"
            allowClear
            showSearch
            onChange={handleCorporationChange}
            filterOption={(input: any, option: any) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            filterSort={(optionA, optionB) =>
              (optionA?.label ?? "")
                .toLowerCase()
                .localeCompare((optionB?.label ?? "").toLowerCase())
            }
            options={uniqueCorporations?.map((data) => ({
              value: data.corporation,
              label: data.corporation,
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
              !corporationData ||
              corporationData.length === 0 ||
              currentTableData.length === 0
            }
          >
            Download as XLSX <DownloadOutlined />
          </Button>
        </Col>
      </Row>
      <Table
        loading={isUniqueCorporationsLoading || corporationDataLoading}
        columns={columns}
        onChange={(
          _pagination: TablePaginationConfig,
          _filters: Record<string, FilterValue | null>,
          _sorter: SorterResult<any> | SorterResult<any>[],
          extra: { currentDataSource?: any[] }
        ) => {
          setCurrentTableData(extra.currentDataSource || []); // Handle optional chaining
        }}
        pagination={{
          pageSize: 1000,
          showSizeChanger: false,
        }}
        dataSource={currentTableData}
        summary={(pageData) => {
          let totalResidual = 0;
          let paydiverseResidual = 0;

          pageData.forEach(({ total_residual, paydiverse_residual }) => {
            totalResidual += total_residual;
            paydiverseResidual += paydiverse_residual;
          });

          return (
            corporationData &&
            corporationData?.length > 0 && (
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
              </Table.Summary.Row>
            )
          );
        }}
      />
    </>
  );
};

export default CorporationInsights;
