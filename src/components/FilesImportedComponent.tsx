import {
  Col,
  DatePicker,
  message,
  Row,
  Table,
  Tag,
  Input,
  Tooltip,
  Modal,
  Spin,
} from "antd";
import type { DatePickerProps } from "antd";
import { DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import client from "../utils/axios";
import { useMutation, useQuery, useQueryClient } from "react-query";
import MidsNotAddedModal from "./modals/MidsNotAddedModal";

const { Search } = Input;

const FilesImportedComponent = () => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [record, setRecord] = useState<{
    iso: string;
    id: number;
    is_active: number;
  }>();
  const [date, setDate] = useState<string | string[]>(
    dayjs().subtract(2, "months").format("YYYY-MM-01")
  );

  const onChange: DatePickerProps["onChange"] = (_, dateString) => {
    const formattedDate = `${dateString}-01`;
    setDate(formattedDate);
  };

  const fetchUploadedFiles = async (date: string | string[]) => {
    const { data } = await client.get(`/uploaded-files`, {
      params: { date },
    });
    return data;
  };

  const { data, error, isLoading } = useQuery(
    ["fetchUploadedFiles", date],
    () => fetchUploadedFiles(date),
    {
      enabled: !!date,
    }
  );

  const fetchUniqueIsoData = async () => {
    const { data } = await client.get<any[]>("/unique-iso");
    return data;
  };

  const { data: uniqueIsos } = useQuery(
    "fetchUniqueIsoData",
    fetchUniqueIsoData
  );

  const isIsoInBoth = (iso: string) => {
    return data?.some((uploadedIso: any) => uploadedIso.iso === iso);
  };

  const columns: any = [
    {
      key: 1,
      title: "ISO",
      dataIndex: "iso",
      sorter: (a: { iso: string }, b: { iso: string }) =>
        a.iso.localeCompare(b.iso),
      render: (iso: string) => iso || <Tag color="error">ISO Not Provided</Tag>,
    },
    {
      key: 2,
      title: "Status",
      dataIndex: "status",
      filters: [
        { text: "Uploaded", value: "uploaded" },
        { text: "Not Uploaded", value: "not_uploaded" },
      ],
      onFilter: (value: string, record: any) =>
        value === "uploaded"
          ? isIsoInBoth(record.iso)
          : !isIsoInBoth(record.iso),
      render: (_: any, record: any) =>
        isIsoInBoth(record.iso) ? (
          <Tag color="green">Uploaded</Tag>
        ) : (
          <Tag color="error">Not Uploaded</Tag>
        ),
    },
    {
      key: 3,
      title: "Active",
      dataIndex: "is_active",
      defaultFilteredValue: [1],
      filters: [
        { text: "Yes", value: 1 },
        { text: "No", value: 0 },
      ],
      onFilter: (value: number, record: any) => record.is_active === value,
      render: (is_active: number) =>
        is_active ? <Tag color="green">Yes</Tag> : <Tag color="error">No</Tag>,
    },
    {
      key: 4,
      title: "Actions",
      align: "center",
      render: (
        _: any,
        record: { iso: string; id: number; is_active: number }
      ) =>
        isIsoInBoth(record.iso) ? (
          <>
            <Tooltip title={"Click to view MIDs not added"}>
              <EyeOutlined
                style={{
                  fontSize: 18,
                  marginRight: 8,
                  color: "var(--primary-color)",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setRecord(record);
                  setIsModalOpen(true);
                }}
              />
            </Tooltip>
            <Tooltip title={"Click to delete report"}>
              <DeleteOutlined
                style={{
                  fontSize: 18,
                  color: "var(--red-color)",
                  cursor: "pointer",
                }}
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          </>
        ) : null,
    },
  ];

  const { mutate: deleteIso, isLoading: deleteIsoLoading } = useMutation(
    async ({ date, iso }: { date: string; iso: string }) => {
      const { data } = await client.delete(`/delete-iso`, {
        data: { date, iso }, // Pass the composite key in the request body
      });
      return data;
    },
    {
      onSuccess: () => {
        message.success("ISO report deleted successfully");
        queryClient.invalidateQueries(["fetchUploadedFiles"]); // Refresh logs list
      },
      onError: (error: any) => {
        if (error?.response?.data?.message) {
          message.error(error.response.data.message);
        } else {
          message.error("Failed to delete ISO report. Please try again.");
        }
      },
    }
  );

  const handleDelete = (record: {
    iso: string;
    id: number;
    is_active: number;
  }) => {
    Modal.confirm({
      title: "Are you sure you want to delete this report?",
      content: `This action cannot be undone.`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        if (date && record?.iso) {
          deleteIso({ date: date as string, iso: record.iso }); // Pass the composite key
        } else {
          message.error("Incomplete data for the record.");
        }
      },
    });
  };

  const onCancel = () => {
    setIsModalOpen(false);
  };

  if (error) message.error("Error Fetching records");

  return (
    <>
      <Spin
        className={
          isLoading || deleteIsoLoading ? `app-loading-wrapper` : "hide"
        }
      />
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
        <Col xs={24} sm={24} md={12} lg={6}>
          <DatePicker
            onChange={onChange}
            picker="month"
            defaultValue={dayjs().subtract(2, "months")}
          />
        </Col>
      </Row>
      <Table scroll={{x:'max-content',y:'calc(100vh - 380px)'}}
        dataSource={uniqueIsos?.filter((item: { iso: string }) => {
          const iso = item.iso || "";
          return iso?.toLowerCase().includes(searchText?.toLowerCase());
        })}
        rowHoverable={false}
        loading={isLoading}
        columns={columns}
        pagination={{
          pageSize: uniqueIsos?.length, // Set to the total number of records
          showSizeChanger: false, // Disable the page size dropdown
        }}
      />
      {isModalOpen && record && (
        <MidsNotAddedModal
          open={isModalOpen}
          onCancel={onCancel}
          record={record}
          date={date}
        />
      )}
    </>
  );
};

export default FilesImportedComponent;
