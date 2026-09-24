// @ts-nocheck
import { useState, useEffect } from "react";
import { Table, Tag, Button, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const ViewUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/agent-adjustments?action=list_users")
      .then(r => r.json())
      .then(d => {
        const list = d.users || (Array.isArray(d) ? d : []);
        setUsers(list);
      })
      .catch(() => message.error("Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const columns = [
    {
      title: "Email", dataIndex: "email", width: 280, ellipsis: true,
      render: v => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    {
      title: "Status", dataIndex: "email_confirmed_at", width: 120,
      render: v => v ? <Tag color="success">Confirmed</Tag> : <Tag color="warning">Pending</Tag>,
    },
    {
      title: "Last Sign In", dataIndex: "last_sign_in_at", width: 180,
      render: v => v ? dayjs(v).format("MMM D, YYYY h:mm A") : <span style={{ color: "rgba(255,255,255,0.35)" }}>Never</span>,
      sorter: (a, b) => (a.last_sign_in_at||"").localeCompare(b.last_sign_in_at||""),
      defaultSortOrder: "descend",
    },
    {
      title: "Created", dataIndex: "created_at", width: 140,
      render: v => dayjs(v).format("MMM D, YYYY"),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Dashboard Users</h2>
          <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 13 }}>
            {users.length} user{users.length !== 1 ? "s" : ""} with access to Victoria
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load} size="small">Refresh</Button>
      </div>
      <Table columns={columns} dataSource={users} rowKey="id" loading={loading}
        size="small" pagination={false} locale={{ emptyText: "No users found" }} />
    </>
  );
};

export default ViewUsersPage;
