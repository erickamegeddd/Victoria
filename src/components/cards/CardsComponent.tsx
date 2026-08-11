import { Col, Row, Card, Statistic, message } from "antd";
import CountUp from "react-countup";
import { useQuery } from "react-query";
import {
  DollarOutlined,
  LineChartOutlined,
  DiffOutlined,
} from "@ant-design/icons";
import { IoDocumentsOutline } from "react-icons/io5";
import { RiNumbersFill } from "react-icons/ri";
import client from "../../utils/axios";
import { useState } from "react";
import NotUploadedIsosModal from "../modals/NotUploadedIsoModal";
import MidsAddedModal from "../modals/MidsAddedModal";
import dayjs from "dayjs";

interface CardProps {
  date: string | string[];
}

type IsoReportStats = {
  active_iso_count: number;
  uploaded_iso_count: number;
  not_uploaded_isos: { id: number; name: string }[];
};

const formatter = (value: any, addPrefix: boolean = true) => (
  <CountUp
    end={value}
    separator=","
    decimals={addPrefix ? 2 : 0}
    prefix={addPrefix ? "$" : ""}
  />
);

const CardsComponent: React.FC<CardProps> = ({ date }) => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [midsModalVisible, setMidsModalVisible] = useState<boolean>(false);

  function getPrevYearPrevMonthStart(dateStr: string) {
    return dayjs(dateStr)
      .subtract(13, "month")
      .startOf("month")
      .format("YYYY-MM-DD");
  }

  const previousYearDate: string = getPrevYearPrevMonthStart(date as string);

  const fetchVolumePerMonth = async (date: string | string[]) => {
    const { data } = await client.get(`/volume-per-month`, {
      params: { date },
    });
    return data;
  };

  const { data: volumePerMonthData, error: volumePerMonthError } = useQuery(
    ["fetchVolumePerMonth", date],
    () => fetchVolumePerMonth(date),
    { enabled: !!date }
  );

  const fetchRevenuePerMonth = async (date: string | string[]) => {
    const { data } = await client.get(`/revenue-per-month`, {
      params: { date },
    });
    return data;
  };

  const { data: revenuePerMonthData, error: revenuePerMonthError } = useQuery(
    ["fetchRevenuePerMonth", date],
    () => fetchRevenuePerMonth(date),
    { enabled: !!date }
  );

  const fetchActiveMids = async (date: string | string[]) => {
    const { data } = await client.get(`/active-mids`, { params: { date } });
    return data;
  };

  const { data: activeMidsData, error: activeMidsError } = useQuery(
    ["fetchActiveMids", date],
    () => fetchActiveMids(date),
    { enabled: !!date }
  );

  const fetchPreviousYearActiveMids = async (date: string | string[]) => {
    const { data } = await client.get(`/active-mids`, { params: { date } });
    return data;
  };

  const { data: previousActiveMidsData, error: previousActiveMidsError } =
    useQuery(
      ["fetchPreviousYearActiveMids", previousYearDate],
      () => fetchPreviousYearActiveMids(previousYearDate),
      { enabled: !!previousYearDate }
    );

  const fetchUploadedReportsData = async (date: string | string[]) => {
    const { data } = await client.get<IsoReportStats>("/reports", {
      params: { date },
    });
    return data;
  };

  const { data: reportsData, error: reportsError } = useQuery(
    ["fetchUploadedReportsData", date],
    () => fetchUploadedReportsData(date),
    {
      enabled: !!date,
    }
  );

  const fetchMidsAddedData = async (date: string | string[]) => {
    const { data } = await client.get<MidsAdded>("/mids-added", {
      params: { date },
    });
    return data;
  };

  const { data: midsAddedData, error: midsAddedError } = useQuery(
    ["fetchMidsAddedData", date],
    () => fetchMidsAddedData(date),
    {
      enabled: !!date,
    }
  );

  if (
    volumePerMonthError ||
    revenuePerMonthError ||
    activeMidsError ||
    reportsError ||
    midsAddedError ||
    previousActiveMidsError
  )
    message.error("Error Fetching records");

  const cardData = [
    {
      title: "Total Volume Per Month",
      value: volumePerMonthData?.total_volume || 0,
      icon: <LineChartOutlined style={iconStyle} />,
    },
    {
      title: "Total Revenue Per Month",
      value: revenuePerMonthData?.total_revenue || 0,
      icon: <DollarOutlined style={iconStyle} />,
    },
    {
      title: "Total Active MID's",
      value: activeMidsData?.total_mids || 0,
      icon: <RiNumbersFill style={iconStyle} />,
    },
  ];

  return (
    <>
      <Row gutter={[20, 20]}>
        {cardData.map((card, index) => (
          <Col key={index} xxl={8} xl={8} lg={12} md={12} sm={24} xs={24}>
            <Card
              bordered={false}
              style={{
                backgroundColor: "#f9f9f9",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {card.icon}
                <div>
                  <span style={{ margin: 0, fontWeight: 600, fontSize: 20 }}>
                    {card.title}
                  </span>
                  <Statistic
                    value={card.value}
                    valueStyle={statisticStyle}
                    formatter={(value) =>
                      formatter(value, index !== 2 ? true : false)
                    }
                  />
                </div>
              </div>
            </Card>
          </Col>
        ))}
        <Col key={3} xxl={8} xl={8} lg={12} md={12} sm={24} xs={24}>
          <Card
            bordered={false}
            onClick={() => setModalVisible(true)}
            style={{
              backgroundColor: "#f9f9f9",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease-in-out",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 6px 16px rgba(0, 0, 0, 0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 8px rgba(0, 0, 0, 0.1)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <IoDocumentsOutline style={iconStyle} />
              <div>
                <span style={{ margin: 0, fontWeight: 600, fontSize: 20 }}>
                  Reports Uploaded
                </span>
                <Statistic
                  value={
                    reportsData?.uploaded_iso_count +
                    "/" +
                    reportsData?.active_iso_count
                  }
                  valueStyle={statisticStyle}
                />
              </div>
            </div>
          </Card>
        </Col>
        <Col key={4} xxl={8} xl={8} lg={12} md={12} sm={24} xs={24}>
          <Card
            bordered={false}
            onClick={() => setMidsModalVisible(true)}
            style={{
              backgroundColor: "#f9f9f9",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease-in-out",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 6px 16px rgba(0, 0, 0, 0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 8px rgba(0, 0, 0, 0.1)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <DiffOutlined style={iconStyle} />
              <div>
                <span style={{ margin: 0, fontWeight: 600, fontSize: 20 }}>
                  MIDs Added
                </span>
                <Statistic
                  value={midsAddedData?.mid_count}
                  valueStyle={statisticStyle}
                />
              </div>
            </div>
          </Card>
        </Col>
        <Col key={5} xxl={8} xl={8} lg={12} md={12} sm={24} xs={24}>
          <Card
            bordered={false}
            style={{
              backgroundColor: "#f9f9f9",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <RiNumbersFill style={iconStyle} />
              <div>
                <span style={{ margin: 0, fontWeight: 600, fontSize: 20 }}>
                  {`Active MIDs in ${previousYearDate.substring(0, 7)}`}
                </span>
                <Statistic
                  value={previousActiveMidsData?.total_mids || 0}
                  valueStyle={statisticStyle}
                  formatter={(value) => formatter(value, false)}
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      {modalVisible && (
        <NotUploadedIsosModal
          date={date}
          onClose={() => setModalVisible(false)}
          data={reportsData?.not_uploaded_isos ?? []}
        />
      )}
      {midsModalVisible && (
        <MidsAddedModal
          date={date}
          onClose={() => setMidsModalVisible(false)}
          data={midsAddedData?.merchants || []}
        />
      )}
    </>
  );
};

const iconStyle = {
  fontSize: "36px",
};

const statisticStyle = {
  fontSize: 24,
  fontWeight: 500,
  color: "var(--secondary-color)",
};

export default CardsComponent;
