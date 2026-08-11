import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import client from "../../utils/axios";
import { useQuery } from "react-query";
import { Col, message, Row } from "antd";

interface ReferralTypeBarChartProps {
  date: string | string[];
}

const ReferralTypeBarChart: React.FC<ReferralTypeBarChartProps> = ({
  date,
}) => {
  const fetchReferralTypeResidual = async (date: string | string[]) => {
    const { data } = await client.get(`/referral-type-residual`, {
      params: { date },
    });
    return data;
  };

  const { data, error } = useQuery(
    ["fetchReferralTypeResidual", date],
    () => fetchReferralTypeResidual(date),
    {
      enabled: !!date,
    }
  );

  if (error) {
    message.error("Error Fetching data");
  }

  return (
    <>
      <Row>
        <Col span={24}>
          <h3>Revenue Per Referral Type</h3>
        </Col>
      </Row>
      <Row justify="center">
        <Col>
          {data.length > 0 ? (
            <ResponsiveContainer width={500} height={500}>
              <BarChart
                data={data}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="referral_type" />
                <YAxis
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  formatter={(value) => [
                    `$${value.toLocaleString()}`,
                    "Total Residual",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="total_residual"
                  fill="var(--secondary-color)"
                  name="Total Residual"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <span
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "var(--red-color)",
              }}
            >
              No data for this month
            </span>
           )}
        </Col>
      </Row>
    </>
  );
};

export default ReferralTypeBarChart;
