import { useQuery } from "react-query";
import { Col, message, Row, Table, Tag, Input, Button, TablePaginationConfig } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useState } from "react";
import * as XLSX from "xlsx";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import formatCurrency from "../../utils/formatCurrency";
import client from "../../utils/axios";
import ModalComponent from "../modals/ModalComponent";
import ZeroVolumeISOModal from "../modals/ZeroVolumeIsoModal";

const { Search } = Input;

interface RevenuePerCorporationTableProps { date: string | string[]; }
interface RevenuePerCorporationColumns { corporation: string; paydiverse_residual: number; volume: number; }

const RevenuePerCorporationTable: React.FC<RevenuePerCorporationTableProps> = ({ date }) => {
  const [searchText, setSearchText] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>();
  const [record, setRecord] = useState<RevenuePerCorporationColumns>();
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [currentTableData, setCurrentTableData] = useState<RevenuePerCorporationColumns[]>([]);
  const columns: any = [
    { key: 1, title: "Corporation", dataIndex: "corporation", width: "400px", sorter: (a: any, b: any) => { if (a.corporation && b.corporation) return a.corporation.localeCompare(b.corporation); return a.corporation ? -1 : 1; }, render: (v: string) => v || <Tag color="error">Corporation Not Provided</Tag> },
    { key: 2, title: "Volume", dataIndex: "volume", width: "250px", sorter: (a: any, b: any) => a.volume - b.volume, render: (v: any) => formatCurrency(v || 0) },
    { key: 3, title: "PayDiverse Residual", dataIndex: "paydiverse_residual", width: "250px", sorter: (a: any, b: any) => a.paydiverse_residual - b.paydiverse_residual, render: (v: any) => formatCurrency(v) },
  ];
  const fetchRevenuePerCorporation = async (date: string | string[]) => {
    const { data } = await client.get(`/revenue-per-corporation`, { params: { date } });
    setCurrentTableData(data);
    return data;
  };
  const { data, error } = useQuery(["fetchRevenuePerCorporation", date], () => fetchRevenuePerCorporation(date), { enabled: !!date });

  const handleCancel = () => setIsOpen(false);
  const handleRowClick = (record: RevenuePerCorporationColumns) => { setRecord(record); setIsOpen(true); };

  const handleDownload = () => {
    const tableData = currentTableData && currentTableData.length > 0 ? currentTableData?.filter((i: any) => (i.corporation||"").toLowerCase().includes(searchText.toLowerCase())) : data?.filter((i: any) => (i.corporation||"").toLowerCase().includes(searchText.toLowerCase()));
    const formattedData = tableData?.map((item: any) => ({ Corporation: item.corporation || "-", Volume: item.volume ? Number(item.volume) : 0.0, "PayDiverse Residual": item.paydiverse_residual ? Number(item.paydiverse_residual) : 0.0 }));
    const worksheet = XLSX.utils.json_to_sheet(formattedData || [], {header:["Corporation","Volume","PayDiverse Residual"]});
    worksheet["!cols"] = [{wch:30},{wch:30},{wch:20}];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue Per Corporation Data");
    XLSX.writeFile(workbook, `Revenue-Per-Corporation-${date}.xlsx`);
    message.success("File downloaded successfully");
  };

  if (error) message.error("Error Fetching data");

  return (
    <>
      <Row><Col><h2>Revenue Per Corporation</h2></Col></Row>
      <Row><Col span={24}><Button className="download-btn" type="primary" onClick={() => setIsVisible(true)}>Zero Volume ISO's</Button></Col></Row>
      <Row gutter={[16,16]} justify="space-between">
        <Col span={8}><Search size="large" placeholder={"Search"} allowClear enterButton onSearch={(v) => setSearchText(v)} onChange={(e) => setSearchText(e.target.value)} /></Col>
        <Col span={8} style={{display:"flex",justifyContent:"flex-end"}}><Button className="download-btn" type="primary" onClick={handleDownload} disabled={!data || data.length === 0}>Download as XLSX <DownloadOutlined/></Button></Col>
      </Row>
      <Table dataSource={data?.filter((item: any) => (item.corporation||"").toLowerCase().includes(searchText.toLowerCase()))}
        onChange={(_p: TablePaginationConfig, _f: Record<string, FilterValue | null>, _s: SorterResult<any> | SorterResult<any>[], extra: {currentDataSource?: any[]}) => { setCurrentTableData(extra.currentDataSource || []); }}
        columns={columns} rowClassName="row" onRow={(record: any) => ({onClick:()=>handleRowClick(record)})} />
      {isOpen && record && <ModalComponent isOpen={isOpen} apiNumber={2} date={date} onCancel={handleCancel} title={record.corporation} />}
      {isVisible && <ZeroVolumeISOModal onClose={() => setIsVisible(false)} />}
    </>
  );
};

export default RevenuePerCorporationTable;
