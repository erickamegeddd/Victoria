// @ts-nocheck
import { Button } from "antd";
import { LeftOutlined, RightOutlined, BarChartOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";

const IndustryPage = () => {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-01"));
  const go = (months) => setDate(dayjs(date).add(months, "month").format("YYYY-MM-01"));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Button icon={<LeftOutlined />} onClick={() => go(-1)} />
        <span style={{ minWidth: 140, textAlign: "center", fontWeight: 600, fontSize: 15 }}>
          {dayjs(date).format("MMMM YYYY")}
        </span>
        <Button icon={<RightOutlined />} onClick={() => go(1)} />
        <Button onClick={() => setDate(dayjs().format("YYYY-MM-01"))} size="middle">Current Month</Button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
        <BarChartOutlined style={{ fontSize: 48, color: "#38bdf8", marginBottom: 16 }} />
        <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Industry Breakdown</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Coming soon — revenue aggregated by industry vertical</div>
      </div>
    </>
  );
};

export default IndustryPage;
