import { useQuery } from "react-query";
import client from "../utils/axios";
import { message, List, Spin, Empty } from "antd";

interface ZeroVolumeProps {
  date: string | string[];
}

interface ZeroVolumeIsos {
  iso_count: number;
  isos: string[];
  month: string;
}

const ZeroVolume: React.FC<ZeroVolumeProps> = ({ date }) => {
  const fetchZeroVolumeIsos = async (date: string | string[]) => {
    const { data } = await client.get<ZeroVolumeIsos>(`/zero-volume-isos`, {
      params: { date },
    });
    return data;
  };

  const { data, error, isLoading } = useQuery(
    ["fetchZeroVolumeIsos", date],
    () => fetchZeroVolumeIsos(date),
    {
      enabled: !!date,
    }
  );

  if (error) {
    message.error("Error fetching ISO's");
  }

  return (
    <>
      <h2>Zero Volume ISOs</h2>
      {isLoading ? (
        <Spin tip="Loading ISOs..." />
      ) : data && data.isos.length > 0 ? (
        <List
          dataSource={data.isos}
          bordered={false}
          renderItem={(iso, index) => (
            <List.Item>{`${index + 1}. ${iso}`}</List.Item>
          )}
        />
      ) : (
        <Empty description="No ISOs with zero volume for this month" />
      )}
    </>
  );
};

export default ZeroVolume;
