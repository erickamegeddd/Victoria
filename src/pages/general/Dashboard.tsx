// @ts-nocheck
import { useEffect, useState, useRef } from "react";
import { Card, Row, Col, Table, Select, DatePicker, Button, Typography, Space, Statistic, Tabs, Tag, Input } from "antd";
import { FileExcelOutlined, BankOutlined, SearchOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { supabase } from "../../utils/supabase";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
const { Title, Text } = Typography;
const { Option } = Select;
const fmt = (n) => n != null ? `$${Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '—';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isos, setIsos] = useState([]);
  const [residuals, setResiduals] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingM, setLoadingM] = useState(true);
  const [selectedIso, setSelectedIso] = useState(undefined);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [activeTab, setActiveTab] = useState('residuals');
  const searchInput = useRef(null);

  const totalRevenue = residuals.reduce((s,r)=>s+(r.paydiversenet||0),0);
  const totalVolume = residuals.reduce((s,r)=>s+(r.gross_volume||0),0);
  const activeMids = new Set(residuals.map(r=>r.mid)).size;

  useEffect(()=>{fetchIsos();fetchMerchants();},[]);
  useEffect(()=>{fetchResiduals();},[selectedIso,selectedMonth]);

  const fetchIsos=async()=>{const{data}=await supabase.from('isos').select('*').eq('status','active').order('name');if(data)setIsos(data);};
  const fetchResiduals=async()=>{setLoading(true);let q=supabase.from('residuals').select('*,isos(id,name,slug)').order('report_month',{ascending:false}).limit(500);if(selectedIso)q=q.eq('iso_id',selectedIso);if(selectedMonth)q=q.eq('report_month',selectedMonth);const{data}=await q;if(data)setResiduals(data);setLoading(false);};
  const fetchMerchants=async()=>{setLoadingM(true);const{data}=await supabase.from('merchants').select('*,isos(name,slug)').order('business_name');if(data)setMerchants(data);setLoadingM(false);};

  const isoGroups=merchants.reduce((a,m)=>{const n=m.isos?.name||'Unknown';a[n]=(a[n]||0)+1;return a;},{});

  const getSearchProps=(dataIndex,label)=>({
    filterDropdown:({setSelectedKeys,selectedKeys,confirm,clearFilters})=>(<div style={{padding:8,minWidth:200}}><Input ref={searchInput} placeholder={`Search ${label}`} value={selectedKeys[0]} onChange={e=>setSelectedKeys(e.target.value?[e.target.value]:[])} onPressEnter={confirm} style={{marginBottom:8,display:'block'}}/><Space><Button type="primary" onClick={confirm} icon={<SearchOutlined/>} size="small" style={{width:90}}>Search</Button><Button onClick={()=>{clearFilters();confirm();}} size="small" style={{width:90}}>Reset</Button></Space></div>),
    filterIcon:filtered=><SearchOutlined style={{color:filtered?'var(--primary-color)':undefined}}/>,
    onFilter:(value,record)=>String(record[dataIndex]||'').toLowerCase().includes(String(value).toLowerCase()),
    onFilterDropdownOpenChange:open=>{if(open)setTimeout(()=>searchInput.current?.select(),100);},
  });

  const rCols=[
    {title:'Month',dataIndex:'report_month',key:'m',width:100,render:v=>v?dayjs(v).format('MMM YYYY'):'—',filters:[...new Set(residuals.map(r=>r.report_month).filter(Boolean))].sort().reverse().map(m=>({text:dayjs(m).format('MMM YYYY'),value:m})),onFilter:(v,r)=>r.report_month===v},
    {title:'ISO',key:'iso',width:120,render:(_,r)=>r.isos?.name||'—',filters:[...new Set(residuals.map(r=>r.isos?.name).filter(Boolean))].sort().map(n=>({text:n,value:n})),onFilter:(v,r)=>r.isos?.name===v},
    {title:'MID / Business',dataIndex:'mid',key:'mid',width:160,...getSearchProps('mid','MID'),render:(v,r)=><div><div style={{fontWeight:600}}>{v}</div><div style={{fontSize:11,color:'var(--muted-color)'}}>{r.business_name||''}</div></div>},
    {title:'Volume',dataIndex:'gross_volume',key:'vol',width:120,align:'right',render:v=>fmt(v),sorter:(a,b)=>(a.gross_volume||0)-(b.gross_volume||0)},
    {title:'Gross Rev',dataIndex:'gross_revenue',key:'gr',width:120,align:'right',render:v=>fmt(v),sorter:(a,b)=>(a.gross_revenue||0)-(b.gross_revenue||0)},
    {title:'PayDiverse Net',dataIndex:'paydiversenet',key:'pd',width:130,align:'right',sorter:(a,b)=>(a.paydiversenet||0)-(b.paydiversenet||0),render:v=><span style={{color:v>0?'#059669':'#dc2626',fontWeight:600}}>{fmt(v)}</span>},
  ];

  const mCols=[
    {title:'MID',dataIndex:'mid',key:'mid',width:160,...getSearchProps('mid','MID')},
    {title:'Business Name',dataIndex:'business_name',key:'dba',ellipsis:true,...getSearchProps('business_name','Business Name')},
    {title:'ISO',key:'iso',width:130,render:(_,r)=>r.isos?.name||'—',filters:[...new Set(merchants.map(m=>m.isos?.name).filter(Boolean))].sort().map(n=>({text:n,value:n})),onFilter:(v,r)=>r.isos?.name===v,filterSearch:true},
    {title:'Status',dataIndex:'status',key:'s',width:100,filters:[{text:'Active',value:'active'},{text:'Inactive',value:'inactive'}],onFilter:(v,r)=>r.status===v,render:v=><Tag color={v==='active'?'green':'default'}>{v?v.charAt(0).toUpperCase()+v.slice(1):'Unknown'}</Tag>},
    {title:'Notes',dataIndex:'notes',key:'n',ellipsis:true,...getSearchProps('notes','Notes'),render:v=><span style={{color:'var(--muted-color)',fontSize:11}}>{v||'—'}</span>},
  ];

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <Title level={4} style={{margin:0}}>Victoria Dashboard</Title>
        <Button type="primary" icon={<FileExcelOutlined/>} onClick={()=>navigate('/home/import-data')}>Import Report</Button>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
        <Button icon={<LeftOutlined/>} size="small" onClick={()=>{const prev=dayjs(selectedMonth||dayjs().startOf('month')).subtract(1,'month').startOf('month').format('YYYY-MM-DD');setSelectedMonth(prev);}}/>
        <DatePicker picker="month" value={selectedMonth?dayjs(selectedMonth):null} onChange={d=>setSelectedMonth(d?d.startOf('month').format('YYYY-MM-DD'):undefined)} format="MMMM YYYY" allowClear={false} style={{width:160}}/>
        <Button icon={<RightOutlined/>} size="small" onClick={()=>{const next=dayjs(selectedMonth||dayjs().startOf('month')).add(1,'month').startOf('month').format('YYYY-MM-DD');setSelectedMonth(next);}}/>
        <Button size="small" onClick={()=>setSelectedMonth(undefined)} style={{color:'var(--muted-color)',fontSize:12}}>All Time</Button>
        {selectedMonth&&<Text style={{color:'var(--muted-color)',fontSize:12}}>Showing data for <strong>{dayjs(selectedMonth).format('MMMM YYYY')}</strong></Text>}
      </div>
      <Row gutter={16} style={{marginBottom:20}}>
        {[{title:'PayDiverse Net Income',value:totalRevenue,prefix:'$',precision:2,color:'var(--primary-color)'},{title:'Total Volume (Processed)',value:totalVolume,prefix:'$',precision:2,color:'#6b7a99'},{title:'Active MIDs',value:activeMids,precision:0,color:'var(--primary-color)'},{title:'Total Merchants',value:merchants.length,precision:0,color:'#6b7a99'}].map(({title,value,prefix,precision,color})=>(
          <Col span={6} key={title}><Card><Statistic title={title} value={value} prefix={prefix} precision={precision} valueStyle={{color,fontWeight:700}}/></Card></Col>
        ))}
      </Row>
      {Object.keys(isoGroups).length>0&&<Card style={{marginBottom:16}}><Space wrap><Text style={{color:'var(--muted-color)',fontSize:12,fontWeight:700,textTransform:'uppercase'}}>Merchants by ISO:</Text>{Object.entries(isoGroups).map(([iso,count])=><Tag key={iso} color="blue" icon={<BankOutlined/>}>{iso}: {count}</Tag>)}</Space></Card>}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {key:'residuals',label:`Residuals (${residuals.length})`,children:(
          <><Card style={{marginBottom:12}}><Space wrap><Select placeholder="All ISOs" allowClear style={{width:200}} onChange={v=>setSelectedIso(v)}>{isos.map(iso => <Option key={iso.id} value={iso.id}>{iso.name}</Option>)}</Select><Text style={{color:'var(--muted-color)',fontSize:12}}>{residuals.length} rows</Text></Space></Card>
          {residuals.length===0&&!loading?(<Card><div style={{textAlign:'center',padding:'60px 20px',color:'var(--muted-color)'}}><FileExcelOutlined style={{fontSize:40,marginBottom:12,display:'block'}}/><div style={{fontSize:16,fontWeight:600,marginBottom:8}}>No residual data yet</div><Button type="primary" onClick={()=>navigate('/home/import-data')}>Import Report</Button></div></Card>):(<Card><Table dataSource={residuals} columns={rCols} rowKey="id" loading={loading} pagination={{pageSize:50,showTotal:t=>`${t} rows`}} scroll={{x:900}} size="small"/></Card>)}</>
        )},
        {key:'merchants', label:`Merchants (${merchants.length})`,children:<Card><Table dataSource={merchants} columns={mCols} rowKey="id" loading={loadingM} pagination={{pageSize:50,showTotal:t=>`${t} merchants`}} size="small"/></Card>},
      ]}/>
    </div>
  );
};
export default Dashboard;
