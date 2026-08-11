import {
  Form,
  DatePicker,
  Button,
  Row,
  Col,
  Select,
  message,
  Input,
} from "antd";
import { useMutation, useQuery } from "react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import client from "../../utils/axios";
import dayjs from "dayjs";

interface AdjustmentsFormValues {
  iso_id: number;
  date: string;
  adjustment_price: string;
}

message.config({
  duration: 2,
  maxCount: 1,
});

const AddAdjustments = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [form] = Form.useForm<AdjustmentsFormValues>();

  useEffect(() => {
    setIsEdit(id !== "new");
  }, [id]);

  const fetchUniqueIsoData = async () => {
    const { data } = await client.get<any[]>("/unique-iso");
    return data;
  };

  const { data: uniqueIsos } = useQuery(
    "fetchUniqueIsoData",
    fetchUniqueIsoData
  );

  const fetchAdjustmentData = async () => {
    const { data } = await client.get(`/adjustments/${id}`);
    return data;
  };

  useQuery(["fetchAdjustmentData", id], fetchAdjustmentData, {
    enabled: isEdit, // Only run query if editing
    onSuccess: (data) => {
      // Populate form fields with the fetched data
      form.setFieldsValue({
        ...data,
        date: data.date ? dayjs(data.date, "YYYY-MM-DD") : null,
      });
      if (data?.message) message.success(data?.message);
      else message.success("Record fetched successfully");
    },
    onError: () => {
      message.error("Failed to fetch Adjustment details.");
    },
  });

  const submitAdjustment = async (values: AdjustmentsFormValues) => {
    const payload = {
      ...values,
      ...(isEdit ? { id } : {}), // Include id only when editing
    };

    await client.post("/adjustments", payload);
  };

  const { mutate: handleSubmit, isLoading } = useMutation(submitAdjustment, {
    onSuccess: () => {
      if (isEdit) message.success("Adjustment updated successfully");
      else {
        message.success("Adjustment added successfully");
        form.resetFields();
        navigate("/home/adjustments");
      }
    },
    onError: (error: any) => {
      if (error?.response?.data?.message)
        message.warning(error?.response?.data?.message);
      else message.error("Failed to submit Adjustment details.");
    },
  });

  const onFinish = (values: AdjustmentsFormValues) => {
    values.date = dayjs(values.date).format("YYYY-MM-01");
    handleSubmit(values);
  };

  return (
    <>
      <h2>{isEdit ? "Update Adjustment" : "Add Adjustment"}</h2>
      <span className="subtitle">
        Fill the form below to add or edit Adjustment in revenue
      </span>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          <Col xs={24} lg={8}>
            <Form.Item
              label="ISO Name"
              name="iso_id"
              rules={[
                {
                  required: true,
                  message: "Please Select ISO!",
                },
              ]}
            >
              <Select
                size="large"
                placeholder="Select ISO"
                optionLabelProp="label"
                allowClear
                showSearch
                filterOption={(input: any, option: any) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                filterSort={(optionA, optionB) =>
                  (optionA?.label ?? "")
                    .toLowerCase()
                    .localeCompare((optionB?.label ?? "").toLowerCase())
                }
                options={uniqueIsos?.map((iso: any) => ({
                  value: iso.id,
                  label: iso.iso,
                }))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={8}>
            <Form.Item
              label="Date"
              name="date"
              rules={[{ required: true, message: "Please select Date!" }]}
            >
              <DatePicker
                size="large"
                picker="month"
                placeholder="Select Date"
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={8}>
            <Form.Item
              label="Adjustment Price"
              name="adjustment_price"
              rules={[
                {
                  required: true,
                  message: "Please input the Adjustment Price!",
                },
                {
                  pattern: /^-?\d+(\.\d{1,2})?$/,
                  message: "Enter a valid price (e.g., -123.45 or 123.45)",
                },
              ]}
            >
              <Input placeholder="Adjustment Price" size="large" />
            </Form.Item>
          </Col>

          {/* Submit Button aligned to the right */}
          <Col span={24}>
            <Form.Item>
              <div style={{ textAlign: "right" }}>
                <Button
                  className="download-btn"
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={isLoading}
                >
                  {isEdit ? "Edit" : "Add"}
                </Button>
              </div>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </>
  );
};

export default AddAdjustments;
