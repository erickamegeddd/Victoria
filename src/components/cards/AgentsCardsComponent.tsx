import { Col, Row, Card, Statistic, message } from "antd";
import CountUp from "react-countup";
import { useQuery } from "react-query";
import {
  DollarOutlined,
  BankOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import agentClient from "../../utils/agentAxios";

interface AgentsCardProps {
  date: string | string[];
}

const formatter = (value: any, addPrefix: boolean = true) => (
  <CountUp
    end={value}
    separator=","
    decimals={addPrefix ? 2 : 0}
    prefix={addPrefix ? "$" : ""}
  />
);

const AgentsCardsComponent: React.FC<AgentsCardProps> = ({ date }) => {
  const fetchRevenuePerMonth = async (date: string | string[]) => {
    const { data } = await agentClient.get(`/api/revenue-per-month`, {
      params: { date },
    });
    return data;
  };

  const { data: revenuePerMonthData, error: revenuePerMonthError } = useQuery(
    ["fetchRevenuePerMonth", date],
    () => fetchRevenuePerMonth(date),
    { enabled: !!date }
  );

  const fetchAgentsPayout = async (date: string | string[]) => {
    const { data } = await agentClient.get(`/api/agents-payout`, { params: { date } });
    return data;
  };

  const { data: totalPayoutData, error: totalPayoutError } = useQuery(
    ["fetchAgentsPayout", date],
    () => fetchAgentsPayout(date),
    { enabled: !!date }
  );

  const totalPayoutSum = totalPayoutData?.reduce(
    (sum: number, agent: any) => sum + agent.total_payout,
    0
  );

  if (revenuePerMonthError || totalPayoutError)
    message.error("Error Fetching records");

  const cardData = [
    {
      title: "Total Revenue",
      value: revenuePerMonthData?.total_revenue || 0,
      icon: <DollarOutlined style={iconStyle} />,
      color: "#1890ff",
    },
    {
      title: "Agent's Payout",
      value: totalPayoutSum || 0,
      icon: <BankOutlined style={iconStyle} />,
      color: "#52c41a",
    },
    {
      title: "Amount after Payout",
      value: (revenuePerMonthData?.total_revenue || 0) - (totalPayoutSum || 0),
      icon: <WalletOutlined style={iconStyle} />,
      color: "#faad14",
    },
  ];

  return (
    <Row gutter={[20, 20]}>
      {cardData.map((card, index) => (
        <Col key={index} xxl={8} xl={8} lg={12} md={12} sm={24} xs={24}>
          <Card
            bordered={false}
            style={{
              backgroundColor: "#f9f9f9",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {card.icon}
              <div>
                <span style={{ margin: 0, fontWeight: 600, fontSize: 20 }}>
                  {card.title}
                </span>
                <Statistic
                  value={card.value}
                  valueStyle={statisticStyle}
                  formatter={(value) => formatter(value, true)}
                />
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

const iconStyle = {
  fontSize: "36px",
};

const statisticStyle = {
  fontSize: 24,
  fontWeight: 500,
  color: "var(--secondary-color)",
};

export default AgentsCardsComponent;
