// @ts-nocheck
import { Button } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import RevenuePerIndustryTable from "../components/tables/RevenuePerIndustryTable";

const IndustryPage = () => {
  const [date, setDate] = useState<string>(dayjs().format("YYYY-MM-01"));

  const go = (months: number) => setDate(dayjs(date).add(months, "month").format("YYYY-MM-01"));
  const goCurrent = () => setDate(dayjs().format("YYYY-MM-01"));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Button icon={<LeftOutlined />} onClick={() => go(-1)} />
        <span style={{ minWidth: 140, textAlign: "center", fontWeight: 600, fontSize: 15 }}>
          {dayjs(date).format("MMMM YYYY")}
        </span>
        <Button icon={<RightOutlined />} onClick={() => go(1)} />
        <Button onClick={goCurrent} size="middle">Current Month</Button>
      </div>
      <RevenuePerIndustryTable date={date} />
    </>
  );
};

export default IndustryPage;
