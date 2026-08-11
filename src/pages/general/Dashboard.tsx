// @ts-nocheck
import { useState } from "react";
import { Typography, DatePicker, Space } from "antd";
import CardsComponent from "../../components/cards/CardsComponent";
import dayjs from "dayjs";

const { Title } = Typography;

export default function Dashboard() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));

  return (
    <div style={{ padding: "0 4px" }}>
      <Space style={{ marginBottom: 24, display: "flex", justifyContent: "space-between" }}>
        <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
        <DatePicker
          picker="month"
          defaultValue={dayjs()}
          onChange={(val) => val && setDate(val.format("YYYY-MM-DD"))}
        />
      </Space>
      <CardsComponent date={date} />
    </div>
  );
}
