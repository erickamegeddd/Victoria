import {
  message,
  Table,
  Tag,
  Input,
  Row,
  Col,
  Button,
  Tooltip,
  Modal,
} from "antd";
import { useQuery } from "react-query";
import client from "../../utils/axios";
import { useEffect, useRef, useState } from "react";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../ui/LoadingSpinner";

const { Search } = Input;
const { confirm } = Modal;

interface MerchantsTable {
  agent1_name: string | null;
  agent1_split: string | null;
  agent2_name: string | null;
  agent2_split: string | null;
  approval_date: string | null;
  closed_date: string | null;
  corporation: string | null;
  operating_partner: string | null;
  dba: string;
  is_active: number;
  is_referred: number;
  iso: string;
  iso_referral_type: string | null;
  mid: string;
}

interface MerchantResponse {
  page: number;
  per_page: number;
  total_records: number;
  total_pages: number;
  data: MerchantsTable[];
}

const MerchantsTable = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef<any>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    const delay = setTimeout(() => { setSearchQuery(searchText); setPage(1); }, 500);
    return () => clearTimeout(delay);
  }, [searchText]);

  useEffect(() => {
    if (searchInputRef.current) searchInputRef.current.focus();
  }, [searchQuery]);

  const fetchMerchantsData = async ({ queryKey }: { queryKey: any }) => {
    const [_key, currentPage, perPage, search] = queryKey;
    const { data } = await client.get<MerchantResponse>(`/merchants?page=${currentPage}&per_page=${perPage}&search=${encodeURIComponent(search as string)}`);
    return data;
  };

  const { data: merchantsData, isLoading: isMerchantsLoading, isFetching, error: merchantsError } = useQuery(["fetchMerchantsData", page, pageSize, searchQuery], fetchMerchantsData);

  const deleteMerchant = async (mid: string) => {
    try {
      await client.delete(`/merchants/${mid}`);
      message.success("Merchant deleted successfully");
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to delete merchant");
    }
  };

  const showDeleteConfirm = (mid: string) => {
    confirm({ title: "Are you sure you want to delete this merchant?", content: `This action will permanently delete MID: ${mid}.`, okText: "Yes", okType: "danger", cancelText: "No", onOk() { deleteMerchant(mid); } });
  };

  if (merchantsError) message.error("Error fetching data");

  const columns: any = [
    { key: 1, title: "MID", dataIndex: "mid", width: "250px", sorter: (a: any, b: any) => a.mid.localeCompare(b.mid), render: (mid: string) => mid || <Tag color="error">MID Not Provided</Tag> },
    { key: 2, title: "ISO", dataIndex: "iso", width: "200px", sorter: (!a: any, b: any) => a.iso.localeCompare(b.iso), render: (iso: string) => iso || <Tag color="error">ISO Not Provided</Tag> },
    { key: 3, title: "DBA", dataIndex: "dba", width: "300px", sorter: (a: any, b: any) => a.dba.localeCompare(b.dba), render: (dba: string) => dba || <Tag color="error">DBA Not Provided</Tag> },
    { key: 4, title: "Corporation", dataIndex: "corporation", width: "300px", sorter: (a: any, b: any) => (a?.corporation || "").localeCompare(b?.corporation || ""), render: (v: string) => v || <Tag color="error">Not Provided</Tag> },
    { key: 5, title: "Operating Partner", dataIndex: "operating_partner", width: "300px", sorter: (a: any, b: any) => (a?.operating_partner || "").localeCompare(b?.operating_partner || ""), render: (v: string) => v || <Tag color="error">Not Provided</Tag> },
    { key: 6, title: "Active", dataIndex: "is_active", width: "100px", filters: [{text:"Yes",value:1},{text:"No",value:0}], onFilter: (value: number, record: any) => record.is_active === value, render: (v: number) => v ? <Tag color="green">Yes</Tag> : <Tag color="error">No</Tag> },
    { key: 7, title: "Agent", dataIndex: "is_referred", width: "100px", filters: [{text:"Yes",value:1},{text:"No",value:0}], onFilter: (value: number, record: any) => record.is_referred === value, render: (v: number) => v ? <Tag color="green">Yes</Tag> : <Tag color="error">No</Tag> },
    { key: 8, title: "ISO Referral Type", dataIndex: "iso_referral_type", width: "200px", filters: [{text:"MID"value:"MID"},{text:"Gateway",value:"Gateway"},{text:"3rd Party",value:"3rd Party"}], onFilter: (value: any, record: any) => record.iso_referral_type === value, render: (v: string) => v ? <Tag color="blue" style={{color:"var(--navy-color)"}}>{v}</Tag> : <Tag color="error">Not Provided</Tag> },
    { key: 9, title: "Approval Date", dataIndex: "approval_date", width: "150px", sorter: (a: any, b: any) => dayjs(a.approval_date || 0).valueOf() - dayjs(b.approval_date || 0).valueOf(), render: (v: string) => v ? dayjs(v).format("YYYY-MM-DD") : <Tag color="error">Not Provided</Tag> },
    { key: 10, title: "Termination Date", dataIndex: "closed_date", width: "150px", sorter: (a: any, b: any) => dayjs(a.closed_date || 0).valueOf() - dayjs(b.closed_date || 0).valueOf(), render: (v: string) => v ? dayjs(v).format("YYYY-MM-DD") : <Tag color="error">Not Provided</Tag> },
    { key: 11, title: "Action", width: "100px", align: "center", render: (record: any) => (<><Tooltip title="Click to edit record"><EditOutlined style={{fontSize:18,color:"var(--primary-color)",marginRight:10}} onClick={() => navigate(`/home/merchants/${record.mid}`)}/></Tooltip><Tooltip title="Click to delete record"><DeleteOutlined style={{fontSize:18,color:"var(--red-color)"}} onClick={() => showDeleteConfirm(record.mid)}/></Tooltip></>) },
  ];

  return (
    <>
      <LoadingSpinner isLoading={isMerchantsLoading || isFetching} />
      <Row align="middle" justify="space-between">
        <Col span={8}>
          <Search ref={searchInputRef} size="large" placeholder="Search" allowClear enterButton onSearch={(value) => setSearchText(value)} onChange={(e) => setSearchText(e.target.value)} />
        </Col>
        <Col><Button className="add-btn" type="primary" onClick={() => navigate(`/home/merchants/new`)}>Add New MID <PlusOutlined/></Button></Col>
      </Row>
      <Table loading={isMerchantsLoading || isFetching} dataSource={merchantsData?.data} columns={columns} scroll={{x:"max-content"}} rowKey="mid"
        pagination={{current:page,pageSize:pageSize,total:merchantsData?.total_records||0,showSizeChanger:true,onChange:(newPage,newSize)=>{setPage(newPage);setPageSize(newSize);}}}
        onRow={(record: any) => ({onClick:()=>navigate(`/home/merchants/${record.mid}`)})}
        rowClassName="row" />
    </>
  );
};

export default MerchantsTable;
