import { Col, DatePicker, Empty, message, Row, Select } from "antd";
import { useState } from "react";
import client from "../../utils/axios";
import { useQuery } from "react-query";
import dayjs from "dayjs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const { RangePicker } = DatePicker;

const IsoLineChart = () => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedIso, setSelectedIso] = useState<string>("");

  const defaultEndDate = dayjs().subtract(2, "month").startOf("month");
  const defaultStartDate = defaultEndDate.subtract(12, "month");

  const handleDateChange = (_: any, dateString: [string, string]) => {
    const formattedStartDate = `${dateString[0]}-01`;
    const formattedEndDate = `${dateString[1]}-01`;
    setStartDate(formattedStartDate);
    setEndDate(formattedEndDate);
  };

  const handleIsoChange = (value: string) => {
    setSelectedIso(value);
  };

  const fetchUniqueIsoData = async () => {
    const { data } = await client.get<any[]>("/unique-iso");
    return data;
  };

  const { data: uniqueIsos } = useQuery(
    "fetchUniqueIsoData",
    fetchUniqueIsoData
  );

  const fetchIsoData = async (
    start_date: string,
    end_date: string,
    iso: string
  ) => {
    const { data } = await client.get(`/revenue-per-month-each-iso`, {
      params: { start_date, end_date, iso },
    });
    return data;
  };

  const { data: revenueData, error } = useQuery(
    ["fetchIsoData", startDate, endDate, selectedIso],
    () =>
      fetchIsoData(
        startDate || defaultStartDate.format("YYYY-MM-DD"),
        endDate || defaultEndDate.format("YYYY-MM-DD"),
        selectedIso || ""
      ),
    {
      enabled: true, // Always fetch data, default values apply when necessary
    }
  );

  if (error) message.error("Error fetching data");

  return (
    <>
      <h2 style={{ margin: "10px 0px" }}>
        Total Revenue per month of {selectedIso ? selectedIso : "every ISO"}
      </h2>

      <Row justify="space-between" align="middle">
        <Col xxl={6} xl={6} lg={6} md={24} sm={24} xs={24}>
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
        <Col xxl={6} xl={6} lg={6} md={24} sm={24} xs={24}>
          <RangePicker
            picker="month"
            onChange={handleDateChange}
            allowClear
            defaultValue={[defaultStartDate, defaultEndDate]}
          />
        </Col>
      </Row>
      <Row justify="center">
        <Col>
          {revenueData?.length > 0 ? (
            <ResponsiveContainer width={1000} height={500}>
              <LineChart
                data={revenueData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => dayjs(date).format("MMM-YY")}
                  label={{
                    value: "Date",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />
                <YAxis
                  tickFormatter={(value) => "$" + value.toLocaleString()}
                  label={{
                    value: "Revenue",
                    angle: -90,
                    position: "insideLeft",
                    offset: -13,
                  }}
                />
                <Tooltip
                  formatter={(value: any) => [
                    `$${value.toLocaleString()}`, // remove 01 from the
                    "Total Revenue",
                  ]}
                  labelFormatter={(date) => dayjs(date).format("MMMM, YYYY")}
                />
                <Line
                  type="monotone"
                  dataKey="total_revenue"
                  stroke="var(--secondary-color)"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Col>
      </Row>
    </>
  );
};

export default IsoLineChart;
