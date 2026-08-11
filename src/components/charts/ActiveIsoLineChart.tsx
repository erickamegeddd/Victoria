import { Col, DatePicker, Empty, message, Row, Select } from "antd";
import { useState } from "react";
import client from "../../utils/axios";
import { useQuery } from "react-query";
import dayjs from "dayjs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const { RangePicker } = DatePicker;

interface ActiveIsoMids {
  iso: string;
  mid: string;
  dba: string;
}

const ActiveIsoLineChart = () => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedMids, setSelectedMids] = useState<string[]>([]);

  const defaultEndDate = dayjs().subtract(2, "month").startOf("month");
  const defaultStartDate = defaultEndDate.subtract(12, "month");

  const handleDateChange = (_: any, dateString: [string, string]) => {
    const formattedStartDate = `${dateString[0]}-01`;
    const formattedEndDate = `${dateString[1]}-01`;
    setStartDate(formattedStartDate);
    setEndDate(formattedEndDate);
  };

  const handleIsoChange = (values: string[]) => {
    setSelectedMids(values);
  };

  const fetchUniqueIsoMidsData = async () => {
    const { data } = await client.get<ActiveIsoMids[]>("/active-iso-mids");
    return data;
  };

  const { data: uniqueIsos, isLoading } = useQuery(
    "fetchUniqueIsoMidsData",
    fetchUniqueIsoMidsData,
    {
      suspense: false,
    }
  );

  const fetchIsoData = async (
    start_date: string,
    end_date: string,
    mids: string[]
  ) => {
    const { data } = await client.get(`/revenue-per-month-each-active-mid`, {
      params: {
        start_date,
        end_date,
        mid: mids,
      },
      paramsSerializer: {
        indexes: null,
      },
    });
    return data;
  };

  const { data: revenueData, error } = useQuery(
    ["fetchIsoData", startDate, endDate, selectedMids],
    () =>
      fetchIsoData(
        startDate || defaultStartDate.format("YYYY-MM-DD"),
        endDate || defaultEndDate.format("YYYY-MM-DD"),
        selectedMids
      ),
    {
      enabled: selectedMids.length > 0,
    }
  );

  if (error) message.error("Error fetching data");

  // Transform backend data to recharts format
  const transformedData = (() => {
    if (!revenueData || revenueData.length === 0) return [];

    const grouped = new Map<string, any>();

    revenueData.forEach((item: any) => {
      const date = item.date;
      const key = `${item.dba} (${item.mid})`;

      if (!grouped.has(date)) {
        grouped.set(date, { date });
      }

      grouped.get(date)[key] = item.total_revenue;
    });

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  })();

  const lineKeys: string[] = Array.from(
    new Set(revenueData?.map((item: any) => `${item.dba} (${item.mid})`) ?? [])
  );

  const colors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7f50",
    "#00bcd4",
    "#d32f2f",
    "#8bc34a",
  ];

  return (
    <>
      <h2 style={{ margin: "10px 0px" }}>
        Active ISO's MIDs PayDiverse Residual
      </h2>

      <Row justify="end">
        <Col xxl={6} xl={6} lg={6} md={24} sm={24} xs={24}>
          <RangePicker
            picker="month"
            onChange={handleDateChange}
            allowClear
            defaultValue={[defaultStartDate, defaultEndDate]}
          />
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <Select
            size="large"
            placeholder="Select a MID"
            optionLabelProp="label"
            allowClear
            showSearch
            mode="multiple"
            maxCount={5}
            onChange={handleIsoChange}
            filterOption={(input: any, option: any) =>
              (option?.label ?? "")
                .toLowerCase()
                .includes(input.toLowerCase()) ||
              (option?.value ?? "")
                .toLowerCase()
                .includes(input.toLowerCase()) ||
              (option?.iso ?? "").toLowerCase().includes(input.toLowerCase())
            }
            filterSort={(optionA, optionB) =>
              (optionA?.label ?? "")
                .toLowerCase()
                .localeCompare((optionB?.label ?? "").toLowerCase())
            }
          >
            {isLoading ? (
              <Select.Option disabled key="loading" value="">
                Loading...
              </Select.Option>
            ) : (
              uniqueIsos?.map((opt: ActiveIsoMids, index: number) => (
                <Select.Option
                  key={index}
                  value={opt.mid}
                  iso={opt.iso}
                  label={`${opt.dba} (${opt.mid})`}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div>
                      <div style={{ color: "black" }}>{opt.mid}</div>
                      <div style={{ fontSize: "13px", color: "grey" }}>
                        ISO: {opt?.iso}
                      </div>
                      <div style={{ fontSize: "13px", color: "grey" }}>
                        DBA: {opt?.dba}
                      </div>
                    </div>
                  </div>
                </Select.Option>
              ))
            )}
          </Select>
        </Col>
      </Row>

      <Row justify="center">
        <Col>
          {transformedData.length > 0 ? (
            <ResponsiveContainer width={1000} height={500}>
              <LineChart
                data={transformedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => dayjs(date).format("MMM-YY")}
                  label={{
                    value: "Date",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />
                <YAxis
                  tickFormatter={(value) => "$" + value.toLocaleString()}
                  label={{
                    value: "Revenue",
                    angle: -90,
                    position: "insideLeft",
                    offset: -13,
                  }}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `$${value.toLocaleString()}`,
                    name,
                  ]}
                  labelFormatter={(date) => dayjs(date).format("MMMM, YYYY")}
                />
                {lineKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                    name={key}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Col>
      </Row>
    </>
  );
};

export default ActiveIsoLineChart;
