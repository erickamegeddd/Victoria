import { Col, DatePicker, Empty, message, Row } from "antd";
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
import { getUserFromLocalStorage } from "../../utils/getUser";

const { RangePicker } = DatePicker;

const AgentMonthlyLineChart = () => {
  const user = getUserFromLocalStorage();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const defaultEndDate = dayjs().subtract(2, "month").startOf("month");
  const defaultStartDate = defaultEndDate.subtract(12, "month");

  const handleDateChange = (_: any, dateString: [string, string]) => {
    const formattedStartDate = `${dateString[0]}-01`;
    const formattedEndDate = `${dateString[1]}-01`;
    setStartDate(formattedStartDate);
    setEndDate(formattedEndDate);
  };

  const fetchMonthlyAgentData = async (
    start_date: string,
    end_date: string,
    agent_name: string
  ) => {
    const { data } = await client.get(`/revenue-per-month-each-agent`, {
      params: { start_date, end_date, agent_name },
    });
    return data;
  };

  const { data: revenueData, error } = useQuery(
    ["fetchMonthlyAgentData", startDate, endDate, user?.name],
    () =>
      fetchMonthlyAgentData(
        startDate || defaultStartDate.format("YYYY-MM-DD"),
        endDate || defaultEndDate.format("YYYY-MM-DD"),
        user?.name || ""
      ),
    {
      enabled: true, // Always fetch data, default values apply when necessary
    }
  );

  if (error) message.error("Error fetching data");

  return (
    <>
      <Row justify="end" align="middle">
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
                    value: "Month",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />
                <YAxis
                  tickFormatter={(value) => "$" + value.toLocaleString()}
                  label={{
                    value: "Payout",
                    angle: -90,
                    position: "insideLeft",
                    offset: -13,
                  }}
                />
                <Tooltip
                  formatter={(value: any) => [
                    `$${value.toLocaleString()}`, // remove 01 from the
                    "Total Payout",
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

export default AgentMonthlyLineChart;
