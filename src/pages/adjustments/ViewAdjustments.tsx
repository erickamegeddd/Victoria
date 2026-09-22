// @ts-nocheck
import { useState, useEffect } from "react";
import { Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, Popconfirm, Tag } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const ViewAdjustments = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { fetchAdjustments(); }, []);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent-adjustments");
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      message.error("Failed to load adjustments");
    } finally {
      setLoading(false);
    }
  };

  const addAdjustment = async (values) => {
    setSaving(true);
    try {
      const res = await fetch("/api/agent-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, report_month: values.report_month?.format("YYYY-MM-01") }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      message.success("Adjustment added");
      setModalOpen(false);
      form.resetFields();
      fetchAdjustments();
    } catch (e) {
      message.error(e.message || "Failed to add adjustment");
    } finally {
      setSaving(false);
    }
  };

  const deleteAdjustment = async (id) => {
    try {
      await fetch("/api/agent-adjustments?id=" + id, { method: "DELETE" });
      message.success("Deleted");
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch {
      message.error("Failed to delete");
    }
  };

  const columns = [
    {
      title: "Agent", dataIndex: "agent_name", width: 140,
      sorter: (a, b) => (a.agent_name||"").localeCompare(b.agent_name||""),
      filters: [...new Set(records.map(r => r.agent_name).filter(Boolean))].sort().map(n => ({ text: n, value: n })),
      onFilter: (v, r) => r.agent_name === v,
      render: v => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    {
      title: "Month", dataIndex: "report_month", width: 100,
      sorter: (a, b) => (a.report_month||"").localeCompare(b.report_month||""),
      render: v => dayjs(v).format("MMM YYYY"),
    },
    { title: "MID", dataIndex: "mid", width: 130, render: v => v || <span style={{ color: "rgba(255,255,255,0.3)" }}>-</span> },
    { title: "Field", dataIndex: "field_name", width: 140, render: v => <Tag color="blue">{v}</Tag> },
    {
      title: "Original", dataIndex: "original_value", width: 110,
      render: v => v != null ? <span style={{ color: "#f87171" }}>${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> : "-",
    },
    {
      title: "Adjusted", dataIndex: "adjusted_value", width: 110,
      render: v => <span style={{ color: "#4ade80", fontWeight: 600 }}>${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>,
    },
    { title: "Notes", dataIndex: "notes", ellipsis: true },
    { title: "Created", dataIndex: "created_at", width: 110, render: v => dayjs(v).format("MMM D, YYYY") },
    {
      title: "", width: 60,
      render: (_, r) => (
        <Popconfirm title="Delete this adjustment?" onConfirm={() => deleteAdjustment(r.id)} okText="Delete" okButtonProps={{ danger: true }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Agent Adjustments</h2>
          <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 13 }}>
            {records.length} adjustment{records.length !== 1 ? "s" : ""} - manual corrections to agent payout data
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ background: "#0f2040" }}>
          Add Adjustment
        </Button>
      </div>

      <Table columns={columns} dataSource={records} rowKey="id" loading={loading} size="small"
        pagination={{ pageSize: 25, showSizeChanger: false }} scroll={{ x: 900, y: "calc(100vh - 300px)" }}
        locale={{ emptyText: "No adjustments recorded yet" }} />

      <Modal open={modalOpen} title="Add Agent Adjustment"
        onCancel={() => { setModalOpen(false); form.resetFields(); }} footer={null} width={520}>
        <Form form={form} layout="vertical" onFinish={addAdjustment} style={{ marginTop: 16 }}>
          <Form.Item name="agent_name" label="Agent Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. John Smith" />
          </Form.Item>
          <Form.Item name="report_month" label="Month" rules={[{ required: true }]}>
            <DatePicker picker="month" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="mid" label="MID (optional)">
            <Input placeholder="Merchant ID if applicable" />
          </Form.Item>
          <Form.Item name="field_name" label="Field Being Adjusted" rules={[{ required: true }]}>
            <Select placeholder="Select field">
              <Select.Option value="commission_pct">Commission %</Select.Option>
              <Select.Option value="net_revenue">Net Revenue</Select.Option>
              <Select.Option value="paydiversenet">PayDiverse Net</Select.Option>
              <Select.Option value="bonus">Bonus</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>
          <div style={{ display: "flex", gap: 12 }}>
            <Form.Item name="original_value" label="Original Value" style={{ flex: 1 }}>
              <InputNumber style={{ width: "100%" }} prefix="$" precision={2} />
            </Form.Item>
            <Form.Item name="adjusted_value" label="Adjusted Value" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber style={{ width: "100%" }} prefix="$" precision={2} />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Reason for adjustment..." />
          </Form.Item>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving} style={{ background: "#0f2040" }}>Save Adjustment</Button>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default ViewAdjustments;
