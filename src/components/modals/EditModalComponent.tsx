import { Modal, Form, Input, Row, Col, message } from "antd";
import { useMutation } from "react-query";
import client from "../../utils/axios";
interface EditModalProps {
  onOk?: () => void;
  onCancel?: () => void;
  record: LogsTableColumns | undefined;
}

const EditModalComponent: React.FC<EditModalProps> = ({
  onCancel,
  onOk,
  record,
}) => {
  const [form] = Form.useForm<LogsTableColumns>();

  const editLog = async (values: LogsTableColumns) => {
    const payload = {
      date: values.date || null,
      iso: values.iso || null,
      mid: values.mid || null,
      dba: values.dba || null,
      volume: values.volume ?? null,
      total_residual: values.total_residual ?? null,
      paydiverse_residual: values.paydiverse_residual ?? null,
      agent1_name: values.agent1_name || null,
      agent1_percentage: values.agent1_percentage ?? null,
      agent1_payout: values.agent1_payout ?? null,
      agent2_name: values.agent2_name || null,
      agent2_percentage: values.agent2_percentage ?? null,
      agent2_payout: values.agent2_payout ?? null,
      old_mid: record?.mid,
    };
    const { data } = await client.post(`/edit-log`, payload);
    return data;
  };

  const { mutate: updateLog, isLoading } = useMutation(editLog, {
    onSuccess: (data: any) => {
      message.success(data.message || "Log updated successfully");
      form.resetFields(); // Reset form fields after successful submission
      if (onOk) onOk(); // Call onOk callback if provided
    },
    onError: (error: any) => {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("Failed to update log. Please try again.");
      }
    },
  });

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        updateLog(values); // Submit the form data after validation
      })
      .catch(() => {});
  };

  return (
    <Modal
      title="Edit Record"
      open={true}
      width={950}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Update"
      confirmLoading={isLoading} // Show loading spinner on the Save button
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={record} // Pre-fill inputs with record data
      >
        <Row gutter={[16, 4]}>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="Date"
              name="date"
              rules={[{ required: true, message: "Please input the date!" }]}
            >
              <Input placeholder="Date" size="large" disabled />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="ISO"
              name="iso"
              rules={[{ required: true, message: "Please input the ISO!" }]}
            >
              <Input placeholder="ISO" size="large" disabled />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="MID"
              name="mid"
              rules={[{ required: true, message: "Please input the MID!" }]}
            >
              <Input placeholder="MID" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="DBA"
              name="dba"
              rules={[{ required: true, message: "Please input the DBA!" }]}
            >
              <Input placeholder="DBA" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="Volume"
              name="volume"
              rules={[{ required: true, message: "Please input the volume!" }]}
            >
              <Input type="number" placeholder="Volume" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="Total Residual"
              name="total_residual"
              rules={[
                { required: true, message: "Please input total residual!" },
              ]}
            >
              <Input type="number" placeholder="Total Residual" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="Paydiverse Residual"
              name="paydiverse_residual"
              rules={[
                {
                  required: true,
                  message: "Please input paydiverse residual!",
                },
              ]}
            >
              <Input
                type="number"
                placeholder="Paydiverse Residual"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item label="Agent 1 Name" name="agent1_name">
              <Input placeholder="Agent 1 Name" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item label="Agent 1 Percentage" name="agent1_percentage">
              <Input
                type="number"
                placeholder="Agent 1 Percentage"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item label="Agent 1 Payout" name="agent1_payout">
              <Input type="number" placeholder="Agent 1 Payout" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item label="Agent 2 Name" name="agent2_name">
              <Input placeholder="Agent 2 Name" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item label="Agent 2 Percentage" name="agent2_percentage">
              <Input
                type="number"
                placeholder="Agent 2 Percentage"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item label="Agent 2 Payout" name="agent2_payout">
              <Input type="number" placeholder="Agent 2 Payout" size="large" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default EditModalComponent;
