import { Tabs, TabsProps } from "antd";
import AgentInsights from "./insights/AgentsInsights";
import IsoInsights from "./insights/IsosInsights";
import MidInsights from "./insights/MidsInsights";
import CorporationInsights from "./insights/CorporationInsights";
import OperatingPartnerInsights from "./insights/OperatingPartnerInsights";
import MidAddedInsights from "./insights/MidsAddedInsights";

const DateRangeInsightsPage = () => {
  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "MID's",
      children: <MidInsights />,
    },
    {
      key: "2",
      label: "Agents",
      children: <AgentInsights />,
    },
    {
      key: "3",
      label: "ISO's",
      children: <IsoInsights />,
    },
    {
      key: "4",
      label: "Corporations",
      children: <CorporationInsights />,
    },
    {
      key: "5",
      label: "Operating Partners",
      children: <OperatingPartnerInsights />,
    },
    {
      key: "6",
      label: "MID's Added",
      children: <MidAddedInsights />,
    },
  ];

  return (
    <>
      <h2>Insights</h2>
      <Tabs defaultActiveKey="1" items={items} />
    </>
  );
};

export default DateRangeInsightsPage;
