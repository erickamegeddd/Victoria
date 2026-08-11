import { Col, Row, DatePicker, Tabs } from "antd";
import type { TabsProps } from "antd";
import type { DatePickerProps } from "antd";
import { useState } from "react";
import dayjs from "dayjs";
import NegativeRevenuePerCorpTable from "../components/tables/NegativeRevenuePerCorpTable";
import RevenuePerMidTable from "../components/tables/RevenuePerMidTable";
import RevenuePerCorporationTable from "../components/tables/RevenuePerCorporationTable";
import RevenuePerOperatingPartnerTable from "../components/tables/RevenuePerOperatingPartner";

const RevenuePerMidPage = () => {
  const [date, setDate] = useState<string | string[]>(
    dayjs().subtract(2, "months").format("YYYY-MM-01")
  );

  const onChange: DatePickerProps["onChange"] = (_, dateString) => {
    const formattedDate = `${dateString}-01`;
    setDate(formattedDate);
  };

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Revenue Per MID Table",
      children: <RevenuePerMidTable date={date} />,
    },
    {
      key: "2",
      label: "Revenue Per Operating Partner",
      children: <RevenuePerOperatingPartnerTable date={date} />,
    },
    {
      key: "3",
      label: "Revenue Per Corporation Table",
      children: (
        <>
          <RevenuePerCorporationTable date={date} />
        </>
      ),
    },
    {
      key: "4",
      label: "Negative MID's",
      children: <NegativeRevenuePerCorpTable date={date} />,
    },
  ];
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
      <Tabs defaultActiveKey="1" items={items} />
    </>
  );
};

export default RevenuePerMidPage;
