import {
  Col,
  Row,
  Input,
  DatePicker,
  message,
  Table,
  Select,
  Button,
} from "antd";
import LoadingSpinner from "./ui/LoadingSpinner";
import { useEffect, useRef, useState } from "react";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery } from "react-query";
import client from "../utils/axios";
import { Link } from "react-router-dom";
import { MdArrowOutward } from "react-icons/md";

const { RangePicker } = DatePicker;

interface Merchant {
  mid: string;
  dba: string;
  iso: string;
  corporation: string;
  approval_date: string;
  missing_month?: string;
  status: "Not uploaded";
}

interface ApiResponse {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
  merchants: Merchant[];
}

const MidsNotUploaded = () => {
  const searchInputRef = useRef<any>(null);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<string | undefined>();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIso, setSelectedIso] = useState<string | undefined>();
  const [isFileDownloading, setIsFileDonwloading] = useState<boolean>(false);

  const defaultEndDate = dayjs().subtract(2, "month").startOf("month");
  const defaultStartDate = dayjs().subtract(2, "month").startOf("month");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 🔁 Debounce logic (2 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
      setPage(1); // reset page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Focus after searchQuery changes
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [debouncedSearch]);

  const handleDateChange = (_: any, dateString: [string, string]) => {
    setStartDate(dateString[0] ? `${dateString[0]}-01` : "");
    setEndDate(dateString[1] ? `${dateString[1]}-01` : "");
    setPage(1); // reset pagination on filter change
  };

  const fetchNotUploadedMidsData = async () => {
    const { data } = await client.get<ApiResponse>("/mids-not-uploaded", {
      params: {
        start_date: startDate || defaultStartDate.format("YYYY-MM-DD"),
        end_date: endDate || defaultEndDate.format("YYYY-MM-DD"),
        search: debouncedSearch || undefined,
        page,
        iso: selectedIso || undefined,
        limit: pageSize,
      },
    });
    return data;
  };

  const { data, isLoading, isFetching, error } = useQuery(
    [
      "fetchNotUploadedMidsData",
      startDate,
      debouncedSearch,
      selectedIso,
      endDate,
      page,
      pageSize,
    ],
    fetchNotUploadedMidsData,
    {
      refetchOnWindowFocus: false,
    },
  );

  const fetchUniqueIsoData = async () => {
    const { data } = await client.get<any[]>("/unique-iso");
    return data;
  };

  const { data: uniqueIsos } = useQuery(
    "fetchUniqueIsoData",
    fetchUniqueIsoData,
    { refetchOnWindowFocus: false },
  );

  const columns = [
    {
      title: "MID",
      dataIndex: "mid",
      sorter: (a: any, b: any) => {
        if (a.mid && b.mid) {
          return a.mid.localeCompare(b.mid); // Sort alphabetically if both values exist
        }
        return a.mid ? -1 : 1; // Sort non-empty values first
      },
      render: (mid: string) => (
        <Link to={`/home/merchants/${mid}`}>
          {mid}
          <MdArrowOutward style={{ marginLeft: 5 }} />
        </Link>
      ),
    },
    {
      title: "DBA",
      dataIndex: "dba",
      sorter: (a: any, b: any) => {
        if (a.dba && b.dba) {
          return a.dba.localeCompare(b.dba); // Sort alphabetically if both values exist
        }
        return a.dba ? -1 : 1; // Sort non-empty values first
      },
    },
    {
      title: "ISO",
      dataIndex: "iso",
      sorter: (a: any, b: any) => {
        if (a.iso && b.iso) {
          return a.iso.localeCompare(b.iso); // Sort alphabetically if both values exist
        }
        return a.iso ? -1 : 1; // Sort non-empty values first
      },
    },
    {
      title: "Corporation",
      dataIndex: "corporation",
      sorter: (a: any, b: any) => {
        if (a.corporation && b.corporation) {
          return a.corporation.localeCompare(b.corporation); // Sort alphabetically if both values exist
        }
        return a.corporation ? -1 : 1; // Sort non-empty values first
      },
      render: (v: string) => v || "-",
    },
    {
      title: "Approval Date",
      dataIndex: "approval_date",
      sorter: (a: any, b: any) =>
        dayjs(a?.approval_date).unix() - dayjs(b?.approval_date).unix(),
      render: (d: string) => dayjs(d).format("YYYY-MM-DD"),
    },
    {
      title: "Missing Month",
      dataIndex: "missing_month",
      sorter: (a: any, b: any) =>
        dayjs(a?.missing_month).unix() - dayjs(b?.missing_month).unix(),
      render: (d: string) => dayjs(d).format("YYYY-MM"),
    },
  ];

  if (error) message.error("Error fetching MIDs");

  return (
    <>
      <LoadingSpinner
        isLoading={isLoading || isFetching || isFileDownloading}
      />

      <Row justify="space-between">
        <Col span={8}>
          <Input.Search
            ref={searchInputRef}
            placeholder="Search"
            allowClear
            size="large"
            enterButton
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>

        <Col span={8} style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="primary"
            size="large"
            onClick={async () => {
              setIsFileDonwloading(true);
              try {
                const response = await client.get("/mids-not-uploaded-export", {
                  params: {
                    start_date:
                      startDate || defaultStartDate.format("YYYY-MM-DD"),
                    end_date: endDate || defaultEndDate.format("YYYY-MM-DD"),
                    search: debouncedSearch || undefined,
                    iso: selectedIso || undefined,
                    sort_field: sortField,
                    sort_order: sortOrder,
                  },
                  responseType: "blob", // ✅ REQUIRED for streaming
                });

                const blob = new Blob([response.data], {
                  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                });

                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute(
                  "download",
                  `MIDs Not Uploaded ${startDate || defaultStartDate.format("YYYY-MM-DD")} - ${
                    endDate || defaultEndDate.format("YYYY-MM-DD")
                  }.xlsx`,
                );

                document.body.appendChild(link);
                link.click();
                link.remove();

                window.URL.revokeObjectURL(url); // ✅ cleanup
                setIsFileDonwloading(false);
                message.success("File downloaded successfully");
              } catch (error: any) {
                setIsFileDonwloading(false);
                message.error(
                  error?.response?.data?.error ||
                    "Failed to download file. Please try again.",
                );
              }
            }}
          >
            Download as XLSX <DownloadOutlined />
          </Button>
        </Col>
      </Row>
      <Row justify="space-between">
        <Col xs={24} sm={24} md={12} lg={8} xl={8} xxl={8}>
          <Select
            size="large"
            placeholder="Select ISO"
            optionLabelProp="label"
            allowClear
            showSearch
            value={selectedIso}
            onChange={(value) => {
              setSelectedIso(value);
              setPage(1); // reset pagination when ISO changes
            }}
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
        <Col xs={24} sm={24} md={12} lg={8} xl={8} xxl={8}>
          <RangePicker
            picker="month"
            onChange={handleDateChange}
            defaultValue={[defaultStartDate, defaultEndDate]}
          />
        </Col>
      </Row>

      <Table sticky
        loading={isLoading || isFetching}
        columns={columns}
        dataSource={data?.merchants || []}
        rowKey={(r) => `${r.mid}-${r.missing_month}`}
        onChange={(_, __, sorter: any) => {
          if (sorter?.field) {
            setSortField(sorter.field);
            setSortOrder(sorter.order); // "ascend" | "descend"
          } else {
            setSortField(undefined);
            setSortOrder(undefined);
          }
        }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total_records,
          showSizeChanger: true,
          onChange: (p, size) => {
            setPage(p);
            setPageSize(size);
          },
        }}
        scroll={{x:768,y:'calc(100vh - 380px)'}}
      />
    </>
  );
};

export default MidsNotUploaded;
