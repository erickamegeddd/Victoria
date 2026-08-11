import { Form, Input, Button, Row, Col, Select, message, Switch } from "antd";
import { useMutation, useQuery } from "react-query";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import client from "../../utils/axios";

const { Option } = Select;

interface ISOFormValues {
  id?: string | number;
  iso: string;
  is_active: boolean | number;
  role: "MID" | "Gateway" | "3rd Party";
  mid_mapping?: string;
  dba_mapping?: string;
  volume_mapping?: string;
  total_residual_mapping?: string;
  paydiverse_residual_mapping?: string;
}

message.config({
  duration: 2,
  maxCount: 1,
});

const AddIsoPage = () => {
  const { id } = useParams<{ id: string }>();
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [form] = Form.useForm<ISOFormValues>();

  useEffect(() => {
    setIsEdit(id !== "new");
  }, [id]);

  const fetchISOData = async () => {
    const { data } = await client.get(`/iso/${id}`);
    return data;
  };

  useQuery(["fetchISOData", id], fetchISOData, {
    enabled: isEdit, // Only run query if editing
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      // Populate form fields with the fetched data
      form.setFieldsValue({
        ...data,
      });
      if (data?.message) message.success(data?.message);
    },
    onError: () => {
      message.error("Failed to fetch ISO details.");
    },
  });

  const submitISO = async (values: ISOFormValues) => {
    const payload = {
      ...values,
      ...(isEdit ? { id } : {}), // Include id only when editing
    };

    await client.post("/iso", payload);
  };

  const { mutate: handleSubmit, isLoading } = useMutation(submitISO, {
    onSuccess: () => {
      if (isEdit) message.success("ISO updated successfully");
      else {
        message.success("ISO added successfully");
        form.resetFields();
      }
    },
    onError: (error: any) => {
      if (error?.response?.data?.message)
        message.error(error?.response?.data?.message);
      else message.error("Failed to submit ISO details.");
    },
  });

  const onFinish = (values: ISOFormValues) => {
    const payload = {
      ...values,
      is_active: values.is_active ? 1 : 0, // Convert boolean to number
    };
    handleSubmit(payload);
  };

  return (
    <>
      <h2>{isEdit ? "Update ISO" : "Add ISO"}</h2>
      <span className="subtitle">
        Fill the form below to add or edit ISO's in victoria
      </span>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="ISO Name"
              name="iso"
              rules={[
                {
                  required: true,
                  message: "Please input ISO name!",
                },
              ]}
            >
              <Input placeholder="Enter ISO Name" size="large" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="Referral Type"
              name="referral_type"
              rules={[
                { required: true, message: "Please select Referral Type!" },
              ]}
            >
              <Select placeholder="Select Referral Type" size="large">
                <Option value="MID">MID</Option>
                <Option value="Gateway">Gateway</Option>
                <Option value="3rd Party">3rd Party</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="Active"
              name="is_active"
              valuePropName="checked"
              initialValue={true}
              rules={[{ required: true, message: "Is active is required" }]}
            >
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <h2>ISO Mappings</h2>
            <span className="subtitle">
              Fill the form below to map the ISO's mapping in victoria
            </span>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="MID Mapping"
              name="mid_mapping"
              rules={[
                { max: 255, message: "Please enter below 255 characters" },
              ]}
            >
              <Input placeholder="Enter MID Mapping" size="large" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="DBA Mapping"
              name="dba_mapping"
              rules={[
                { max: 255, message: "Please enter below 255 characters" },
              ]}
            >
              <Input placeholder="Enter DBA Mapping" size="large" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="Volume Mapping"
              name="volume_mapping"
              rules={[
                { max: 255, message: "Please enter below 255 characters" },
              ]}
            >
              <Input placeholder="Enter Volume Mapping" size="large" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="Total Residual Mapping"
              name="total_residual_mapping"
              rules={[
                { max: 255, message: "Please enter below 255 characters" },
              ]}
            >
              <Input placeholder="Enter Total Residual Mapping" size="large" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="Paydiverse Residual Mapping"
              name="paydiverse_residual_mapping"
              rules={[
                { max: 255, message: "Please enter below 255 characters" },
              ]}
            >
              <Input
                placeholder="Enter Paydiverse Residual Mapping"
                size="large"
              />
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
                  {isEdit ? "Update" : "Add"}
                </Button>
              </div>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </>
  );
};

export default AddIsoPage;
