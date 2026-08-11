import { useMutation, useQuery, useQueryClient } from "react-query";
import client from "../../utils/axios";
import { message, Modal, Table, Tag, Tooltip, Select, Row, Col } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import formatCurrency from "../../utils/formatCurrency";
import { useState } from "react";
import dayjs from "dayjs";
import EditModalComponent from "../modals/EditModalComponent";

const LogTable = () => {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [day, setDay] = useState<number>(1);
  const [record, setRecord] = useState<LogsTableColumns>();
  const fetchLogs = async (day: number | undefined) => {
    const { data } = await client.get<LogsTableColumns[]>(`/get-logs`, { params: { days: day } });
    return data;
  };

  const { data, error, isLoading } = useQuery(["fetchLogs", day], () => fetchLogs(day));

  const { mutate: deleteLog } = useMutation(async ({ date, iso, mid }: { date: string; iso: string; mid: string }) => {
    const { data } = await client.delete(`/delete-log`, { data: { date, iso, mid } });
    return data;
  }, {
    onSuccess: () => { message.success("Log deleted successfully"); queryClient.invalidateQueries(["fetchLogs"]); },
    onError: (error: any) => { if (error?.response?.data?.message) { message.error(error.response.data.message); } else { message.error("Failed to delete log. Please try again."); } },
  });

  const handleDelete = (record: LogsTableColumns) => {
    Modal.confirm({
      title: "Are you sure you want to delete this log?",
      content: `This action cannot be undone.`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        if (record?.date && record?.iso && record?.mid) { deleteLog({ date: record.date, iso: record.iso, mid: record.mid }); } else { message.error("Incomplete data for the record."); }
      },
    });
  };

  const columns: any = [
    { key: 1, title: "Date", dataIndex: "date", width: "150px", fixed: "left", sorter: (a: any, b: any) => { if (a.date && b.date) return a.date.localeCompare(b.date); return a.date ? -1 : 1; }, render: (date: string) => date ? dayjs(date).format("YYYY-MM") : <Tag color="error">Not Provided</Tag> },
    { key: 2, title: "ISO", dataIndex: "iso", width: "200px", sorter: (a: any, b: any) => { if (a.iso && b.iso) return a.iso.localeCompare(b.iso); return a.iso ? -1 : 1; }, render: (iso: string) => iso || <Tag color="error">Not Provided</Tag> },
    { key: 3, title: "MID", dataIndex: "mid", width: "200px", sorter: (a: any, b: any) => { if (a.mid && b.mid) return a.mid.localeCompare(b.mid); return a.mid ? -1 : 1; }, render: (mid: string) => mid || <Tag color="error">MID Not Provided</Tag> },
    { key: 4, title: "DBA", dataIndex: "dba", width: "200px", sorter: (a: any, b: any) => { if (a.dba && b.dba) return a.dba.localeCompare(b.dba); return a.dba ? -1 : 1; }, render: (dba: string) => dba || <Tag color="error">DBA Not Provided</Tag> },
    { key: 5, title: "Volume", dataIndex: "volume", width: "150px", sorter: (a: any, b: any) => a.volume - b.volume, render: (v: number) => formatCurrency(v) },
    { key: 6, title: "Total Residual", dataIndex: "total_residual", width: "200px", sorter: (a: any, b: any) => a.total_residual - b.total_residual, render: (v: number) => formatCurrency(v) },
    { key: 7, title: "PayDiverse Residual", dataIndex: "paydiverse_residual", width: "200px", sorter: (a: any, b: any) => a.paydiverse_residual - b.paydiverse_residual, render: (v: number) => formatCurrency(v) },
    { key: 8, title: "Agent 1 Name", dataIndex: "agent1_name", width: "200px", sorter: (a: any, b: any) => { if (a.agent1_name && b.agent1_name) return a.agent1_name.localeCompare(b.agent1_name); return a.agent1_name ? -1 : 1; }, render: (v: string) => v || <Tag color="error">Not Provided</Tag> },
    { key: 9, title: "Agent 1 Percentage", dataIndex: "agent1_percentage", width: "150px", sorter: (a: any, b: any) => (a?.agent1_percentage || 0) - (b?.agent1_percentage || 0), render: (v: number) => v ? v + "%" : "0.00%" },
    { key: 10, title: "Agent 1 Payout", dataIndex: "agent1_payout", width: "150px", sorter: (a: any, b: any) => (a?.agent1_payout || 0) - (b?.agent1_payout || 0), render: (v: number) => v ? formatCurrency(v) : "$0.00" },
    { key: 11, title: "Agent 2 Name", dataIndex: "agent2_name", width: "200px", sorter: (a: any, b: any) => { if (a.agent2_name && b.agent2_name) return a.agent2_name.localeCompare(b.agent2_name); return a.agent2_name ? -1 : 1; }, render: (v: string) => v || <Tag color="error">Not Provided</Tag> },
    { key: 12, title: "Agent 2 Percentage", dataIndex: "agent2_percentage", width: "150px", sorter: (a: any, b: any) => (a?.agent2_percentage || 0) - (b?.agent2_percentage || 0), render: (v: number) => v ? v : "0.00%" },
    { key: 13, title: "Agent 2 Payout", dataIndex: "agent2_payout", width: "150px", sorter: (a: any, b: any) => (a?.agent2_payout || 0) - (b?.agent2_payout || 0), render: (v: number) => v ? formatCurrency(v) : "$0.00" },
    { key: 14, title: "Action", width: "100px", align: "center", render: (record: LogsTableColumns) => (<><Tooltip title={"Click to edit record"}><EditOutlined style={{fontSize:18,color:"var(--primary-color)",marginRight:10}} onClick={() => handleEdit(record)}/></Tooltip><Tooltip title={"Click to delete record"}><DeleteOutlined style={{fontSize:18,color:"var(--red-color)"}} onClick={() => handleDelete(record)}/></Tooltip></>) },
  ];

  const handleEdit = (record: LogsTableColumns) => { setRecord(record); setIsModalVisible(true); };
  const handleOk = () => { setIsModalVisible(false); queryClient.invalidateQueries(["fetchLogs"]); };
  const handleCancel = () => setIsModalVisible(false);
  if (error) message.error("Error fetching logs data");

  return (
    <>
      <Row align="middle">
        <Col span={6}>
          <Select size="large" placeholder="Select Time" optionLabelProp="label" showSearch defaultValue={1} onChange={(value: number) => setDay(value)} filterOption={(input: any, option: any) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())} options={[{value:1,label:"Last 1 Day"},{value:7,label:"Last 7 Days"},{value:14,label:"Last 14 Days"},{value:30,label:"Last 30 Days"},{value:45,label:"Last 45 Days"},{value:60,label:"Last 60 Days"},{value:90,label:"Last 90 Days"},{value:120,label:"Last 120 Days"}]} />
        </Col>
      </Row>
      <Table size="middle" loading={isLoading} dataSource={data} columns={columns} scroll={{x:"max-content"}} />
      {isModalVisible && <EditModalComponent onOk={handleOk} onCancel={handleCancel} record={record} />}
    </>
  );
};

export default LogTable;
