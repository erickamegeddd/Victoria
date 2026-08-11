import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import {
  message,
  Upload,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  DatePicker,
} from "antd";
import { useState } from "react";
import client from "../utils/axios"; // Import the custom Axios instance
import { useMutation, useQuery, useQueryClient } from "react-query";
import dayjs from "dayjs";
import MidsNotAddedModal from "./modals/MidsNotAddedModal";

const { Dragger } = Upload;

const ImportDataComponent = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [iso, setIso] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingMIDs, setMissingMIDs] = useState<string[] | null>(null);

  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;

    const formData = new FormData();
    formData.append("file", file as File); // Append the file to the FormData

    try {
      const response = await client.post("/import-data", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data", // Ensure the correct content type for file uploads
        },
      });

      // Reset error states on successful upload
      setErrorMessage("");
      setMissingMIDs([""]);
      queryClient.invalidateQueries("fetchUploadedFiles");
      if (response.data.message) {
        message.success(response.data.message);
      } else {
        message.success(`${file.name} file uploaded successfully.`);
      }

      if (response.data.iso) {
        setIso(response.data.iso);
        setDate(response.data.date);
        setIsModalOpen(true);
      }

      onSuccess && onSuccess(response.data); // Notify Ant Design about successful upload
    } catch (error: any) {
      console.error("Upload error:", error);

      // Extract error message and missing MIDs from the backend response
      const errorResponse = error.response?.data;

      if (errorResponse && errorResponse.error && errorResponse.missing_mids) {
        setErrorMessage(errorResponse.error);
        setMissingMIDs(errorResponse.missing_mids);
        message.error("Missing MIDs");
      } else {
        message.error(`${file.name} file upload failed.`);
      }

      onError && onError(error); // Notify Ant Design about the error
    }
  };

  const props: UploadProps = {
    name: "file",
    multiple: false,
    maxCount: 1,
    showUploadList: { showRemoveIcon: true },
    accept: ".csv,.xlsx,.xls",
    customRequest: handleUpload, // Use custom request handler
  };

  const submitRevenue = async (data: any) => {
    return await client.post("/add-revenue", data);
  };

  const { mutate: handleSubmitRevenue, isLoading: isSubmittingRevenue } =
    useMutation(submitRevenue, {
      onSuccess: () => {
        message.success("Revenue data successfully added!");
      },
      onError: (error: any) => {
        const errorMessage =
          error.response?.data?.error || "Failed to add revenue data.";
        message.error(errorMessage);
      },
    });

  const onFinish = (values: any) => {
    const formattedValues = {
      ...values,
      date: dayjs(values.date).startOf("month").format("YYYY-MM-DD"), // Format the date
    };
    handleSubmitRevenue(formattedValues);
  };

  const onCancel = () => {
    setIsModalOpen(false);
  };

  const fetchThirdPartIsoData = async () => {
    const { data } = await client.get<any[]>("/third-party-iso");
    return data;
  };

  const { data, isLoading } = useQuery(
    "fetchThirdPartIsoData",
    fetchThirdPartIsoData,
  );

  return (
    <>
      <h2>Upload files to import data</h2>
      <Dragger {...props} style={{ marginTop: "10px" }} listType="picture">
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Click or drag file to this area to upload
        </p>
        <p className="ant-upload-hint">
          Upload a single file with extensions .xls, .xlsx, or .csv only.
        </p>
      </Dragger>

      {/* Display error message and missing MIDs if they exist */}
      {errorMessage && (
        <div style={{ marginTop: "20px", color: "red" }}>
          <p>{errorMessage}</p>
          {missingMIDs && missingMIDs.length > 0 && (
            <ul>
              {missingMIDs.map((mid) => (
                <li key={mid}>{mid}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <h2 style={{ marginTop: "20px" }}>Third-Party Referral ISO</h2>
      <span className="subtitle">
        Please select a month and ISO from the dropdown menu, then enter the
        residual amount
      </span>
      <Form
        form={form}
        onFinish={onFinish}
        layout="vertical"
        style={{ marginTop: "20px" }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="Date"
              name="date"
              rules={[{ required: true, message: "Please enter a date!" }]}
            >
              <DatePicker
                format="YYYY-MM"
                size="large"
                picker="month"
                placeholder="Select Date"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="ISO Name"
              name="iso"
              rules={[
                { required: true, message: "Please select an ISO name!" },
              ]}
            >
              <Select
                placeholder="Select ISO name"
                size="large"
                allowClear
                loading={isLoading}
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
                options={data?.map((iso: any) => ({
                  value: iso.iso,
                  label: iso.iso,
                }))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item
              label="PayDiverse Residual"
              name="paydiverse_residual"
              rules={[
                {
                  required: true,
                  message: "Please enter PayDiverse residual!",
                },
              ]}
            >
              <Input
                size="large"
                type="number"
                min={0}
                step="0.01"
                allowClear
                placeholder="Enter residual amount"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Button Row */}
        <Row justify="end" align="middle" style={{ margin: 0 }}>
          <Col>
            <Form.Item>
              <Button
                className="download-btn"
                type="primary"
                htmlType="submit"
                loading={isSubmittingRevenue}
              >
                Submit Form
              </Button>
            </Form.Item>
          </Col>
        </Row>
      </Form>
      {iso && isModalOpen && (
        <MidsNotAddedModal
          open={isModalOpen}
          date={date}
          onCancel={onCancel}
          record={{ iso: iso, id: 1, is_active: 1 }}
        />
      )}
    </>
  );
};

export default ImportDataComponent;
