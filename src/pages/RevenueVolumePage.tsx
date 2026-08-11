import { Col, Row, DatePicker } from "antd";
import type { DatePickerProps } from "antd";
import { useState } from "react";
import dayjs from "dayjs"; // Import dayjs to handle dates
import ReferralTypeBarChart from "../components/charts/ReferralTypeBarChart";
import CardsComponent from "../components/cards/CardsComponent";

const RevenueVolumePage = () => {
  const [date, setDate] = useState<string | string[]>(
    dayjs().subtract(2, "months").format("YYYY-MM-01")
  );

  const onChange: DatePickerProps["onChange"] = (_, dateString) => {
    const formattedDate = `${dateString}-01`;
    setDate(formattedDate);
  };

  return (
    <>
      <h2>Total Revenue & Volume Per Month</h2>
      <Row justify="end">
        <Col xs={24} sm={24} md={12} lg={6}>
          <DatePicker
            onChange={onChange}
            picker="month"
            defaultValue={dayjs().subtract(2, "months")}
          />
        </Col>
      </Row>
      <CardsComponent date={date} />
      <ReferralTypeBarChart date={date} />
    </>
  );
};

export default RevenueVolumePage;
