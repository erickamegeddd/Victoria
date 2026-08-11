import { Modal, Table, Tag } from "antd";
import dayjs from "dayjs";

interface Merchant {
  mid: string;
  dba: string;
  iso: string;
  corporation: string;
  approval_date: string;
  status?: string;
}

interface MidsAddedModalProps {
  onClose: () => void;
  data: Merchant[];
  date: string | string[];
}

const MidsAddedModal = ({ onClose, data, date }: MidsAddedModalProps) => {
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
      filters: [
        { text: "Present on ISO Report", value: "Uploaded" },
        { text: "Not Present", value: "Not uploaded" },
      ],
      onFilter: (value: string | number | boolean, record: any) =>
        record.status === value,
      render: (status: any) =>
        status === "Uploaded" ? (
          <Tag color="green">Present on ISO Report</Tag>
        ) : (
          <Tag color="error">Not Present</Tag>
        ),
    },
  ];

  return (
    <Modal
      title={`MIDs Added in - ${dayjs(date as string).format("MMMM, YYYY")}`}
      open={true}
      onCancel={onClose}
      footer={null}
      width="90%"
    >
      <Table
        columns={columns}
        dataSource={data}
        rowKey="mid"
        pagination={{ pageSize: 10 }}
      />
    </Modal>
  );
};

export default MidsAddedModal;
