// @ts-nocheck
import { useEffect, useState, useRef } from "react";
import { Card, Row, Col, Table, Select, DatePicker, Button, Typography, Space, Statistic, Tabs, Input } from "antd";
import { FileExcelOutlined, SearchOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { supabase } from "../../utils/supabase";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
const { Title, Text } = Typography;
const { Option } = Select;
const fmt = (n) => n != null ? `$${Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '--';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isos, setIsos] = useState([]);
  const [residuals, setResiduals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIso, setSelectedIso] = useState(undefined);
  const LATEST_MONTH = '2026-07-01'; // latest month with residual data
  const [selectedMonth, setSelectedMonth] = useState(LATEST_MONTH);
  const [activeTab, setActiveTab] = useState('residuals');
  const [allTimeRevenue, setAllTimeRevenue] = useState(0);
  const [allTimeVolume, setAllTimeVolume] = useState(0);
  const searchInput = useRef(null);

  const totalRevenue = residuals.reduce((s,r)=>s+(r.paydiversenet||0),0);
  const totalVolume = residuals.reduce((s,r)=>s+(r.gross_volume||0),0);
  const activeMids = new Set(residuals.map(r=>r.mid)).size;

  useEffect(()=>{fetchIsos();},[]);
  useEffect(()=>{fetchResiduals();},[selectedIso,selectedMonth]);
  useEffect(()=>{
    const fetchAllTime=async()=>{
      const data=await fetchAllRows(supabase.from('residuals').select('paydiversenet,gross_volume'));
      setAllTimeRevenue(data.reduce((s,r)=>s+(r.paydiversenet||0),0));
      setAllTimeVolume(data.reduce((s,r)=>s+(r.gross_volume||0),0));
    };
    fetchAllTime();
  },[]);

  const fetchIsos=async()=>{const{data}=await supabase.from('isos').select('*').eq('status','active').order('name');if(data)setIsos(data);};
  const fetchAllRows=async(base)=>{let all=[],from=0;while(true){const{data:batch}=await base.range(from,from+999);if(!batch||batch.length===0)break;all=all.concat(batch);if(batch.length<1000)break;from+=1000;}return all;};const fetchResiduals=async()=>{setLoading(true);let q=supabase.from('residuals').select('*,isos(id,name,slug)').order('report_month',{ascending:false});if(selectedIso)q=q.eq('iso_id',selectedIso);if(selectedMonth)q=q.eq('report_month',selectedMonth);const data=await fetchAllRows(q);setResiduals(data);setLoading(false);};

  const getSearchProps=(dataIndex,label)=>({
    filterDropdown:({setSelectedKeys,selectedKeys,confirm,clearFilters})=>(<div style={{padding:8,minWidth:200}}><Input ref={searchInput} placeholder={`Search ${label}`} value={selectedKeys[0]} onChange={e=>setSelectedKeys(e.target.value?[e.target.value]:[])} onPressEnter={confirm} style={{marginBottom:8,display:'block'}}/><Space><Button type="primary" onClick={confirm} icon={<SearchOutlined/>} size="small" style={{width:90}}>Search</Button><Button onClick={()=>{clearFilters();confirm();}} size="small" style={{width:90}}>Reset</Button></Space></div>),
    filterIcon:filtered=><SearchOutlined style={{color:filtered?'var(--primary-color)':undefined}}/>,
    onFilter:(value,record)=>String(record[dataIndex]||'').toLowerCase().includes(String(value).toLowerCase()),
    onFilterDropdownOpenChange:open=>{if(open)setTimeout(()=>searchInput.current?.select(),100);},
  });

  const rCols=[
    {title:'Month',dataIndex:'report_month',key:'m',width:100,render:v=>v?dayjs(v).format('MMM YYYY'):'--',filters:[...new Set(residuals.map(r=>r.report_month).filter(Boolean))].sort().reverse().map(m=>({text:dayjs(m).format('MMM YYYY'),value:m})),onFilter:(v,r)=>r.report_month===v},
    {title:'ISO',key:'iso',width:120,render:(_,r)=>r.isos?.name||'--',filters:[...new Set(residuals.map(r=>r.isos?.name).filter(Boolean))].sort().map(n=>({text:n,value:n})),onFilter:(v,r)=>r.isos?.name===v},
    {title:'MID',dataIndex:'mid',key:'mid',width:120,...getSearchProps('mid','MID'),render:v=><Text style={{fontWeight:600,fontSize:13}}>{v||'--'}</Text>},
    {title:'Business Name',dataIndex:'business_name',key:'biz',width:170,...getSearchProps('business_name','Business'),render:v=><Text style={{fontSize:13}}>{v||'--'}</Text>},
    {title:'Volume',dataIndex:'gross_volume',key:'vol',width:120,align:'right',render:v=>fmt(v),sorter:(a,b)=>(a.gross_volume||0)-(b.gross_volume||0)},
    {title:'Gross Rev',dataIndex:'gross_revenue',key:'gr',width:120,align:'right',render:v=>fmt(v),sorter:(a,b)=>(a.gross_revenue||0)-(b.gross_revenue||0)},
    {title:'PayDiverse Net',dataIndex:'paydiversenet',key:'pd',width:130,align:'right',sorter:(a,b)=>(a.paydiversenet||0)-(b.paydiversenet||0),render:v=><span style={{color:v>0?'#059669':'#dc2626',fontWeight:600}}>{fmt(v)}</span>},
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
        <Button size="small" onClick={()=>setSelectedMonth(dayjs().startOf('month').format('YYYY-MM-DD'))} style={{color:'var(--primary-color)',fontSize:12,fontWeight:600}}>Current Month</Button>
        {selectedMonth&&<Text style={{color:'var(--muted-color)',fontSize:12}}>Showing data for <strong>{dayjs(selectedMonth).format('MMMM YYYY')}</strong></Text>}
      </div>
      <div style={{marginBottom:16,background:'linear-gradient(135deg,#0f2040 0%,#1d4ed8 100%)',borderRadius:12,padding:'20px 28px',boxShadow:'0 4px 20px rgba(15,32,64,0.3)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
          <div>
            <div style={{color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:500,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.5px'}}>All Time Total Revenue</div>
            <div style={{color:'#fff',fontSize:34,fontWeight:800,letterSpacing:'-0.5px'}}>{fmt(allTimeRevenue)}</div>
            <div style={{color:'rgba(255,255,255,0.55)',fontSize:12,marginTop:4}}>Jan 2026 – Jul 2026 · All ISOs combined</div>
          </div>
          <div style={{display:'flex',gap:32,flexWrap:'wrap'}}>
            <div style={{textAlign:'center'}}>
              <div style={{color:'rgba(255,255,255,0.6)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:2}}>Total Processed Volume</div>
              <div style={{color:'#fff',fontSize:20,fontWeight:700}}>{fmt(allTimeVolume)}</div>
            </div>
          </div>
        </div>
      </div>
      <Row gutter={16} style={{marginBottom:20}}>
        {[{title:'PayDiverse Net Income',value:totalRevenue,prefix:'$',precision:2,color:'var(--primary-color)'},{title:'Total Volume (Processed)',value:totalVolume,prefix:'$',precision:2,color:'#6b7a99'},{title:'Active MIDs',value:activeMids,precision:0,color:'var(--primary-color)'}].map(({title,value,prefix,precision,color})=>(
          <Col span={8} key={title}><Card><Statistic title={title} value={value} prefix={prefix} precision={precision} valueStyle={{color,fontWeight:700}}/></Card></Col>
        ))}
      </Row>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {key:'residuals',label:`Residuals (${residuals.length})`,children:(
          <><Card style={{marginBottom:12}}><Space wrap><Select placeholder="All ISOs" allowClear style={{width:200}} onChange={v=>setSelectedIso(v)}>{isos.map(iso => <Option key={iso.id} value={iso.id}>{iso.name}</Option>)}</Select><Text style={{color:'var(--muted-color)',fontSize:12}}>{residuals.length} rows</Text></Space></Card>
          {residuals.length===0&&!loading?(<Card><div style={{textAlign:'center',padding:'60px 20px',color:'var(--muted-color)'}}><FileExcelOutlined style={{fontSize:40,marginBottom:12,display:'block'}}/><div style={{fontSize:16,fontWeight:600,marginBottom:8}}>No residual data yet</div><Button type="primary" onClick={()=>navigate('/home/import-data')}>Import Report</Button></div></Card>):(<Card><Table dataSource={residuals} columns={rCols} rowKey="id" loading={loading} pagination={{pageSize:50,showTotal:t=>`${t} rows`}} scroll={{x:960}} size="small"/></Card>)}</>
        )},
      ]}/>
    </div>
  );
};
export default Dashboard;
