import { useState } from "react";
import {
  Button,
  Col,
  DatePicker,
  message,
  Row,
  Table,
  TablePaginationConfig,
  Tag,
} from "antd";
import client from "../../utils/axios";
import { useQuery } from "react-query";
import Spinner from "../../components/general/Spinner";
import dayjs from "dayjs";
import { DownloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { FilterValue, SorterResult } from "antd/es/table/interface";

const { RangePicker } = DatePicker;

interface Merchant {
  mid: string;
  dba: string;
  iso: string;
  corporation: string;
  approval_date: string;
  closed_date?: string;
}

const columns: any = [
  {
    title: "MID",
    dataIndex: "mid",
    key: "mid",
    sorter: (a: Merchant, b: Merchant) => a.mid.localeCompare(b.mid),
    render: (mid: string) =>
      mid ? mid : <Tag title="Not Provided" color="error" />,
  },
  {
    title: "DBA",
    dataIndex: "dba",
    key: "dba",
    sorter: (a: Merchant, b: Merchant) => a.dba.localeCompare(b.dba),
    render: (dba: string) =>
      dba ? dba : <Tag title="Not Provided" color="error" />,
  },
  {
    title: "ISO",
    dataIndex: "iso",
    key: "iso",
    sorter: (a: Merchant, b: Merchant) => a.iso.localeCompare(b.iso),
    render: (iso: string) =>
      iso ? iso : <Tag title="Not Provided" color="error" />,
  },
  {
    title: "Corporation",
    dataIndex: "corporation",
    key: "corporation",
    sorter: (a: Merchant, b: Merchant) =>
      a.corporation.localeCompare(b.corporation),
    render: (corporation: string) =>
      corporation ? corporation : <Tag title="Not Provided" color="error" />,
  },
  {
    title: "Approval Date",
    dataIndex: "approval_date",
    key: "approval_date",
    sorter: (a: Merchant, b: Merchant) =>
      dayjs(a.approval_date).unix() - dayjs(b.approval_date).unix(),
    render: (text: string) => (text ? dayjs(text).format("YYYY-MM-DD") : "-"),
  },
  {
    title: "Closed Date",
    dataIndex: "closed_date",
    key: "closed_date",
    sorter: (a: Merchant, b: Merchant) => {
      const dateA = a.closed_date ? dayjs(a.closed_date).unix() : 0;
      const dateB = b.closed_date ? dayjs(b.closed_date).unix() : 0;
      return dateA - dateB;
    },
    render: (text: string) => (text ? dayjs(text).format("YYYY-MM-DD") : "-"),
  },
];

const MidAddedInsights = () => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentTableData, setCurrentTableData] = useState<Merchant[]>([]);

  const fetchMidAdded = async () => {
    const { data } = await client.get<Merchant[]>(`/mids-approved-range`, {
      params: { start_date: startDate, end_date: endDate },
    });
    setCurrentTableData(data);
    return data;
  };

  const { isLoading: midDataLoading, error: midError } = useQuery(
    ["fetchMidAdded", startDate, endDate],
    fetchMidAdded,
    {
      enabled: !!startDate && !!endDate,
    }
  );

  const handleDateChange = (dates: any, _dateString: [string, string]) => {
    if (dates && dates[0] && dates[1]) {
      const formattedStartDate = dates[0].format("YYYY-MM-DD");
      const formattedEndDate = dates[1].format("YYYY-MM-DD");
      setStartDate(formattedStartDate);
      setEndDate(formattedEndDate);
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleDownload = () => {
    const formattedData = currentTableData.map((item) => ({
      MID: item.mid,
      DBA: item.dba,
      ISO: item.iso,
      Corporation: item.corporation,
      "Approval Date": dayjs(item.approval_date).format("YYYY-MM-DD"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MIDs Added");

    XLSX.writeFile(
      workbook,
      `MIDs-Added-${dayjs(startDate).format("YYYY-MM")}-to-${dayjs(
        endDate
      ).format("YYYY-MM")}.xlsx`
    );

    message.success("File downloaded successfully");
  };

  if (midError) message.error("Error fetching MIDs");

  return (
    <>
      <Spinner isLoading={midDataLoading} />
      <Row gutter={[16, 16]}>
        <Col xxl={6} xl={6} lg={6} md={24} sm={24} xs={24}>
          <RangePicker
            onChange={handleDateChange}
            value={
              startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : null
            }
            allowClear
          />
        </Col>
      </Row>
      <Row justify="end" align="middle">
        <Col span={6} style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="primary"
            onClick={handleDownload}
            disabled={!currentTableData.length}
            size="large"
          >
            Download as XLSX <DownloadOutlined />
          </Button>
        </Col>
      </Row>
      <Table
        loading={midDataLoading}
        columns={columns}
        dataSource={currentTableData}
        rowKey="mid"
        pagination={{ pageSize: 1000, showSizeChanger: false }}
        onChange={(
          _pagination: TablePaginationConfig,
          _filters: Record<string, FilterValue | null>,
          _sorter: SorterResult<any> | SorterResult<any>[],
          extra: { currentDataSource?: any[] }
        ) => {
          setCurrentTableData(extra.currentDataSource || []);
        }}
      />
    </>
  );
};

export default MidAddedInsights;
