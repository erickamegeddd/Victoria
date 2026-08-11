import { Modal, Form, Input, Row, Col, message } from "antd";
import { useMutation } from "react-query";
import client from "../../utils/axios";

interface AddModalProps {
  onOk?: () => void;
  onCancel?: () => void;
  record: PaymentsColumns | undefined;
  date: string;
}

interface PaymentProps {
  bank_amount: string | number;
}

const AddModalComponent: React.FC<AddModalProps> = ({
  onCancel,
  onOk,
  record,
  date,
}) => {
  const [form] = Form.useForm<PaymentProps>();
  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        updatePayment(values); // Submit the form data after validation
      })
      .catch(() => {});
  };

  const editPayment = async (values: PaymentProps) => {
    const payload = {
      iso_id: record?.id,
      date: date,
      bank_amount: values.bank_amount,
    };
    const { data } = await client.post(`/payments`, payload);
    return data;
  };

  const { mutate: updatePayment, isLoading } = useMutation(editPayment, {
    onSuccess: (data: any) => {
      message.success(data.message || "Amount updated successfully");
      form.resetFields(); // Reset form fields after successful submission
      if (onOk) onOk(); // Call onOk callback if provided
    },
    onError: (error: any) => {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("Failed to update amount. Please try again.");
      }
    },
  });
  return (
    <>
      <Modal
        title="Add/Update Bank Amount"
        open={true}
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
            <Col span={24}>
              <Form.Item
                label="Amount Deposited in Bank"
                name="bank_amount"
                rules={[
                  {
                    required: true,
                    message: "Please input bank amount!",
                  },
                ]}
              >
                <Input
                  type="number"
                  min={0}
                  placeholder="Bank Amount"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};
export default AddModalComponent;
