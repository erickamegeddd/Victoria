import { Col, Row, DatePicker } from "antd";
import type { DatePickerProps } from "antd";
import { useState } from "react";
import dayjs from "dayjs";
import RevenuePerIndustryTable from "../components/tables/RevenuePerIndustryTable";

const IndustryPage = () => {
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
      <RevenuePerIndustryTable date={date} />
    </>
  );
};

export default IndustryPage;
