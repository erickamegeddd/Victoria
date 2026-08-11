import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Button,
  Row,
  Col,
  message,
  notification,
  Tooltip,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "react-query";
import client from "../utils/axios";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const { Option } = Select;

const MerchantPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mid } = useParams<{ mid: string }>();
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [isReferred, setIsReferred] = useState<boolean>(false); // Track referred state
  const [form] = Form.useForm();

  useEffect(() => {
    setIsEdit(mid !== "new");
  }, [mid]);

  // Fetch merchant data based on MID
  const fetchMerchantData = async () => {
    const { data } = await client.get(`/merchants/${mid}`);
    return data;
  };

  const { data, isLoading } = useQuery(
    ["fetchMerchantData", mid],
    fetchMerchantData,
    {
      enabled: isEdit, // Only run query if editing
      onError: () => {
        message.error("Failed to fetch merchant details.");
      },
    }
  );

  useEffect(() => {
    form.setFieldsValue({
      ...data,
      approval_date: data?.approval_date ? dayjs(data.approval_date) : null,
      closed_date: data?.closed_date ? dayjs(data.closed_date) : null,
      revenue_month: data?.revenue_month
        ? dayjs(data.revenue_month)
        : data?.approval_date
        ? dayjs(data.approval_date)
        : null,
    });
    setIsReferred(data?.is_referred || false);
  }, [data]);

  const submitMerchant = async (values: any) => {
    const payload = {
      ...values,
      operating_partner: values.operating_partner
        ? values.operating_partner
        : null,
      is_referred: values.is_referred ? 1 : 0, // Convert boolean to 1/0
      approval_date: values.approval_date
        ? dayjs(values.approval_date).format("YYYY-MM-DD")
        : null,
      closed_date: values.closed_date
        ? dayjs(values.closed_date).format("YYYY-MM-DD")
        : null,
      revenue_month: values.revenue_month
        ? dayjs(values.revenue_month).format("YYYY-MM")
        : null,
    };

    if (payload.agent2_split === "" || values.agent2_split == null) {
      delete payload.agent2_split;
    }

    if (payload.agent1_split === "" || values.agent1_split == null) {
      delete payload.agent1_split;
    }

    if (isEdit) {
      // Update existing merchant
      await client.post(`/merchants`, payload);
    } else {
      // Add new merchant
      await client.post("/merchants", payload);
    }
  };

  const { mutate: handleSubmit, isLoading: isSubmitting } = useMutation(
    submitMerchant,
    {
      onSuccess: () => {
        message.success(
          isEdit
            ? "Merchant updated successfully"
            : "Merchant added successfully"
        );
        queryClient.invalidateQueries(["fetchMerchantsData"]); // Refresh Merchants list
        navigate("/home/merchants"); // Navigate back to merchant list
      },
      onError: () => {
        message.error("Failed to submit merchant details.");
      },
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

  const fetchUniqueAgentsData = async () => {
    const { data } = await client.get<any[]>("/unique-agent-name");
    return data;
  };

  const { data: uniqueAgents } = useQuery(
    "fetchUniqueAgentsData",
    fetchUniqueAgentsData,
    {}
  );

  const fetchUniqueSicCodesData = async () => {
    const { data } = await client.get<any[]>("/sic-codes");
    return data;
  };

  const { data: uniqueSicCodes } = useQuery(
    "fetchUniqueSicCodesData",
    fetchUniqueSicCodesData,
    {
      staleTime: Infinity, // Data is considered fresh forever (will not refetch)
      cacheTime: Infinity, // Keeps data in cache indefinitely
    }
  );

  const handleSicCodeChange = (
    value: string,
    option: { label: string } | { label: string }[]
  ) => {
    const selectedOption = Array.isArray(option) ? option[0] : option; // Handle multiple mode safely
    form.setFieldsValue({
      sic_code: value,
      sic_description: selectedOption?.label || "",
    });
  };

  const onFinish = (values: any) => {
    if (values.approval_date == null && values.agent1_name) {
      notification.warning({
        message: "Warning",
        description:
          "Please add merchant approval date if adding agent as well",
      });
      return;
    }

    handleSubmit(values);
  };

  const handleFormChange = (changedValues: any) => {
    if ("is_referred" in changedValues) {
      setIsReferred(changedValues.is_referred); // Update referred state
    }
  };

  return (
    <>
      <LoadingSpinner isLoading={isLoading || isSubmitting} />
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={handleFormChange}
        initialValues={{
          mid: mid === "new" ? undefined : mid,
          is_active: true,
          is_referred: false,
        }}
        style={{ maxWidth: "100%" }}
      >
        <Row justify="space-between" align="middle" style={{ margin: 0 }}>
          <h2>{isEdit ? "Update" : "New"} Merchant</h2>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isSubmitting}
            >
              {isEdit ? "Update" : "Add"}
            </Button>
          </Form.Item>
        </Row>

        {/* Standard Fields */}
        <Row gutter={[16, 4]} style={{ margin: 0 }}>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="MID"
              name="mid"
              rules={[
                { required: true, message: "MID is required" },
                {
                  pattern: /^[0-9]*$/,
                  message: "MID must be a numeric value",
                },
              ]}
            >
              <Input
                disabled={isEdit}
                placeholder="Enter MID"
                size="large"
                onChange={(e) => {
                  const sanitizedValue = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
                  form.setFieldsValue({ mid: sanitizedValue }); // Update form field
                }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="ISO"
              name="iso"
              rules={[{ required: true, message: "ISO is required" }]}
            >
              {/* <Input placeholder="Enter ISO" size="large" /> */}
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
                  value: iso.iso,
                  label: iso.iso,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="DBA"
              name="dba"
              rules={[{ required: true, message: "DBA is required" }]}
            >
              <Input placeholder="Enter DBA" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="Corporation"
              name="corporation"
              rules={[{ required: true, message: "Corporation is required" }]}
            >
              <Input placeholder="Enter Corporation" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item label="Operating Partner" name="operating_partner">
              <Input placeholder="Enter Operating Partner" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Form.Item
              label="Active"
              name="is_active"
              valuePropName="checked"
              rules={[{ required: true, message: "Is active is required" }]}
            >
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Form.Item
              label="Agent"
              name="is_referred"
              valuePropName="checked"
              rules={[{ required: true, message: "Agent is required" }]}
            >
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>
        </Row>

        {/* Agent Fields */}
        {isReferred && (
          <Row gutter={[16, 4]} style={{ margin: 0 }}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                label="Agent 1 Name"
                name="agent1_name"
                rules={[
                  { required: true, message: "Agent 1 Name is required" },
                ]}
              >
                <Select
                  size="large"
                  placeholder="Select Agent Name"
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
                  options={uniqueAgents?.map((agent: any) => ({
                    value: agent.agent_name,
                    label: agent.agent_name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                label="Agent 1 Split"
                name="agent1_split"
                rules={[
                  { required: true, message: "Agent 1 Split is required" },
                ]}
              >
                <Input placeholder="Enter Agent 1 Split" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={8}></Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item label="Agent 2 Name" name="agent2_name">
                <Select
                  size="large"
                  placeholder="Select Agent Name"
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
                  options={uniqueAgents?.map((agent: any) => ({
                    value: agent.agent_name,
                    label: agent.agent_name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item label="Agent 2 Split" name="agent2_split">
                <Input placeholder="Enter Agent 2 Split" size="large" />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* ISO Referral Type */}
        <Row gutter={[16, 4]} style={{ margin: 0 }}>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="ISO Referral Type"
              name="iso_referral_type"
              rules={[
                { required: true, message: "ISO Referral Type is required" },
              ]}
            >
              <Select placeholder="Select ISO Referral Type" size="large">
                <Option value="MID">MID</Option>
                <Option value="Gateway">Gateway</Option>
                <Option value="3rd Party">3rd Party</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item label="Approval Date" name="approval_date">
              <DatePicker
                style={{ width: "100%" }}
                format="YYYY-MM-DD"
                size="large"
                placeholder="Select Approval Date"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item label="Termination Date" name="closed_date">
              <DatePicker
                style={{ width: "100%" }}
                format="YYYY-MM-DD"
                size="large"
                placeholder="Select Termination Date"
                disabledDate={(current) => {
                  const approvalDate = form.getFieldValue("approval_date");
                  return (
                    current &&
                    approvalDate &&
                    current.isBefore(approvalDate, "day")
                  );
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label={
                <>
                  <span>Revenue Month</span>
                  <Tooltip
                    title={`By selecting a month here, the agent's payout for this MID will start from the chosen month onward and not include any previous months.`}
                  >
                    <InfoCircleOutlined
                      style={{
                        fontSize: 16,
                        marginLeft: 7,
                        color: "var(--primary-color)",
                      }}
                    />
                  </Tooltip>
                </>
              }
              name="revenue_month"
              dependencies={["approval_date"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const approvalDate = getFieldValue("approval_date");
                    if (approvalDate && !value) {
                      return Promise.reject(
                        "Revenue Month is required when approval date is selected"
                      );
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <DatePicker
                picker="month"
                style={{ width: "100%" }}
                allowClear={false}
                format="YYYY-MM"
                placeholder="Select Revenue Month"
                disabledDate={(current) => {
                  const approvalDate = form.getFieldValue("approval_date");
                  if (!approvalDate) return false;
                  return current.isBefore(dayjs(approvalDate).startOf("month"));
                }}
              />
            </Form.Item>
          </Col>

          {/* SIC Code Fields */}
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="SIC/MCC Code"
              name="sic_code"
              rules={[
                {
                  required: true,
                  message: "SIC/MCC Code is required",
                },
              ]}
            >
              <Select
                size="large"
                placeholder="Select SIC/MCC Code"
                optionLabelProp="value" // Change from "label" to "value"
                allowClear
                showSearch
                onChange={handleSicCodeChange}
                filterOption={(input: any, option: any) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase()) ||
                  (option?.value ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase()) ||
                  (option?.iso ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                filterSort={(optionA, optionB) =>
                  (optionA?.label ?? "")
                    .toLowerCase()
                    .localeCompare((optionB?.label ?? "").toLowerCase())
                }
              >
                {uniqueSicCodes?.map(
                  (
                    opt: { sic_code: string; description: string },
                    index: number
                  ) => (
                    <Option
                      key={index}
                      value={opt.sic_code}
                      label={opt.description}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div>
                          <div style={{ color: "black" }}>{opt.sic_code}</div>
                          <div style={{ fontSize: "13px", color: "grey" }}>
                            Description: {opt.description}
                          </div>
                        </div>
                      </div>
                    </Option>
                  )
                )}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item label="SIC Code Description" name="sic_description">
              <Input placeholder="SIC Code Description" size="large" disabled />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </>
  );
};

export default MerchantPage;
