import { useState } from "react";
import { Col, message, Row, Table, Tag, Input, Tooltip, Modal } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import client from "../../utils/axios";
import Spinner from "../../components/general/Spinner";

const { Search } = Input;

interface Users {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "agent";
}

const ViewUsersPage = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState<string>("");
  const queryClient = useQueryClient();

  const fetchUsersData = async () => {
    const { data } = await client.get<Users[]>("/users");
    return data;
  };

  const { data, error, isLoading } = useQuery("fetchUsersData", fetchUsersData);

  const { mutate: deleteUser, isLoading: deleteUserLoading } = useMutation(
    async ({ id }: { id: number }) => {
      const { data } = await client.delete(`/delete-user`, {
        data: { id }, // Pass the composite key in the request body
      });
      return data;
    },
    {
      onSuccess: () => {
        message.success("User deleted successfully");
        queryClient.invalidateQueries(["fetchUsersData"]); // Refresh logs list
      },
      onError: (error: any) => {
        if (error?.response?.data?.message) {
          message.error(error.response.data.message);
        } else {
          message.error("Failed to delete User. Please try again.");
        }
      },
    }
  );

  const handleDelete = (record: Users) => {
    Modal.confirm({
      title: `Are you sure you want to delete ${record?.name}?`,
      content: `This action cannot be undone.`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        if (record?.id) {
          deleteUser({ id: record.id }); // Pass the composite key
        } else {
          message.error("Error occurred while deleting user");
        }
      },
    });
  };

  const columns: any = [
    {
      key: 1,
      title: "Name",
      dataIndex: "name",
      sorter: (a: Users, b: Users) => a.name.localeCompare(b.name),
      render: (name: string) =>
        name || <Tag color="error">Name Not Provided</Tag>,
    },
    {
      key: 2,
      title: "Role",
      dataIndex: "role",
      filters: [
        { text: "Admin", value: "super_admin" },
        { text: "Agent", value: "agent" },
      ],
      onFilter: (value: string, record: Users) =>
        value === "super_admin"
          ? record?.role === "super_admin"
          : record?.role === "agent",
      render: (role: string) => {
        if (role === "super_admin") return "Admin";
        else if (role === "agent") return "Agent";
        else return <Tag color="error">Role Not Provided</Tag>;
      },
    },
    {
      key: 3,
      title: "Email",
      dataIndex: "email",
      sorter: (a: Users, b: Users) => a.email.localeCompare(b.email),
      render: (email: string) =>
        email || <Tag color="error">Email Not Provided</Tag>,
    },
    {
      key: 4,
      title: "Action",
      width: "100px",
      align: "center",
      render: (record: Users) => (
        <>
          <Tooltip title={"Click to edit user"}>
            <EditOutlined
              style={{
                fontSize: 18,
                color: "var(--primary-color)",
                marginRight: 10,
              }}
              onClick={() => navigate(`/home/users/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title={"Click to delete user"}>
            <DeleteOutlined
              style={{
                fontSize: 18,
                color: "var(--red-color)",
                marginLeft: 10,
              }}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </>
      ),
    },
  ];

  if (error) message.error("Error Fetching records");

  return (
    <>
      <Spinner isLoading={deleteUserLoading} />
      <h2>View Users</h2>
      <span className="subtitle">View all the user's in victoria</span>
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
        dataSource={data?.filter((item: Users) => {
          const name = item.name || "";
          const email = item.email || "";
          const role = item.role || "";
          return (
            name?.toLowerCase().includes(searchText?.toLowerCase()) ||
            email?.toLowerCase().includes(searchText?.toLowerCase()) ||
            role?.toLowerCase().includes(searchText?.toLowerCase())
          );
        })}
        loading={isLoading}
        columns={columns}
        rowHoverable={false}
      />
    </>
  );
};

export default ViewUsersPage;
