import {
  Col,
  Input,
  message,
  Row,
  Select,
  Table,
  Tag,
  TablePaginationConfig,
  Button,
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import { useState } from "react";
import client from "../../utils/axios";
import { useQuery } from "react-query";
import dayjs from "dayjs";

const { Search } = Input;

const MidPerIso = () => {
  const [searchText, setSearchText] = useState<string>("");
  const [selectedIso, setSelectedIso] = useState<string>("");
  const [currentTableData, setCurrentTableData] = useState<MIDsPerISO[]>([]);

  const handleIsoChange = (value: string) => {
    setSelectedIso(value);
  };

  const fetchUniqueMidsIsoData = async () => {
    const { data } = await client.get<any[]>("/unique-iso");
    return data;
  };

  const { data: uniqueIsos } = useQuery(
    "fetchUniqueMidsIsoData",
    fetchUniqueMidsIsoData
  );

  const fetchMidsPerIso = async (iso: string) => {
    const { data } = await client.get<MIDsPerISO[]>(`/mids-per-iso`, {
      params: { iso },
    });
    setCurrentTableData(data);
    return data;
  };

  const { data, error, isLoading } = useQuery(
    ["fetchMidsPerIso", selectedIso],
    () => fetchMidsPerIso(selectedIso),
    {
      enabled: !!selectedIso,
    }
  );

  const columns: any = [
    {
      key: 1,
      title: "MID",
      dataIndex: "mid",
      width: "250px",
      sorter: (a: MIDsPerISO, b: MIDsPerISO) => a.mid.localeCompare(b.mid),
      render: (mid: string) => mid || <Tag color="error">MID Not Provided</Tag>,
    },
    {
      key: 2,
      title: "ISO",
      dataIndex: "iso",
      width: "300px",
      sorter: (a: MIDsPerISO, b: MIDsPerISO) => a.iso.localeCompare(b.iso),
      render: (iso: string) => iso || <Tag color="error">ISO Not Provided</Tag>,
    },
    {
      key: 3,
      title: "DBA",
      dataIndex: "dba",
      width: "300px",
      sorter: (a: MIDsPerISO, b: MIDsPerISO) => a.dba.localeCompare(b.dba),
      render: (dba: string) => dba || <Tag color="error">DBA Not Provided</Tag>,
    },
    {
      key: 4,
      title: "Corporation",
      dataIndex: "corporation",
      width: "300px",
      sorter: (a: MIDsPerISO, b: MIDsPerISO) =>
        (a?.corporation || "").localeCompare(b?.corporation || ""),
      render: (corporation: string) =>
        corporation || <Tag color="error">Not Provided</Tag>,
    },
    {
      key: 5,
      title: "Operating Partner",
      dataIndex: "operating_partner",
      width: "300px",
      sorter: (a: MIDsPerISO, b: MIDsPerISO) =>
        (a?.operating_partner || "").localeCompare(b?.operating_partner || ""),
      render: (operating_partner: string) =>
        operating_partner || <Tag color="error">Not Provided</Tag>,
    },
    {
      key: 6,
      title: "Active",
      dataIndex: "is_active",
      width: "100px",
      filters: [
        { text: "Yes", value: 1 },
        { text: "No", value: 0 },
      ],
      onFilter: (value: number, record: MIDsPerISO) =>
        record.is_active === value,
      render: (is_active: number) =>
        is_active ? <Tag color="green">Yes</Tag> : <Tag color="error">No</Tag>,
    },
    {
      key: 7,
      title: "Agent",
      dataIndex: "is_referred",
      width: "100px",
      filters: [
        { text: "Yes", value: 1 },
        { text: "No", value: 0 },
      ],
      onFilter: (value: number, record: MIDsPerISO) =>
        record.is_referred === value,
      render: (is_referred: number) =>
        is_referred ? (
          <Tag color="green">Yes</Tag>
        ) : (
          <Tag color="error">No</Tag>
        ),
    },
    {
      key: 8,
      title: "ISO Referral Type",
      dataIndex: "iso_referral_type",
      width: "200px",
      filters: [
        { text: "MID", value: "MID" },
        { text: "Gateway", value: "Gateway" },
        { text: "3rd Party", value: "3rd Party" },
      ],
      onFilter: (value: string | null, record: MIDsPerISO) =>
        record.iso_referral_type === value,
      render: (iso_referral_type: string | null) =>
        iso_referral_type ? (
          <Tag color="blue" style={{ color: "var(--navy-color)" }}>
            {iso_referral_type}
          </Tag>
        ) : (
          <Tag color="error">Not Provided</Tag>
        ),
    },
    {
      key: 9,
      title: "Approval Date",
      dataIndex: "approval_date",
      width: "150px",
      sorter: (a: MIDsPerISO, b: MIDsPerISO) =>
        dayjs(a.approval_date || 0).valueOf() -
        dayjs(b.approval_date || 0).valueOf(),
      render: (approval_date: string | null) =>
        approval_date ? (
          dayjs(approval_date).format("YYYY-MM-DD")
        ) : (
          <Tag color="error">Not Provided</Tag>
        ),
    },
    {
      key: 10,
      title: "Termination Date",
      dataIndex: "closed_date",
      width: "150px",
      sorter: (a: MIDsPerISO, b: MIDsPerISO) =>
        dayjs(a.closed_date || 0).valueOf() -
        dayjs(b.closed_date || 0).valueOf(),
      render: (closed_date: string | null) =>
        closed_date ? (
          dayjs(closed_date).format("YYYY-MM-DD")
        ) : (
          <Tag color="error">Not Provided</Tag>
        ),
    },
  ];

  const handleDownload = () => {
    const formattedData = currentTableData.map((item: MIDsPerISO) => ({
      MID: item?.mid || "-",
      ISO: item?.iso || "-",
      DBA: item?.dba || "-",
      Corporation: item?.corporation || "-",
      "Operating Partner": item?.operating_partner || "-",
      Active: item?.is_active === 1 ? "Yes" : "No",
      Agent: item?.is_referred === 1 ? "Yes" : "No",
      "ISO Referral Type": item?.iso_referral_type || "-",
      "Approval Date": item?.approval_date
        ? dayjs(item.approval_date).format("YYYY-MM-DD")
        : "-",
      "Termination Date": item?.closed_date
        ? dayjs(item.closed_date).format("YYYY-MM-DD")
        : "-",
    }));

    // Create worksheet with the formatted data
    const worksheet = XLSX.utils.json_to_sheet(formattedData || [], {
      header: [
        "MID",
        "ISO",
        "DBA",
        "Corporation",
        "Operating Partner",
        "Active",
        "Agent",
        "ISO Referral Type",
        "Approval Date",
        "Termination Date",
      ],
    });

    // Set column widths
    const columnWidths = [
      { wch: 30 },
      { wch: 30 },
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "MIDs Per ISO");
    XLSX.writeFile(workbook, `MIDs-Per-${selectedIso}.xlsx`);
    message.success("File downloaded successfully");
  };

  if (error) {
    message.error("Error Fetching data");
  }

  return (
    <>
      <h2>MIDs Per ISO</h2>
      <span className="subtitle">
        All MID's of an ISO in victoria over the period of time
      </span>
      <Row>
        <Col xs={24} sm={24} md={12} lg={8}>
          <Select
            size="large"
            placeholder="Select ISO"
            optionLabelProp="label"
            allowClear
            showSearch
            onChange={handleIsoChange}
            filterOption={(input: any, option: any) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            filterSort={(optionA, optionB) =>
              (optionA?.label ?? "")
                .toLowerCase()
                .localeCompare((optionB?.label ?? "").toLowerCase())
            }
            options={uniqueIsos?.map((iso: any) => ({
              value: iso.iso,
              label: iso.iso,
            }))}
          />
        </Col>
      </Row>
      <Row justify="space-between">
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
          _sorter: SorterResult<MIDsPerISO> | SorterResult<MIDsPerISO>[],
          extra: { currentDataSource?: MIDsPerISO[] }
        ) => {
          setCurrentTableData(extra.currentDataSource || []); // Handle optional chaining
        }}
        dataSource={data?.filter((item: MIDsPerISO) => {
          const iso = item.iso || "";
          const dba = item.dba || "";
          const mid = item.mid || "";
          const corporation = item.corporation || "";
          const iso_referral_type = item.iso_referral_type || "";
          return (
            iso?.toLowerCase().includes(searchText?.toLowerCase()) ||
            mid?.toLowerCase().includes(searchText?.toLowerCase()) ||
            corporation?.toLowerCase().includes(searchText?.toLowerCase()) ||
            iso_referral_type
              ?.toLowerCase()
              .includes(searchText?.toLowerCase()) ||
            dba?.toLowerCase().includes(searchText?.toLowerCase())
          );
        })}
        scroll={{ x: 1600 }}
        loading={isLoading}
        columns={columns}
        rowHoverable={false}
      />
    </>
  );
};

export default MidPerIso;
