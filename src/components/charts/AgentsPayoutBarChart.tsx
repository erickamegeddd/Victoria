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
import agentClient from "../../utils/agentAxios";
import { useQuery } from "react-query";
import { Col, Empty, message, Row } from "antd";

interface AgentsPayoutBarChartProps {
  date: string | string[];
}

const AgentsPayoutBarChart: React.FC<AgentsPayoutBarChartProps> = ({
  date,
}) => {
  const fetchAgentsPayout = async (date: string | string[]) => {
    const { data } = await agentClient.get(`/api/agents-payout`, {
      params: { date },
    });
    return data;
  };

  const { data, error } = useQuery(
    ["fetchAgentsPayout", date],
    () => fetchAgentsPayout(date),
    {
      enabled: !!date,
    }
  );

  if (error) {
    message.error("Error Fetching data");
  }

  // Guard against all-zero data which causes Recharts to crash (NaN axis range)
  const hasNonZero = (data || []).some((d: any) => d.total_payout > 0);

  return (
    <>
      <Row justify="center">
        <Col>
          {data.length > 0 && hasNonZero ? (
            <ResponsiveContainer width={1000} height={500}>
              <BarChart
                data={data}
                layout="vertical" // Set the chart to be horizontal
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <YAxis type="category" dataKey="agent_name" width={150} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  formatter={(value) => [
                    `$${value.toLocaleString()}`,
                    "Total Payout",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="total_payout"
                  fill="var(--secondary-color)"
                  name="Total Payout"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Col>
      </Row>
    </>
  );
};

export default AgentsPayoutBarChart;
