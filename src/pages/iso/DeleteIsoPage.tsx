import { useState } from "react";
import type { DatePickerProps } from "antd";
import { Col, Row, DatePicker, Select, Button, message } from "antd";
import dayjs from "dayjs";
import client from "../../utils/axios";
import { useMutation, useQuery } from "react-query";

const DeleteIsoPage = () => {
  const [date, setDate] = useState<string | string[]>(
    dayjs().subtract(2, "months").format("YYYY-MM-01")
  );
  const [selectedIso, setSelectedIso] = useState<string>("");

  const handleIsoChange = (value: string) => {
    setSelectedIso(value);
  };

  const onChange: DatePickerProps["onChange"] = (_, dateString) => {
    const formattedDate = `${dateString}-01`;
    setDate(formattedDate);
  };

  const fetchUniqueIsoData = async () => {
    const { data } = await client.get<any[]>("/unique-iso");
    return data;
  };

  const { data: uniqueIsos } = useQuery(
    "fetchUniqueIsoData",
    fetchUniqueIsoData
  );

  const { mutate: deleteIso } = useMutation(
    async ({ date, iso }: { date: string | string[]; iso: string }) => {
      const { data } = await client.delete(`/delete-iso`, {
        data: { date, iso }, // Pass the composite key in the request body
      });
      return data;
    },
    {
      onSuccess: () => {
        setSelectedIso("");
        message.success("ISO deleted successfully");
        setSelectedIso("");
        setDate(dayjs().subtract(2, "months").format("YYYY-MM-01"));
      },
      onError: (error: any) => {
        if (error?.response?.data?.message) {
          message.error(error.response.data.message);
        } else {
          message.error("Failed to delete ISO. Please try again.");
        }
      },
    }
  );

  return (
    <>
      <h2>Delete ISO's</h2>
      <span className="subtitle">
        Delete Revenue files of ISO's in vistoria
      </span>
      <Row align="middle" gutter={[16, 16]}>
        <Col xs={24} sm={24} md={12} lg={12}>
          <DatePicker
            size="large"
            onChange={onChange}
            picker="month"
            defaultValue={dayjs().subtract(2, "months")}
          />
        </Col>
        <Col xs={24} sm={24} md={12} lg={12}>
          <Select
            size="large"
            placeholder="Select ISO"
            optionLabelProp="label"
            allowClear
            showSearch
            onChange={handleIsoChange}
            filterOption={(input: any, option: any) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
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
        </Col>
      </Row>
      <Col span={24}>
        <div style={{ textAlign: "right" }}>
          <Button
            className="download-btn"
            type="primary"
            htmlType="submit"
            onClick={() => deleteIso({ date: date, iso: selectedIso })}
            size="large"
            //   loading={isLoading}
          >
            Delete
          </Button>
        </div>
      </Col>
    </>
  );
};

export default DeleteIsoPage;
