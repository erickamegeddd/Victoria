import { useState } from "react";
import { Col, message, Row, Table, Tag, Input, Tooltip, Modal } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import client from "../../utils/axios";
import { isos } from "../../constants/isos";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const { Search } = Input;

interface Iso {
  id: string;
  iso: string;
  referral_type: "MID" | "Gateway" | "3rd Party";
  is_active: number;
}

const ViewIsoPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState<string>("");

  const fetchIsoData = async () => {
    const { data } = await client.get<Iso[]>("/iso");
    return data;
  };

  const { data, error, isLoading } = useQuery("fetchIsoData", fetchIsoData);

  const { mutate: deleteIso, isLoading: deleteIsoLoading } = useMutation(
    async ({ id }: { id: string }) => {
      const { data } = await client.delete(`/iso`, {
        data: { id }, // Pass the composite key in the request body
      });
      return data;
    },
    {
      onSuccess: () => {
        message.success("ISO deleted successfully");
        queryClient.invalidateQueries(["fetchIsoData"]); // Refresh logs list
      },
      onError: (error: any) => {
        if (error?.response?.data?.message) {
          message.error(error.response.data.message);
        } else {
          message.error("Failed to delete ISO. Please try again.");
        }
      },
    },
  );

  const columns: any = [
    {
      key: 1,
      title: "ISO Name",
      dataIndex: "iso",
      sorter: (a: Iso, b: Iso) => a.iso.localeCompare(b.iso),
      render: (iso: string) => iso || <Tag color="error">ISO Not Provided</Tag>,
    },
    {
      key: 2,
      title: "Referral Type",
      dataIndex: "referral_type",
      filters: [
        { text: "MID", value: "MID" },
        { text: "Gateway", value: "Gateway" },
        { text: "3rd Party", value: "3rd Party" },
      ],
      onFilter: (value: string, record: Iso) =>
        value === "MID"
          ? record?.referral_type === "MID"
          : value === "Gateway"
            ? record?.referral_type === "Gateway"
            : record?.referral_type === "3rd Party",
      render: (referral_type: string) => {
        return (
          <Tag color="blue" style={{ color: "var(--navy-color)" }}>
            {referral_type}
          </Tag>
        );
      },
    },
    {
      key: 3,
      title: "Active",
      dataIndex: "is_active",
      filters: [
        { text: "Yes", value: 1 },
        { text: "No", value: 0 },
      ],
      onFilter: (value: number, record: Iso) => record.is_active === value,
      render: (is_active: number) =>
        is_active ? <Tag color="green">Yes</Tag> : <Tag color="error">No</Tag>,
    },
    {
      key: 4,
      title: "Action",
      width: "150px",
      align: "center",
      render: (record: Iso) => (
        <>
          <Tooltip title={"Click to edit record"}>
            <EditOutlined
              style={{
                fontSize: 18,
                color: "var(--primary-color)",
                marginRight: 10,
              }}
              onClick={() => navigate(`/home/iso/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title={"Click to delete record"}>
            <DeleteOutlined
              style={{
                fontSize: 18,
                color: "var(--red-color)",
                cursor: "pointer",
              }}
              onClick={(e) => handleDelete(e, record)}
            />
          </Tooltip>
        </>
      ),
    },
  ];

  const handleDelete = (event: any, record: Iso) => {
    event?.stopPropagation();
    Modal.confirm({
      title: `Are you sure you want to delete "${record.iso}" ISO?`,
      content: `This action cannot be undone.`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        if (record?.id) {
          deleteIso({ id: record.id }); // Pass the composite key
        } else {
          message.error("Incomplete data for the record.");
        }
      },
    });
  };
  const rowClassName = (record: any) => {
    const iso = record.iso?.trim().toLowerCase();

    if (iso?.startsWith("payment")) {
      return "row";
    }

    return !isos.map((i) => i.toLowerCase()).includes(iso)
      ? "iso-match-row row"
      : "row";
  };

  if (error) message.error("Error Fetching records");

  return (
    <>
      <LoadingSpinner isLoading={deleteIsoLoading} />
      <h2>View ISOs</h2>
      <span className="subtitle">View all the ISO's in victoria</span>
      <Row>
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
      </Row>
      <Table
        dataSource={data?.filter((item: Iso) => {
          const iso = item.iso || "";
          const referral_type = item.referral_type || "";
          return (
            iso?.toLowerCase().includes(searchText?.toLowerCase()) ||
            referral_type?.toLowerCase().includes(searchText?.toLowerCase())
          );
        })}
        loading={isLoading}
        columns={columns}
        rowClassName={rowClassName}
        onRow={(record: Iso) => ({
          onClick: () => navigate(`/home/iso/${record?.id}`),
        })}
      />
    </>
  );
};

export default ViewIsoPage;
