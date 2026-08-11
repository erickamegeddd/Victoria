import { useState } from "react";
import { Col, message, Row, Table, Tag, Input, Tooltip } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import client from "../../utils/axios";
import dayjs from "dayjs";
import formatCurrency from "../../utils/formatCurrency";

const { Search } = Input;

interface Adjustment {
  id: string;
  iso: string;
  adjustment_price: number;
  date: string;
}

const ViewAdjustments = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState<string>("");

  const fetchAdjustmentData = async () => {
    const { data } = await client.get<Adjustment[]>("/adjustments");
    return data;
  };

  const { data, error, isLoading } = useQuery(
    "fetchAdjustmentData",
    fetchAdjustmentData
  );

  const columns: any = [
    {
      key: 1,
      title: "ISO Name",
      dataIndex: "iso",
      sorter: (a: Adjustment, b: Adjustment) => a.iso.localeCompare(b.iso),
      render: (iso: string) => iso || <Tag color="error">ISO Not Provided</Tag>,
    },
    {
      key: 2,
      title: "Date",
      dataIndex: "date",
      sorter: (a: Adjustment, b: Adjustment) => {
        if (a.date && b.date) {
          return a.date.localeCompare(b.date); // Sort alphabetically if both values exist
        }
        return a.date ? -1 : 1; // Sort non-empty values first
      },
      render: (date: string) => {
        if (!date) {
          return <Tag color="error">Not Provided</Tag>;
        }
        return dayjs(date).format("YYYY-MM");
      },
    },
    {
      key: 3,
      title: "Adjustment",
      dataIndex: "adjustment_price",
      sorter: (a: Adjustment, b: Adjustment) =>
        a.adjustment_price - b.adjustment_price,
      render: (adjustment_price: number) => formatCurrency(adjustment_price),
    },
    {
      key: 4,
      title: "Action",
      width: "150px",
      align: "center",
      render: (record: Adjustment) => (
        <>
          <Tooltip title={"Click to edit record"}>
            <EditOutlined
              style={{
                fontSize: 18,
                color: "var(--primary-color)",
                marginRight: 10,
              }}
              onClick={() => navigate(`/home/adjustments/${record.id}`)}
            />
          </Tooltip>
        </>
      ),
    },
  ];

  if (error) message.error("Error Fetching records");

  return (
    <>
      <h2>View Adjustments</h2>
      <span className="subtitle">View all the Adjustments in revenue</span>
      <Row>
        <Col span={8}>
          <Search
            size="large"
            placeholder="Search"
            allowClear
            enterButton
            onSearch={(value) => setSearchText(value)}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
      </Row>
      <Table
        dataSource={data?.filter((item: Adjustment) => {
          const iso = item.iso || "";
          return iso?.toLowerCase().includes(searchText?.toLowerCase());
        })}
        loading={isLoading}
        columns={columns}
        rowClassName="row"
        onRow={(record: Adjustment) => ({
          onClick: () => navigate(`/home/adjustments/${record?.id}`),
        })}
      />
    </>
  );
};

export default ViewAdjustments;
