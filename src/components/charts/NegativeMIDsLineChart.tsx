import { useState } from "react";
import { Col, DatePicker, Empty, message, Row, Select } from "antd";
import client from "../../utils/axios";
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
import { useQuery } from "react-query";

const { RangePicker } = DatePicker;
const { Option } = Select;

interface NegativeMIDsLineChartProps {
  mids: any[];
}

const NegativeMIDsLineChart: React.FC<NegativeMIDsLineChartProps> = ({
  mids,
}) => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedMID, setSelectedMID] = useState<string>("");

  const defaultEndDate = dayjs().subtract(2, "month").startOf("month");
  const defaultStartDate = defaultEndDate.subtract(12, "month");

  const handleDateChange = (_: any, dateString: [string, string]) => {
    const formattedStartDate = `${dateString[0]}-01`;
    const formattedEndDate = `${dateString[1]}-01`;
    setStartDate(formattedStartDate);
    setEndDate(formattedEndDate);
  };

  const handleMIDChange = (value: string) => {
    setSelectedMID(value);
  };

  const fetchNegativeMIDData = async (
    start_date: string,
    end_date: string,
    mid: string
  ) => {
    const { data } = await client.get(`/revenue-per-month-each-mid`, {
      params: { start_date, end_date, mid },
    });
    return data;
  };

  const { data: revenueData, error } = useQuery(
    ["fetchNegativeMIDData", startDate, endDate, selectedMID],
    () =>
      fetchNegativeMIDData(
        startDate || defaultStartDate.format("YYYY-MM-DD"),
        endDate || defaultEndDate.format("YYYY-MM-DD"),
        selectedMID || ""
      ),
    {
      enabled: !!selectedMID, // Always fetch data, default values apply when necessary
    }
  );

  if (error) message.error("Error fetching data");

  return (
    <>
      <h2>Negative MID's Time Series</h2>
      <Row gutter={30} justify="space-between" align="middle">
        <Col xs={24} sm={12} md={8} lg={8}>
          <Select
            size="large"
            placeholder="Select ISO"
            optionLabelProp="label"
            allowClear
            showSearch
            onChange={handleMIDChange}
            filterOption={
              (input: any, option: any) =>
                (option?.value ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()) || // Search by MID
                (option?.iso ?? "").toLowerCase().includes(input.toLowerCase()) // Search by ISO
            }
            filterSort={(optionA, optionB) =>
              (optionA?.label ?? "")
                .toLowerCase()
                .localeCompare((optionB?.label ?? "").toLowerCase())
            }
          >
            {mids?.map((opt: any, index: number) => (
              <Option key={index} value={opt.mid} label={opt.mid} iso={opt.iso}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "black" }}>MID: {opt.mid}</div>
                    <div style={{ fontSize: "13px", color: "grey" }}>
                      ISO: {opt?.iso}
                    </div>
                  </div>
                </div>
              </Option>
            ))}
          </Select>
        </Col>
        <Col xxl={8} xl={8} lg={8} md={24} sm={24} xs={24}>
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

export default NegativeMIDsLineChart;
