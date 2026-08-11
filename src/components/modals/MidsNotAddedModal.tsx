import { Modal, Table, Tag } from "antd";
import client from "../../utils/axios";
import { useQuery } from "react-query";
import dayjs from "dayjs";

interface ModalProps {
  open: boolean;
  onCancel: any;
  record: { iso: string; id: number; is_active: number };
  date: any;
}

interface Merchant {
  mid: string;
  dba: string;
  iso: string;
  corporation: string;
  approval_date: string;
  status?: string;
}

const MidsNotAddedModal: React.FC<ModalProps> = ({
  open,
  onCancel,
  record,
  date,
}) => {
  const fetchMidsNotAddedPerIsoData = async (iso: string, date: any) => {
    const { data } = await client.get<any[]>("/mids-not-uploaded-by-iso", {
      params: { iso: iso, date: date },
    });
    return data;
  };

  const { data: midsNotAdded } = useQuery<any>(
    ["fetchMidsNotAddedPerIsoData", record.iso, date],
    () => fetchMidsNotAddedPerIsoData(record.iso, date)
  );

  const columns: any = [
    {
      title: "MID",
      dataIndex: "mid",
      key: "mid",
      sorter: (a: Merchant, b: Merchant) => a.mid.localeCompare(b.mid),
      render: (mid: string) =>
        mid ? mid : <Tag title="Not Provided" color="error" />,
    },
    {
      title: "DBA",
      dataIndex: "dba",
      key: "dba",
      width: 300,
      sorter: (a: Merchant, b: Merchant) => a.dba.localeCompare(b.dba),
      render: (dba: string) =>
        dba ? dba : <Tag title="Not Provided" color="error" />,
    },
    {
      title: "ISO",
      dataIndex: "iso",
      key: "iso",
      width: 400,
      sorter: (a: Merchant, b: Merchant) => a.iso.localeCompare(b.iso),
      render: (iso: string) =>
        iso ? iso : <Tag title="Not Provided" color="error" />,
    },
    {
      title: "Corporation",
      dataIndex: "corporation",
      key: "corporation",
      width: 500,
      sorter: (a: Merchant, b: Merchant) =>
        a.corporation.localeCompare(b.corporation),
      render: (corporation: string) =>
        corporation ? corporation : <Tag title="Not Provided" color="error" />,
    },
    {
      title: "Approval Date",
      dataIndex: "approval_date",
      key: "approval_date",
      width: 300,
      sorter: (a: Merchant, b: Merchant) =>
        dayjs(a.approval_date).unix() - dayjs(b.approval_date).unix(),
      render: (text: string) => dayjs(text).format("YYYY-MM-DD"),
    },
    {
      key: "status",
      title: "Status",
      dataIndex: "status",
      render: () => <Tag color="error">Not Present</Tag>,
    },
  ];

  return (
    <>
      <Modal
        open={open}
        onCancel={onCancel}
        title={record.iso + " MID's not uploaded in " + date}
        footer={null}
        width="80%"
        centered
      >
        <Table columns={columns} dataSource={midsNotAdded.merchants} />
      </Modal>
    </>
  );
};

export default MidsNotAddedModal;
