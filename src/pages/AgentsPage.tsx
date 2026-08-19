import { DatePicker } from "antd";
import type { DatePickerProps } from "antd";
import { useState } from "react";
import dayjs from "dayjs";
import AgentsPayoutBarChart from "../components/charts/AgentsPayoutBarChart";
import AgentsCardsComponent from "../components/cards/AgentsCardsComponent";
import RevenuePerAgentTable from "../components/tables/RevenuePerAgentTable";

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
      {/* Date picker — large, flush to the right */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <DatePicker
          onChange={onChange}
          picker="month"
          defaultValue={dayjs().subtract(2, "months")}
          size="large"
          style={{ width: 220 }}
          format="MMMM YYYY"
        />
      </div>

      <AgentsCardsComponent date={date} />

      <h2 style={{ marginTop: 24 }}>Revenue Per Agent</h2>
      <RevenuePerAgentTable date={date} />

      <h2 style={{ marginTop: 24 }}>Agents Total Payout</h2>
      <AgentsPayoutBarChart date={date} />
    </>
  );
};

export default AgentsPage;
