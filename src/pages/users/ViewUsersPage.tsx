// @ts-nocheck
import { useState, useEffect } from "react";
import { Table, Tag, Button, Modal, Input, message } from "antd";
import { ReloadOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const ViewUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const saveEmail = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/agent-adjustments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_user_email", user_id: editUser.id, email: newEmail }) });
      const d = await r.json();
      if (!r.ok) { message.error(d.error || "Could not update email"); return; }
      message.success("Login email updated to " + d.email);
      let me = null;
      try { me = JSON.parse(localStorage.getItem("user") || "null"); } catch { /* ignore */ }
      if (me && me.email === editUser.email) {
        localStorage.setItem("user", JSON.stringify({ ...me, email: d.email }));
        message.info("You changed your own login. Use the new email the next time you sign in.", 6);
      }
      setEditUser(null);
      load();
    } catch { message.error("Could not update email"); }
    finally { setSaving(false); }
  };

  const removeUser = (u) => {
    Modal.confirm({
      title: "Remove this user permanently?",
      icon: <DeleteOutlined style={{ color: "#dc2626" }} />,
      content: <div><p><b>{u.email}</b> will lose access to Victoria right away.</p><p style={{ color: "#dc2626", marginBottom: 0 }}>This is final and cannot be undone. To give them access again you would have to create a new account.</p></div>,
      okText: "Yes, remove permanently", okType: "danger", cancelText: "Cancel",
      onOk: async () => {
        try {
          const r = await fetch("/api/agent-adjustments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_user", user_id: u.id, confirm: true }) });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) { message.error(d.error || "Could not remove user"); return; }
          message.success(u.email + " was removed");
          load();
        } catch { message.error("Could not remove user"); }
      },
    });
  };

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
    { title: "Name", width: 180, render: (_, r) => (r.user_metadata && r.user_metadata.name) || "--" },
    { title: "Role", width: 100, render: (_, r) => { const x = (r.app_metadata && r.app_metadata.role) || (r.user_metadata && r.user_metadata.role) || "--"; return <Tag>{x === "super_admin" ? "admin" : x}</Tag>; } },
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
    { title: "", width: 120, render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => { setEditUser(r); setNewEmail(r.email || ""); }}>Edit email</Button> },
    { title: "", width: 110, render: (_, r) => { let me = null; try { me = JSON.parse(localStorage.getItem("user") || "null"); } catch { /* ignore */ } const own = !!me && me.email === r.email; return <Button size="small" danger icon={<DeleteOutlined />} disabled={own} title={own ? "You cannot remove your own account" : ""} onClick={() => removeUser(r)}>Remove</Button>; } },
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
      <Modal open={!!editUser} title="Change login email" onCancel={() => setEditUser(null)} onOk={saveEmail} okText="Save" confirmLoading={saving}
        okButtonProps={{ disabled: !newEmail.trim() || newEmail.trim().toLowerCase() === (editUser && editUser.email) }}>
        <p style={{ color: "#6b7280", fontSize: 13 }}>Current: <b>{editUser && editUser.email}</b>. The password stays the same; the user signs in with the new email from now on.</p>
        <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} onPressEnter={saveEmail} placeholder="new email" />
      </Modal>
    </>
  );
};

export default ViewUsersPage;
