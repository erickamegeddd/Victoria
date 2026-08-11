// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, Row, Col, Tabs, Button, DatePicker, Typography, Space, Statistic, Tag, Alert, Spin, Radio, Select, Tooltip } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, WarningOutlined, UserDeleteOutlined, UserAddOutlined, BulbOutlined } from "@ant-design/icons";
import { supabase } from "../../utils/supabase";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
dayjs.extend(quarterOfYear);
const { Title, Text } = Typography;
const { Option } = Select;
const fmt = (n) => n != null ? `$${Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '—';
const fmtShort = (n) => {if(n==null)return'—';const abs=Math.abs(n);if(abs>=1000000)return`$${(n/1000000).toFixed(1)}M`;if(abs>=1000)return`$${(n/1000).toFixed(1)}K`;return fmt(n);};

const generateSummary = (iso, periodLabel) => {
  const parts = [];
  if(iso.netChange > 0) parts.push(`Net income is up ${fmtShort(iso.netChange)} vs last period.`);
  else if(iso.netChange < 0) parts.push(`Net income dropped ${fmtShort(Math.abs(iso.netChange))} vs last period.`);
  else parts.push(`Net income is flat vs last period.`);
  if(iso.volumeChange > 0) parts.push(`Volume grew ${fmtShort(iso.volumeChange)}.`);
  else if(iso.volumeChange < 0) parts.push(`Volume declined ${fmtShort(Math.abs(iso.volumeChange))}.`);
  if(iso.merchantsLeft > 0) parts.push(`${iso.merchantsLeft} merchant${iso.merchantsLeft>1?'s':''} left.`);
  if(iso.merchantsJoined > 0) parts.push(`${iso.merchantsJoined} new merchant${iso.merchantsJoined>1?'s':''} joined.`);
  if(iso.activeMids === 0) parts.push(`No active MIDs in this period.`);
  return parts.join(' ') || 'No change data available.';
};

const ChangeMetric = ({value, label, prefix='$'}) => {
  if(value == null) return null;
  const color = value > 0 ? '#059669' : value < 0 ? '#dc2626' : '#6b7280';
  const icon = value > 0 ? <ArrowUpOutlined/> : value < 0 ? <ArrowDownOutlined/> : <MinusOutlined/>;
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:4,color,fontSize:13,fontWeight:600}}>
      {icon}
      <span>{prefix==='$'?fmtShort(Math.abs(value)):Math.abs(value)}</span>
      {label&&<Text style={{color:'#9ca3af',fontSize:11,fontWeight:400}}>{label}</Text>}
    </div>
  );
};

const StatusBadge = ({trend}) => {
  if(trend==='up') return <Tag color="green" icon={<ArrowUpOutlined/>}>Growth</Tag>;
  if(trend==='down') return <Tag color="red" icon={<ArrowDownOutlined/>}>Decline</Tag>;
  return <Tag color="default" icon={<MinusOutlined/>}>Flat</Tag>;
};

const ISOCard = ({iso, onClick, active}) => (
  <Card
    size="small"
    style={{marginBottom:12,border:active?'2px solid var(--primary-color)':'1px solid var(--line-color)',cursor:'pointer',transition:'all 0.2s'}}
    onClick={onClick}
    hoverable
  >
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
      <div>
        <Text strong style={{fontSize:15}}>{iso.name}</Text>
        <div style={{marginTop:2}}><StatusBadge trend={iso.trend}/></div>
      </div>
      <div style={{textAlign:'right'}}>
        <div style={{fontSize:18,fontWeight:700,color:'var(--primary-color)'}}>{fmtShort(iso.currentNet)}</div>
        <Text style={{fontSize:11,color:'var(--muted-color)'}}>net income</Text>
      </div>
    </div>
    <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
      <div><Text style={{fontSize:11,color:'var(--muted-color)'}}>vs prev </Text><ChangeMetric value={iso.netChange}/></div>
      <div><Text style={{fontSize:11,color:'var(--muted-color)'}}>volume </Text><ChangeMetric value={iso.volumeChange}/></div>
      <div><Text style={{fontSize:11,color:'var(--muted-color)'}}>MIDs </Text><span style={{fontSize:13,fontWeight:600}}>{iso.activeMids}</span></div>
      {iso.merchantsLeft>0&&<div><Text style={{fontSize:11,color:'#dc2626'}}><UserDeleteOutlined/> {iso.merchantsLeft} left</Text></div>}
      {iso.merchantsJoined>0&&<div><Text style={{fontSize:11,color:'#059669'}}><UserAddOutlined/> {iso.merchantsJoined} joined</Text></div>}
    </div>
    <div style={{marginTop:8,padding:'6px 10px',background:'#f9fafb',borderRadius:6,fontSize:12,color:'#4b5563',display:'flex',gap:6,alignItems:'flex-start'}}>
      <BulbOutlined style={{color:'#f59e0b',marginTop:2,flexShrink:0}}/>
      <span>{generateSummary(iso,'this period')}</span>
    </div>
  </Card>
);

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewData, setOverviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('30');
  const [activeFilter, setActiveFilter] = useState(null);
  const [selectedISO, setSelectedISO] = useState(null);

  // Comparison state
  const [compareBy, setCompareBy] = useState('overall');
  const [comparePeriod, setComparePeriod] = useState('month');
  const [dateA, setDateA] = useState(dayjs().subtract(1,'month').startOf('month'));
  const [dateB, setDateB] = useState(dayjs().startOf('month'));
  const [compResult, setCompResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [isos, setIsos] = useState([]);

  useEffect(()=>{loadOverview();fetchIsos();},[period]);

  const fetchIsos=async()=>{const{data}=await supabase.from('isos').select('*').eq('status','active').order('name');if(data)setIsos(data);};

  const loadOverview=async()=>{
    setLoading(true);
    const days=parseInt(period);
    const cutoff=dayjs().subtract(days,'day').format('YYYY-MM-DD');
    const prevCutoff=dayjs().subtract(days*2,'day').format('YYYY-MM-DD');

    const [{data:currResiduals},{data:prevResiduals},{data:merchants}]=await Promise.all([
      supabase.from('residuals').select('*,isos(id,name)').gte('report_month',cutoff),
      supabase.from('residuals').select('*,isos(id,name)').gte('report_month',prevCutoff).lt('report_month',cutoff),
      supabase.from('merchants').select('*,isos(id,name)').order('created_at'),
    ]);

    const isoMap={};
    (currResiduals||[]).forEach(r=>{
      const id=r.iso_id; if(!id)return;
      if(!isoMap[id])isoMap[id]={id,name:r.isos?.name||'Unknown',currentNet:0,currentVol:0,mids:new Set()};
      isoMap[id].currentNet+=(r.paydiversenet||0);
      isoMap[id].currentVol+=(r.gross_volume||0);
      if(r.mid)isoMap[id].mids.add(r.mid);
    });
    const prevMap={};
    (prevResiduals||[]).forEach(r=>{
      const id=r.iso_id; if(!id)return;
      if(!prevMap[id])prevMap[id]={prevNet:0,prevVol:0};
      prevMap[id].prevNet+=(r.paydiversenet||0);
      prevMap[id].prevVol+=(r.gross_volume||0);
    });

    const currMids={};const prevMids={};
    (currResiduals||[]).forEach(r=>{if(!r.iso_id||!r.mid)return;if(!currMids[r.iso_id])currMids[r.iso_id]=new Set();currMids[r.iso_id].add(r.mid);});
    (prevResiduals||[]).forEach(r=>{if(!r.iso_id||!r.mid)return;if(!prevMids[r.iso_id])prevMids[r.iso_id]=new Set();prevMids[r.iso_id].add(r.mid);});

    const result=Object.values(isoMap).map(iso=>{
      const prev=prevMap[iso.id]||{prevNet:0,prevVol:0};
      const netChange=iso.currentNet-prev.prevNet;
      const volumeChange=iso.currentVol-prev.prevVol;
      const cm=currMids[iso.id]||new Set();
      const pm=prevMids[iso.id]||new Set();
      const merchantsLeft=[...pm].filter(m=>!cm.has(m)).length;
      const merchantsJoined=[...cm].filter(m=>!pm.has(m)).length;
      const trend=netChange>50?'up':netChange<-50?'down':'flat';
      return{...iso,netChange,volumeChange,activeMids:cm.size,merchantsLeft,merchantsJoined,trend,prevNet:prev.prevNet};
    }).sort((a,b)=>b.currentNet-a.currentNet);

    setOverviewData(result);
    setLoading(false);
  };

  const runComparison=async()=>{
    setComparing(true);setCompResult(null);
    let getRange=(d,p)=>{
      if(p==='month')return{start:d.startOf('month').format('YYYY-MM-DD'),end:d.endOf('month').format('YYYY-MM-DD')};
      if(p==='quarter')return{start:d.startOf('quarter').format('YYYY-MM-DD'),end:d.endOf('quarter').format('YYYY-MM-DD')};
      return{start:d.startOf('year').format('YYYY-MM-DD'),end:d.endOf('year').format('YYYY-MM-DD')};
    };
    const rA=getRange(dateA,comparePeriod);
    const rB=getRange(dateB,comparePeriod);
    const [resA,resB]=await Promise.all([
      supabase.from('residuals').select('*,isos(id,name)').gte('report_month',rA.start).lte('report_month',rA.end),
      supabase.from('residuals').select('*,isos(id,name)').gte('report_month',rB.start).lte('report_month',rB.end),
    ]);
    const aggregate=(rows)=>{
      const m={};
      (rows||[]).forEach(r=>{
        const k=compareBy==='overall'?'overall':compareBy==='iso'?r.iso_id:r.mid;
        const label=compareBy==='overall'?'Overall':compareBy==='iso'?(r.isos?.name||r.iso_id):r.mid;
        if(!k)return;
        if(!m[k])m[k]={key:k,label,net:0,volume:0,mids:new Set()};
        m[k].net+=(r.paydiversenet||0);
        m[k].volume+=(r.gross_volume||0);
        if(r.mid)m[k].mids.add(r.mid);
      });
      return m;
    };
    const mA=aggregate(resA.data);const mB=aggregate(resB.data);
    const keys=new Set([...Object.keys(mA),...Object.keys(mB)]);
    const rows=[...keys].map(k=>({
      key:k,
      label:mA[k]?.label||mB[k]?.label||k,
      netA:mA[k]?.net||0,netB:mB[k]?.net||0,
      volA:mA[k]?.volume||0,volB:mB[k]?.volume||0,
      midsA:mA[k]?.mids.size||0,midsB:mB[k]?.mids.size||0,
    })).map(r=>({...r,netDiff:r.netB-r.netA,volDiff:r.volB-r.volA}))
    .sort((a,b)=>Math.abs(b.netDiff)-Math.abs(a.netDiff));
    setCompResult({rows,rangeA:rA,rangeB:rB});
    setComparing(false);
  };

  const totalNet=overviewData.reduce((s,i)=>s+i.currentNet,0);
  const totalVol=overviewData.reduce((s,i)=>s+i.currentVol,0);
  const isosDrop=overviewData.filter(i=>i.trend==='down').length;
  const isosGrowth=overviewData.filter(i=>i.trend==='up').length;
  const totalLeft=overviewData.reduce((s,i)=>s+i.merchantsLeft,0);

  const filtered=activeFilter==='drop'?overviewData.filter(i=>i.trend==='down')
    :activeFilter==='growth'?overviewData.filter(i=>i.trend==='up')
    :activeFilter==='left'?overviewData.filter(i=>i.merchantsLeft>0)
    :overviewData;

  const kpiCards=[
    {label:'Net Income Δ',value:totalNet,fmt:fmtShort,color:'var(--primary-color)',filter:null,sub:'total this period'},
    {label:'ISOs with Drop',value:isosDrop,fmt:v=>v,color:'#dc2626',filter:'drop',sub:'click to filter'},
    {label:'ISOs with Growth',value:isosGrowth,fmt:v=>v,color:'#059669',filter:'growth',sub:'click to filter'},
    {label:'Merchants Left',value:totalLeft,fmt:v=>v,color:'#f59e0b',filter:'left',sub:'vs prev period'},
  ];

  const periodLabel = period==='30'?'Last 30 Days':period==='60'?'Last 60 Days':period==='90'?'Last 90 Days':period==='quarter'?'This Quarter':'This Year';

  return (
    <div>
      <Title level={4} style={{margin:'0 0 16px'}}>Insights & Analytics</Title>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key:'overview',
          label:'Overview',
          children:(
            <div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,flexWrap:'wrap'}}>
                <Text style={{fontWeight:600,color:'var(--muted-color)',fontSize:12}}>PERIOD:</Text>
                <Radio.Group value={period} onChange={e=>setPeriod(e.target.value)} size="small" buttonStyle="solid">
                  <Radio.Button value="30">Last 30 Days</Radio.Button>
                  <Radio.Button value="60">Last 60 Days</Radio.Button>
                  <Radio.Button value="90">Last 90 Days</Radio.Button>
                  <Radio.Button value="quarter">Quarterly</Radio.Button>
                  <Radio.Button value="annual">Annual</Radio.Button>
                </Radio.Group>
                {activeFilter&&<Button size="small" onClick={()=>setActiveFilter(null)}>Clear Filter ✕</Button>}
              </div>
              {loading?<div style={{textAlign:'center',padding:60}}><Spin size="large"/></div>:(
                <>
                  <Row gutter={16} style={{marginBottom:16}}>
                    {kpiCards.map(k=>(
                      <Col span={6} key={k.label}>
                        <Card
                          size="small"
                          hoverable={!!k.filter}
                          onClick={k.filter?()=>setActiveFilter(activeFilter===k.filter?null:k.filter):undefined}
                          style={{cursor:k.filter?'pointer':'default',border:activeFilter===k.filter?`2px solid ${k.color}`:'1px solid var(--line-color)',transition:'all 0.2s'}}
                        >
                          <Statistic title={k.label} value={k.fmt(k.value)} valueStyle={{color:k.color,fontWeight:700}}/>
                          <Text style={{fontSize:11,color:'var(--muted-color)'}}>{k.sub}</Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  <Row gutter={16} style={{marginBottom:16}}>
                    <Col span={12}><Card size="small"><Statistic title="Overall Net Income" value={fmtShort(totalNet)} valueStyle={{color:'var(--primary-color)',fontWeight:700}}/><Text style={{fontSize:11,color:'var(--muted-color)'}}>{periodLabel}</Text></Card></Col>
                    <Col span={12}><Card size="small"><Statistic title="Total Volume" value={fmtShort(totalVol)} valueStyle={{color:'#6b7a99',fontWeight:700}}/><Text style={{fontSize:11,color:'var(--muted-color)'}}>{periodLabel}</Text></Card></Col>
                  </Row>
                  {activeFilter&&<Alert type="info" showIcon style={{marginBottom:12}} message={`Showing ${filtered.length} ISO${filtered.length!==1?'s':''} matching filter: ${activeFilter}`}/>}
                  {filtered.length===0?<Alert type="warning" showIcon message="No data for this period. Try importing reports or changing the period."/>:(
                    filtered.map(iso=><ISOCard key={iso.id} iso={iso} active={selectedISO===iso.id} onClick={()=>setSelectedISO(selectedISO===iso.id?null:iso.id)}/>)
                  )}
                </>
              )}
            </div>
          )
        },
        {
          key:'comparison',
          label:'Comparison',
          children:(
            <div>
              <Card style={{marginBottom:16}}>
                <Space wrap size="middle">
                  <div>
                    <Text style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Compare By</Text>
                    <Select value={compareBy} onChange={setCompareBy} style={{width:160}}>
                      <Option value="overall">Overall</Option>
                      <Option value="iso">By ISO</Option>
                      <Option value="merchant">By Merchant</Option>
                    </Select>
                  </div>
                  <div>
                    <Text style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Period Type</Text>
                    <Radio.Group value={comparePeriod} onChange={e=>setComparePeriod(e.target.value)} buttonStyle="solid" size="small">
                      <Radio.Button value="month">Month</Radio.Button>
                      <Radio.Button value="quarter">Quarter</Radio.Button>
                      <Radio.Button value="year">Year</Radio.Button>
                    </Radio.Group>
                  </div>
                  <div>
                    <Text style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Period A</Text>
                    <DatePicker picker={comparePeriod==='month'?'month':comparePeriod==='quarter'?'quarter':'year'} value={dateA} onChange={d=>d&&setDateA(d)} format={comparePeriod==='month'?'MMM YYYY':comparePeriod==='quarter'?'[Q]Q YYYY':'YYYY'}/>
                  </div>
                  <div>
                    <Text style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Period B</Text>
                    <DatePicker picker={comparePeriod==='month'?'month':comparePeriod==='quarter'?'quarter':'year'} value={dateB} onChange={d=>d&&setDateB(d)} format={comparePeriod==='month'?'MMM YYYY':comparePeriod==='quarter'?'[Q]Q YYYY':'YYYY'}/>
                  </div>
                  <div style={{paddingTop:20}}>
                    <Button type="primary" loading={comparing} onClick={runComparison}>Run Comparison</Button>
                  </div>
                </Space>
              </Card>
              {comparing&&<div style={{textAlign:'center',padding:40}}><Spin size="large"/></div>}
              {compResult&&(
                <div>
                  <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
                    {[
                      {label:'Period A',val:compResult.rows.reduce((s,r)=>s+r.netA,0),color:'#6b7a99'},
                      {label:'Period B',val:compResult.rows.reduce((s,r)=>s+r.netB,0),color:'var(--primary-color)'},
                      {label:'Net Change',val:compResult.rows.reduce((s,r)=>s+r.netDiff,0),color:compResult.rows.reduce((s,r)=>s+r.netDiff,0)>=0?'#059669':'#dc2626'},
                    ].map(({label,val,color})=>(
                      <Card key={label} size="small" style={{minWidth:160}}>
                        <Text style={{fontSize:12,color:'var(--muted-color)',display:'block'}}>{label}</Text>
                        <div style={{fontSize:22,fontWeight:700,color}}>{fmtShort(val)}</div>
                      </Card>
                    ))}
                  </div>
                  {compResult.rows.map(r=>(
                    <Card key={r.key} size="small" style={{marginBottom:8,borderLeft:`4px solid ${r.netDiff>0?'#059669':r.netDiff<0?'#dc2626':'#d1d5db'}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                        <Text strong style={{fontSize:14}}>{r.label}</Text>
                        <Space wrap>
                          <div><Text style={{fontSize:11,color:'var(--muted-color)'}}>A: </Text><Text strong>{fmtShort(r.netA)}</Text></div>
                          <div><Text style={{fontSize:11,color:'var(--muted-color)'}}>B: </Text><Text strong>{fmtShort(r.netB)}</Text></div>
                          <ChangeMetric value={r.netDiff} label="net"/>
                          <ChangeMetric value={r.volDiff} label="vol"/>
                        </Space>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              {!compResult&&!comparing&&<Alert type="info" showIcon message="Select periods and click Run Comparison to see results."/>}
            </div>
          )
        }
      ]}/>
    </div>
  );
}
