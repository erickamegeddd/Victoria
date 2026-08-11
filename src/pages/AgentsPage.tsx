import { Col, Row, DatePicker } from "antd";
import type { DatePickerProps } from "antd";
import { useState } from "react";
import dayjs from "dayjs";
import AgentsPayoutBarChart from "../components/charts/AgentsPayoutBarChart";
import AgentsCardsComponent from "../components/cards/AgentsCardsComponent";
import RevenuePerAgentTable from "../components/tables/RevenuePerAgentTable";
// import AgentsMidList from "../components/AgentsMidList";

const AgentsPage = () => {
  const [date, setDate] = useState<string | string[]>(
    dayjs().subtract(2, "months").format("YYYY-MM-01")
  );

  const onChange: DatePickerProps["onChange"] = (_, dateString) => {
    const formattedDate = `${dateString}-01`;
    setDate(formattedDate);
  };
  return (
    <>
      <Row justify="end">
        <Col xs={24} sm={24} md={12} lg={6}>
          <DatePicker
            onChange={onChange}
            picker="month"
            defaultValue={dayjs().subtract(2, "months")}
          />
        </Col>
      </Row>
      <AgentsCardsComponent date={date} />
      <Row>
        <Col>
          <h2>Revenue Per Agent</h2>
        </Col>
      </Row>
      <RevenuePerAgentTable date={date} />
      <Row>
        <Col>
          <h2>Agents Total Payout</h2>
        </Col>
      </Row>
      <AgentsPayoutBarChart date={date} />
      {/* <Row>
        <Col>
          <h2>Agents MIDs List</h2>
        </Col>
      </Row>
      <AgentsMidList /> */}
    </>
  );
};

export default AgentsPage;
