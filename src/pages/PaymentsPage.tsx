// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, Row, Col, Table, Button, Typography, Space, Statistic, Tag, Alert, Modal, Select, DatePicker, Input, Tooltip, message } from "antd";
import { DollarOutlined, LeftOutlined, RightOutlined, SyncOutlined, CheckCircleOutlined, LoadingOutlined, DownloadOutlined } from "@ant-design/icons";
import { supabase } from "../utils/supabase";
import dayjs from "dayjs";
const { Title, Text } = Typography;
const { Option } = Select;
const fmt = (n) => n != null ? `$${Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '--';

// expected_date stored as EXP:YYYY-MM-DD| prefix in notes field
const parseExpDate = (notes) => { if (!notes) return null; const m = notes.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/); return m ? m[1] : null; };
const parseActualNotes = (notes) => { if (!notes) return ''; return notes.replace(/^EXP:\d{4}-\d{2}-\d{2}\|/, ''); };
const buildNotes = (expDate, actualNotes) => { const prefix = expDate ? `EXP:${expDate}|` : ''; const full = prefix + (actualNotes || ''); return full || null; };

const PaymentsPage = () => {
  const [isos, setIsos] = useState([]);
  const [residuals, setResiduals] = useState([]);
  const [payments, setPayments] = useState([]);
  const LATEST_MONTH = dayjs().format('YYYY-MM-01');
  const [selectedMonth, setSelectedMonth] = useState(LATEST_MONTH);
  const [paymentModal, setPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({received_amount:'',payment_date:'',expected_date:'',payment_method:'',notes:''});
  const [selectedIsoForPayment, setSelectedIsoForPayment] = useState({isoId:null,isoName:'',expected:0});
  const [savingPayment, setSavingPayment] = useState(false);
  const [activeStatusFilter, setActiveStatusFilter] = useState(null);
  const [isoDueDayMap, setIsoDueDayMap] = useState({});
  const [editingExpected, setEditingExpected] = useState({}); // isoId → string value being edited
  const [savingExpected, setSavingExpected] = useState({}); // iso_id → day of month from historical records

  // Bank sync state
  const [syncLoading, setSyncLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [syncData, setSyncData] = useState(null); // { preview, month, totalTxsFetched, matched, unmatched }
  const [syncModal, setSyncModal] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(()=>{fetchIsos();fetchAllPaymentDates();},[]);
  useEffect(()=>{fetchResiduals();fetchPayments();setActiveStatusFilter(null);},[selectedMonth]);

  const fetchIsos=async()=>{const{data}=await supabase.from('isos').select('*').eq('status','active').order('name');if(data)setIsos(data);};
  const fetchAllPaymentDates=async()=>{
    const{data}=await supabase.from('iso_payments').select('iso_id,notes,report_month').order('report_month',{ascending:false}).limit(1000);
    if(!data)return;
    const map={};
    data.forEach(p=>{
      if(!p.notes||map[p.iso_id])return;
      const m=p.notes.match(/^EXP:\d{4}-\d{2}-(\d{2})\|/);
      if(m)map[p.iso_id]=parseInt(m[1]);
    });
    setIsoDueDayMap(map);
  };
  const fetchResiduals=async()=>{if(!selectedMonth)return;const{data}=await supabase.from('residuals').select('*,isos(id,name)').eq('report_month',selectedMonth).limit(500);if(data)setResiduals(data);};
  const fetchPayments=async()=>{if(!selectedMonth)return;const{data}=await supabase.from('iso_payments').select('*,isos(name)').eq('report_month',selectedMonth);if(data)setPayments(data);};

  const syncFromBank=async()=>{
    if(!selectedMonth){message.warning('Select a month first');return;}
    setSyncLoading(true);
    try{
      const m=dayjs(selectedMonth).format('YYYY-MM');
      const r=await fetch(`/api/sync-iso-payments?action=bank-preview&month=${m}`);
      const data=await r.json();
      if(!r.ok)throw new Error(data.error||'Sync failed');
      setSyncData(data);
      setSyncModal(true);
    }catch(e){
      message.error(e.message);
    }finally{
      setSyncLoading(false);
    }
  };

  const confirmSync=async()=>{
    if(!syncData?.preview?.length)return;
    setConfirming(true);
    try{
      const m=dayjs(selectedMonth).format('YYYY-MM');
      const r=await fetch(`/api/sync-iso-payments?action=bank-confirm&month=${m}`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({preview:syncData.preview})
      });
      const data=await r.json();
      if(!r.ok)throw new Error(data.error||'Write failed');
      setSyncModal(false);
      setSyncData(null);
      await fetchPayments();
      message.success(`Bank sync complete — ${data.written} ISO${data.written!==1?'s':''} updated`);
      if(data.errors?.length)message.warning('Some errors: '+data.errors.join('; '));
    }catch(e){
      message.error(e.message);
    }finally{
      setConfirming(false);
    }
  };

  const getExpectedByISO=()=>{const map={};residuals.forEach(r=>{const k=r.iso_id;if(!map[k])map[k]={isoId:k,isoName:r.isos?.name||'Unknown',expected:0};map[k].expected+=(r.paydiversenet||0);});payments.forEach(p=>{if(map[p.iso_id]&&p.expected_amount!=null)map[p.iso_id].expected=p.expected_amount;});payments.forEach(p=>{if(!map[p.iso_id]&&p.received_amount!=null){map[p.iso_id]={isoId:p.iso_id,isoName:p.isos?.name||'Unknown',expected:null};}});return Object.values(map).sort((a,b)=>a.isoName.localeCompare(b.isoName));};
  const getPaymentForISO=(isoId)=>payments.find(p=>p.iso_id===isoId);
  const getStatus=(expected,received)=>{if(received==null)return'pending';if(expected==null)return'received';const d=received-expected;if(Math.abs(d)<0.01)return'paid';if(d<0)return'short_paid';return'overpaid';};
  const STATUS_CONFIG={pending:{label:'Pending',color:'default'},paid:{label:'Paid',color:'green'},short_paid:{label:'Short Paid',color:'red'},overpaid:{label:'Overpaid',color:'blue'},received:{label:'Received',color:'cyan'}};

  const saveExpected=async(isoId, isoName, newAmount)=>{
    const val=parseFloat(String(newAmount).replace(/[^0-9.-]/g,''));
    if(isNaN(val))return;
    setSavingExpected(prev=>({...prev,[isoId]:true}));
    const ex=payments.find(p=>p.iso_id===isoId);
    if(ex){
      await supabase.from('iso_payments').update({expected_amount:val}).eq('id',ex.id);
    } else {
      await supabase.from('iso_payments').insert({iso_id:isoId,report_month:selectedMonth,expected_amount:val});
    }
    setEditingExpected(prev=>{const n={...prev};delete n[isoId];return n;});
    setSavingExpected(prev=>{const n={...prev};delete n[isoId];return n;});
    fetchPayments();
  };
  const openPaymentModal=(isoId,isoName,expected)=>{
    setSelectedIsoForPayment({isoId,isoName,expected});
    const ex=payments.find(p=>p.iso_id===isoId);
    if(ex){
      setEditingPayment(ex);
      setPaymentForm({received_amount:ex.received_amount!=null?String(ex.received_amount):'',payment_date:ex.payment_date||'',expected_date:parseExpDate(ex.notes)||'',payment_method:ex.payment_method||'',notes:parseActualNotes(ex.notes)});
    } else {
      setEditingPayment(null);
      setPaymentForm({received_amount:'',payment_date:'',expected_date:'',payment_method:'',notes:''});
    }
    setPaymentModal(true);
  };

  const savePayment=async()=>{
    setSavingPayment(true);
    const received=parseFloat(paymentForm.received_amount)||null;
    const status=getStatus(selectedIsoForPayment.expected,received);
    const record={
      iso_id:selectedIsoForPayment.isoId,
      report_month:selectedMonth,
      expected_amount:selectedIsoForPayment.expected,
      received_amount:received,
      payment_date:paymentForm.payment_date||null,
      payment_method:paymentForm.payment_method||null,
      notes:buildNotes(paymentForm.expected_date,paymentForm.notes),
      status,
      updated_at:new Date().toISOString()
    };
    try{
      if(editingPayment){await supabase.from('iso_payments').update(record).eq('id',editingPayment.id);}
      else{await supabase.from('iso_payments').insert([record]);}
      await fetchPayments();
      setPaymentModal(false);
    }finally{setSavingPayment(false);}
  };

  const deletePayment=async()=>{if(!editingPayment)return;await supabase.from('iso_payments').delete().eq('id',editingPayment.id);await fetchPayments();setPaymentModal(false);};

  const today=dayjs().format('YYYY-MM-DD');
  const expectedByISO=getExpectedByISO();
  const totalExpected=expectedByISO.reduce((s,i)=>s+i.expected,0);
  const totalReceived=payments.reduce((s,p)=>s+(p.received_amount||0),0);
  const matched=expectedByISO.filter(i=>{const p=getPaymentForISO(i.isoId);return p&&getStatus(i.expected,p.received_amount)==='paid';}).length;
  const shortPaid=expectedByISO.filter(i=>{const p=getPaymentForISO(i.isoId);return p&&getStatus(i.expected,p.received_amount)==='short_paid';}).length;
  const pending=expectedByISO.filter(i=>{const p=getPaymentForISO(i.isoId);return !p||p.received_amount==null;}).length;
  const overpaid=expectedByISO.filter(i=>{const p=getPaymentForISO(i.isoId);return p&&getStatus(i.expected,p.received_amount)==='overpaid';}).length;
  const totalOutstanding=expectedByISO.reduce((s,i)=>{if(i.expected==null)return s;const p=getPaymentForISO(i.isoId);const received=p?.received_amount||0;const diff=i.expected-received;return diff>0?s+diff:s;},0);

  const filteredISOs=activeStatusFilter?expectedByISO.filter(r=>{const p=getPaymentForISO(r.isoId);return getStatus(r.expected,p?.received_amount)===activeStatusFilter;}):expectedByISO;

  const reconCols=[
    {title:'ISO',key:'iso',
      filters: expectedByISO.map(r=>({text:r.isoName,value:r.isoId})),
      onFilter:(val,r)=>r.isoId===val,
      filterSearch:true,
      render:(_,r)=><Text strong>{r.isoName}</Text>},
    {title:'Expected',key:'exp',align:'right',width:150,sorter:(a,b)=>(a.expected??-1)-(b.expected??-1),render:(_,r)=>{
      const p=getPaymentForISO(r.isoId);
      const displayVal=p?.expected_amount!=null?p.expected_amount:r.expected;
      const isEditing=editingExpected[r.isoId]!==undefined;
      const isSaving=savingExpected[r.isoId];
      if(isEditing)return(
        <Space size={4}>
          <Input size="small" value={editingExpected[r.isoId]} onChange={e=>setEditingExpected(prev=>({...prev,[r.isoId]:e.target.value}))} style={{width:90,fontSize:12}} prefix="$" onPressEnter={()=>saveExpected(r.isoId,r.isoName,editingExpected[r.isoId])} autoFocus/>
          <Button size="small" type="primary" loading={isSaving} onClick={()=>saveExpected(r.isoId,r.isoName,editingExpected[r.isoId])}>&#10003;</Button>
          <Button size="small" onClick={()=>setEditingExpected(prev=>{const n={...prev};delete n[r.isoId];return n;})}>&#10005;</Button>
        </Space>
      );
      return<Text strong style={{color:'var(--primary-color)',cursor:'pointer'}} onClick={()=>setEditingExpected(prev=>({...prev,[r.isoId]:displayVal!=null?String(displayVal):''}))} title="Click to edit">{fmt(displayVal)}</Text>;}},
    {title:'Received',key:'rec',align:'right',sorter:(a,b)=>{const pa=getPaymentForISO(a.isoId);const pb=getPaymentForISO(b.isoId);return(pa?.received_amount||0)-(pb?.received_amount||0);},render:(_,r)=>{const p=getPaymentForISO(r.isoId);return p?.received_amount!=null?<Text strong style={{color:'#059669'}}>{fmt(p.received_amount)}</Text>:<Text style={{color:'var(--muted-color)'}}>--</Text>;}},
    {title:'Difference',key:'diff',align:'right',sorter:(a,b)=>{const pa=getPaymentForISO(a.isoId);const pb=getPaymentForISO(b.isoId);return((pa?.received_amount||0)-(a.expected??0))-((pb?.received_amount||0)-(b.expected??0));},render:(_,r)=>{const p=getPaymentForISO(r.isoId);if(p?.received_amount==null||r.expected==null)return<Text style={{color:'var(--muted-color)'}}>--</Text>;const diff=(p?.received_amount||0)-r.expected;return<Text strong style={{color:Math.abs(diff)<0.01?'#059669':diff<0?'#dc2626':'#2563eb'}}>{diff>=0?'+':''}{fmt(diff)}</Text>;}},
    {title:'Status',key:'status',
      filters:[{text:'Paid',value:'paid'},{text:'Short Paid',value:'short_paid'},{text:'Pending',value:'pending'},{text:'Overpaid',value:'overpaid'}],
      onFilter:(val,r)=>{const p=getPaymentForISO(r.isoId);return getStatus(r.expected,p?.received_amount)===val;},
      render:(_,r)=>{const p=getPaymentForISO(r.isoId);const s=p?getStatus(r.expected,p.received_amount):'pending';const cfg=STATUS_CONFIG[s];return<Tag color={cfg.color}>{cfg.label}</Tag>;}},
    {title:'Payment Expected By',key:'expdate',width:150,
      filters:[{text:'Overdue',value:'overdue'},{text:'Has Due Date',value:'has_date'},{text:'No Date Set',value:'no_date'}],
      onFilter:(val,r)=>{const p=getPaymentForISO(r.isoId);const expDate=parseExpDate(p?.notes);if(val==='no_date')return!expDate;if(val==='has_date')return!!expDate;if(val==='overdue')return expDate&&expDate<today&&p?.received_amount==null;return true;},
      render:(_,r)=>{
      const p=getPaymentForISO(r.isoId);
      const expDate=parseExpDate(p?.notes);
      if(!expDate)return<Text style={{color:'var(--muted-color)',fontSize:12}}>--</Text>;
      const isOverdue=expDate<today&&p?.received_amount==null;
      return isOverdue
        ?<Tag color="red" style={{fontWeight:600}}> Overdue - {dayjs(expDate).format('MMM D')}</Tag>
        :<Text style={{fontSize:12,color:p?.received_amount==null?'#d97706':'var(--muted-color)'}}>{dayjs(expDate).format('MMM D, YYYY')}</Text>;
    }},
    {title:'Payment Date',key:'date',sorter:(a,b)=>{const pa=getPaymentForISO(a.isoId);const pb=getPaymentForISO(b.isoId);return(pa?.payment_date||'')<(pb?.payment_date||'')?-1:1;},render:(_,r)=>{const p=getPaymentForISO(r.isoId);return p?.payment_date?<Text style={{fontSize:12,color:'var(--muted-color)'}}>{dayjs(p.payment_date).format('MMM D, YYYY')}</Text>:<Text style={{color:'var(--muted-color)'}}>--</Text>;}},
    {title:'Notes',key:'notes',ellipsis:true,render:(_,r)=>{const p=getPaymentForISO(r.isoId);const n=parseActualNotes(p?.notes);return n?<Text style={{fontSize:12,color:'var(--muted-color)'}}>{n}</Text>:null;}},
    {title:'',key:'action',width:140,render:(_,r)=>{const p=getPaymentForISO(r.isoId);return<Button size="small" type={p?'default':'primary'} onClick={()=>openPaymentModal(r.isoId,r.isoName,r.expected)}>{p?'Edit':'Record Payment'}</Button>;}},
  ];

  const exportCSV = () => {
    const headers = ['ISO Name','Month','Expected','Received','Difference','Status','Expected By','Payment Date','Notes'];
    const rows = filteredISOs.map(r => {
      const p = getPaymentForISO(r.isoId);
      const exp = p?.expected_amount ?? r.expected;
      const rec = p?.received_amount;
      const diff = (rec != null && exp != null) ? Number((rec - exp).toFixed(2)) : '';
      const status = p ? getStatus(r.expected, p.received_amount) : 'pending';
      const expDate = parseExpDate(p?.notes);
      const notes = parseActualNotes(p?.notes);
      return [r.isoName, dayjs(selectedMonth).format('MMMM YYYY'), exp ?? '', rec ?? '', diff, status, expDate || '', p?.payment_date || '', notes || ''];
    });
    const csv = [headers,...rows].map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=`payments-${dayjs(selectedMonth).format('YYYY-MM')}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <Title level={4} style={{margin:0}}>Payments &amp; Reconciliation</Title>
        <Space>
          <Button icon={<DownloadOutlined/>} onClick={exportCSV} style={{fontWeight:600}}>
            Export CSV
          </Button>
          <Button
            icon={syncLoading?<LoadingOutlined/>:<SyncOutlined/>}
            loading={syncLoading}
            onClick={syncFromBank}
            style={{background:'#0f2040',color:'#6ee7b7',borderColor:'#1d4ed8',fontWeight:600}}
          >
            Sync from Bank
          </Button>
        </Space>
      </div>

      {/* Month navigator */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
        <Button icon={<LeftOutlined/>} size="small" onClick={()=>{const prev=dayjs(selectedMonth||dayjs().startOf('month')).subtract(1,'month').startOf('month').format('YYYY-MM-DD');setSelectedMonth(prev);}}/>
        <DatePicker picker="month" value={selectedMonth?dayjs(selectedMonth):null} onChange={d=>setSelectedMonth(d?d.startOf('month').format('YYYY-MM-DD'):undefined)} format="MMMM YYYY" allowClear={false} style={{width:160}}/>
        <Button icon={<RightOutlined/>} size="small" onClick={()=>{const next=dayjs(selectedMonth||dayjs().startOf('month')).add(1,'month').startOf('month').format('YYYY-MM-DD');setSelectedMonth(next);}}/>
        <Button size="small" onClick={()=>setSelectedMonth(dayjs().startOf('month').format('YYYY-MM-DD'))} style={{color:'var(--primary-color)',fontSize:12,fontWeight:600}}>Current Month</Button>
        {selectedMonth&&<Text style={{color:'var(--muted-color)',fontSize:12}}>Showing <strong>{dayjs(selectedMonth).format('MMMM YYYY')}</strong></Text>}
      </div>

      {!selectedMonth?(<Alert type="info" showIcon message="Select a month to view payment reconciliation."/>):(
        <>
          <Row gutter={16} style={{marginBottom:16}}>
            {[{title:'Total Expected',value:totalExpected,color:'var(--primary-color)',doFmt:true},{title:'Total Received',value:totalReceived,color:'#059669',doFmt:true},{title:'Outstanding Balance',value:totalOutstanding,color:totalOutstanding>0?'#dc2626':'#059669',doFmt:true},{title:'Pending ISOs',value:pending,color:'#f59e0b',doFmt:false}].map(({title,value,color,doFmt,showSign})=>(
              <Col span={6} key={title}><Card><Statistic title={title} value={doFmt?Math.abs(value):value} prefix={showSign&&value!==0?(value>0?'+':'-'):undefined} formatter={doFmt?v=>`$${Number(v).toLocaleString('en-US',{minimumFractionDigits:2})}`:undefined} valueStyle={{color,fontWeight:700}}/></Card></Col>
            ))}
          </Row>

          <div style={{display:'flex',gap:8,marginBottom:activeStatusFilter?8:16,flexWrap:'wrap'}}>
            {[{label:`${matched} Paid in Full`,color:'#059669',bg:'#f0fdf4',key:'paid'},{label:`${shortPaid} Short Paid`,color:'#dc2626',bg:'#fef2f2',key:'short_paid'},{label:`${overpaid} Overpaid`,color:'#2563eb',bg:'#eff6ff',key:'overpaid'},{label:`${pending} Pending`,color:'#92400e',bg:'#fffbeb',key:'pending'}].map(({label,color,bg,key})=>(
              <div key={key} onClick={()=>setActiveStatusFilter(activeStatusFilter===key?null:key)}
                style={{padding:'6px 14px',borderRadius:20,background:bg,color,fontSize:13,fontWeight:600,cursor:'pointer',border:activeStatusFilter===key?`2px solid ${color}`:'1px solid transparent',transform:activeStatusFilter===key?'translateY(-2px)':'none',transition:'all 0.18s',userSelect:'none'}}>
                {label}
              </div>
            ))}
          </div>
          {activeStatusFilter&&(<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,padding:'8px 14px',background:'#eff6ff',borderRadius:10,border:'1px solid #bfdbfe'}}><Text style={{fontSize:13,fontWeight:600,color:'#1d4ed8'}}>{activeStatusFilter==='paid'?`Showing ${matched} ISO${matched!==1?'s':''} paid in full`:activeStatusFilter==='short_paid'?`Showing ${shortPaid} ISO${shortPaid!==1?'s':''} with short payments`:activeStatusFilter==='overpaid'?`Showing ${overpaid} overpaid ISO${overpaid!==1?'s':''}`:`Showing ${pending} pending ISO${pending!==1?'s':''}`}</Text><Button size="small" onClick={()=>setActiveStatusFilter(null)} style={{marginLeft:'auto'}}>Clear x</Button></div>)}
          {(shortPaid>0||pending>0)&&<Alert type="warning" showIcon style={{marginBottom:16}} message={`Action needed: ${shortPaid>0?`${shortPaid} ISO${shortPaid>1?'s':''} paid less than expected. `:''}${pending>0?`${pending} ISO${pending>1?' have':' has'} no payment recorded yet.`:''}`}/>}

          <Card><Table dataSource={filteredISOs} columns={reconCols} rowKey="isoId" pagination={false} size="middle"
              scroll={{x:1000,y:'calc(100vh - 340px)'}}
              onRow={r=>({style:{background:(()=>{const p=getPaymentForISO(r.isoId);const s=p?getStatus(r.expected,p.received_amount):'pending';if(s==='short_paid')return'#fff5f5';if(s==='pending')return'#fffbeb';if(s==='paid')return'#f0fdf4';return undefined;})(),cursor:'pointer'},onClick:()=>setExpandedRows(prev=>prev.includes(r.isoId)?prev.filter(k=>k!==r.isoId):[...prev,r.isoId])})}
              expandedRowKeys={expandedRows}
              expandable={{showExpandColumn:false,expandedRowRender:(r)=>{const p=getPaymentForISO(r.isoId);const exp=p?.expected_amount??r.expected;const rec=p?.received_amount;const diff=(rec!=null&&exp!=null)?rec-exp:null;const status=p?getStatus(r.expected,p.received_amount):'pending';const expDate=parseExpDate(p?.notes);const notes=parseActualNotes(p?.notes);const statusColors:Record<string,string>={paid:'#10b981',pending:'#f59e0b',short_paid:'#ef4444',overpaid:'#3b82f6',received:'#10b981'};return(<div style={{padding:'10px 24px 10px 48px',background:'rgba(0,32,64,0.04)',borderTop:'1px solid rgba(0,0,0,0.06)',display:'flex',flexWrap:'wrap',gap:'12px 40px'}}><div style={{minWidth:110}}><Text type="secondary" style={{fontSize:11,display:'block'}}>Expected</Text><Text style={{fontWeight:600}}>{exp!=null?fmt(exp):'--'}</Text></div><div style={{minWidth:110}}><Text type="secondary" style={{fontSize:11,display:'block'}}>Received</Text><Text style={{fontWeight:600}}>{rec!=null?fmt(rec):'--'}</Text></div><div style={{minWidth:110}}><Text type="secondary" style={{fontSize:11,display:'block'}}>Difference</Text><Text style={{fontWeight:600,color:diff!=null&&diff<0?'#ef4444':diff!=null&&diff>0?'#3b82f6':'inherit'}}>{diff!=null?`${diff<0?'-':''}${fmt(Math.abs(diff))}`:'--'}</Text></div><div style={{minWidth:100}}><Text type="secondary" style={{fontSize:11,display:'block'}}>Status</Text><Tag color={statusColors[status]||'default'} style={{textTransform:'capitalize'}}>{status.replace('_',' ')}</Tag></div><div style={{minWidth:110}}><Text type="secondary" style={{fontSize:11,display:'block'}}>Expected By</Text><Text>{expDate||'--'}</Text></div><div style={{minWidth:110}}><Text type="secondary" style={{fontSize:11,display:'block'}}>Payment Date</Text><Text>{p?.payment_date||'--'}</Text></div><div style={{flex:1,minWidth:200}}><Text type="secondary" style={{fontSize:11,display:'block'}}>Notes</Text><Text>{notes||'--'}</Text></div></div>);}}}
              summary={()=>{
                const tExp=filteredISOs.reduce((s,r)=>{const p=getPaymentForISO(r.isoId);const exp=p?.expected_amount!=null?p.expected_amount:r.expected;return s+(exp??0);},0);
                const tRec=filteredISOs.reduce((s,r)=>{const p=getPaymentForISO(r.isoId);return s+(p?.received_amount||0);},0);
                const tDiff=tRec-tExp;
                return(
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{background:'#0f2040',height:44}}>
                      <Table.Summary.Cell index={0}><span style={{color:'rgba(255,255,255,0.8)',fontWeight:700,fontSize:13,textTransform:'uppercase',letterSpacing:'1px'}}>Total — {filteredISOs.length} ISO{filteredISOs.length!==1?'s':''}</span></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right"><span style={{color:'#93c5fd',fontWeight:900,fontSize:15}}>{fmt(tExp)}</span></Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right"><span style={{color:'#6ee7b7',fontWeight:900,fontSize:15}}>{fmt(tRec)}</span></Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right"><span style={{color:tDiff>=0?'#6ee7b7':'#fca5a5',fontWeight:900,fontSize:15}}>{tDiff>=0?'+':''}{fmt(tDiff)}</span></Table.Summary.Cell>
                      <Table.Summary.Cell index={4}/><Table.Summary.Cell index={5}/><Table.Summary.Cell index={6}/><Table.Summary.Cell index={7}/><Table.Summary.Cell index={8}/>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
          /></Card>

          {/* Payment Calendar */}
          {(()=>{
            const statusColor={paid:'#059669',short_paid:'#dc2626',overpaid:'#2563eb',pending:'#d97706'};
            const statusBg={paid:'#f0fdf4',short_paid:'#fef2f2',overpaid:'#eff6ff',pending:'#fffbeb'};
            const expectedByISOMap=Object.fromEntries(expectedByISO.map(i=>[i.isoId,i]));
            const allISOsForCalendar=isos.map(iso=>{
              const fromResiduals=expectedByISOMap[iso.id];
              const p=getPaymentForISO(iso.id);
              const expDate=parseExpDate(p?.notes);
              const payMonthStr=dayjs(selectedMonth).add(1,'month').format('YYYY-MM-');
              const resolvedDate=expDate||(isoDueDayMap[iso.id]?payMonthStr+String(isoDueDayMap[iso.id]).padStart(2,'0'):null);
              if(!resolvedDate)return null;
              const amount=fromResiduals?.expected ?? (p?.expected_amount||0);
              const status=p?getStatus(amount,p.received_amount):'pending';
              return{name:iso.name,isoId:iso.id,dayNum:parseInt(resolvedDate.split('-')[2]),expDate:resolvedDate,amount,received:p?.received_amount??null,status};
            }).filter(Boolean);
            const paymentItems=activeStatusFilter?allISOsForCalendar.filter(i=>i.status===activeStatusFilter):allISOsForCalendar;
            const byDay={};
            paymentItems.forEach(item=>{if(!byDay[item.dayNum])byDay[item.dayNum]=[];byDay[item.dayNum].push(item);});
            const payMonth=dayjs(selectedMonth).add(1,'month');
            const payMonthLabel=payMonth.format('MMMM YYYY');
            const daysInMonth=payMonth.daysInMonth();
            const firstDayOfWeek=payMonth.startOf('month').day();
            const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            const cells=[];
            for(let i=0;i<firstDayOfWeek;i++)cells.push(null);
            for(let d=1;d<=daysInMonth;d++)cells.push(d);
            while(cells.length%7!==0)cells.push(null);
            const weeks=[];
            for(let i=0;i<cells.length;i+=7)weeks.push(cells.slice(i,i+7));
            return(
              <Card style={{marginBottom:16,borderRadius:12,padding:0}}>
                <Text style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'var(--muted-color)',display:'block',marginBottom:12}}>
                  Payment Schedule — {payMonthLabel}
                </Text>
                {/* Legend */}
                <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
                  {[
                    {label:'Pending',color:'#d97706',bg:'#fffbeb',skey:'pending'},
                    {label:'Paid in Full',color:'#059669',bg:'#f0fdf4',skey:'paid'},
                    {label:'Short Paid',color:'#dc2626',bg:'#fef2f2',skey:'short_paid'},
                    {label:'Overpaid',color:'#2563eb',bg:'#eff6ff',skey:'overpaid'},
                  ].map(({label,color,bg,skey})=>{const isActive=activeStatusFilter===skey;return(
                    <div key={label} onClick={()=>setActiveStatusFilter(isActive?null:skey)} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 10px',borderRadius:6,background:isActive?color:bg,border:`1.5px solid ${color}`,cursor:'pointer',transform:isActive?'translateY(-2px)':'none',transition:'all 0.15s',boxShadow:isActive?`0 3px 8px ${color}55`:'none',userSelect:'none'}}>
                      <div style={{width:10,height:10,borderRadius:2,background:isActive?'#fff':color,flexShrink:0}}/>
                      <span style={{fontSize:11,fontWeight:600,color:isActive?'#fff':color,whiteSpace:'nowrap'}}>{label}{isActive?' ✓':''}</span>
                    </div>
                  );})}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:0,borderBottom:'1px solid var(--line-color)'}}>
                  {DOW.map(d=>(<div key={d} style={{textAlign:'center',padding:'8px 0',fontSize:14,fontWeight:700,color:'#1e3a8a',textTransform:'uppercase',letterSpacing:'0.5px'}}>{d}</div>))}
                </div>
                {weeks.map((week,wi)=>(
                  <div key={wi} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:0,borderBottom:wi<weeks.length-1?'1px solid var(--line-color)':'none'}}>
                    {week.map((day,di)=>{
                      const dateStr=day?payMonth.format('YYYY-MM-')+String(day).padStart(2,'0'):null;
                      const isToday=dateStr===today;
                      const isPast=dateStr&&dateStr<today;
                      const items=day?byDay[day]||[]:[];
                      const isSun=di===0,isSat=di===6;
                      const dominant=items.length?(['short_paid','pending','overpaid','paid'].find(s=>items.some(it=>it.status===s))||'paid'):null;
                      const cellBgMap={paid:'#dcfce7',short_paid:'#fee2e2',overpaid:'#dbeafe',pending:'#fef9c3'};
                      return(
                        <div key={di} style={{minHeight:72,padding:'6px 8px',background:!day?'#fafbfc':isToday?'#f0f6ff':dominant?cellBgMap[dominant]:isSun||isSat?'#fafbfc':'#fff',borderRight:di<6?'1px solid var(--line-color)':'none',position:'relative'}}>
                          {day&&(<>
                            <div style={{width:32,height:32,borderRadius:'50%',marginBottom:4,background:isToday?'#0f2040':'transparent',color:isToday?'#fff':'#1e3a8a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,WebkitTextStroke:isToday?'0':'0.3px #1e3a8a'}}>{day}</div>
                            <div style={{display:'flex',flexDirection:'column',gap:2}}>
                              {items.map((item,i)=>(
                                <div key={i} title={item.status==='short_paid'?`${item.name} — Expected $${(item.amount||0).toLocaleString('en-US',{minimumFractionDigits:2})} · Received $${(item.received||0).toLocaleString('en-US',{minimumFractionDigits:2})} · Short by $${(item.amount-(item.received||0)).toLocaleString('en-US',{minimumFractionDigits:2})}`:item.status==='overpaid'?`${item.name} — Expected $${(item.amount||0).toLocaleString('en-US',{minimumFractionDigits:2})} · Received $${(item.received||0).toLocaleString('en-US',{minimumFractionDigits:2})} · Over by $${((item.received||0)-item.amount).toLocaleString('en-US',{minimumFractionDigits:2})}`:`${item.name} — $${(item.amount||0).toLocaleString('en-US',{minimumFractionDigits:2})}`} style={{padding:'2px 6px',borderRadius:4,background:statusBg[item.status],borderLeft:`3px solid ${statusColor[item.status]}`,fontSize:10,fontWeight:600,color:statusColor[item.status],whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                                  {item.status==='short_paid'?`${item.name} · Short $${(item.amount-(item.received||0)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`:item.status==='overpaid'?`${item.name} · Over $${((item.received||0)-item.amount).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`:item.name+' · $'+Number(item.amount||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                                </div>
                              ))}
                            </div>
                          </>)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </Card>
            );
          })()}
        </>
      )}

      {/* Bank Sync Preview Modal */}
      <Modal
        open={syncModal}
        onCancel={()=>{setSyncModal(false);setSyncData(null);}}
        footer={null}
        title={<Space><SyncOutlined style={{color:'#6ee7b7'}}/><span>Bank Sync Preview — {syncData&&dayjs(selectedMonth).format('MMMM YYYY')}</span></Space>}
        width={620}
      >
        {syncData&&(
          <Space direction="vertical" style={{width:'100%'}} size="middle">
            <div style={{display:'flex',gap:16}}>
              <div style={{padding:'8px 14px',background:'#f0fdf4',borderRadius:8,border:'1px solid #bbf7d0'}}>
                <div style={{fontSize:11,color:'#6b7280',fontWeight:600}}>Transactions fetched</div>
                <div style={{fontSize:18,fontWeight:700,color:'#059669'}}>{syncData.totalTxsFetched}</div>
              </div>
              <div style={{padding:'8px 14px',background:'#eff6ff',borderRadius:8,border:'1px solid #bfdbfe'}}>
                <div style={{fontSize:11,color:'#6b7280',fontWeight:600}}>Matched to ISOs</div>
                <div style={{fontSize:18,fontWeight:700,color:'#2563eb'}}>{syncData.matched}</div>
              </div>
              <div style={{padding:'8px 14px',background:'#fafafa',borderRadius:8,border:'1px solid #e5e7eb'}}>
                <div style={{fontSize:11,color:'#6b7280',fontWeight:600}}>Unmatched</div>
                <div style={{fontSize:18,fontWeight:700,color:'#6b7280'}}>{syncData.unmatched}</div>
              </div>
            </div>

            {syncData.message&&<Alert type="info" message={syncData.message} showIcon/>}

            {syncData.preview?.length>0&&(
              <>
                <Text style={{fontWeight:700,fontSize:13}}>The following will be written to Received amounts:</Text>
                <div style={{maxHeight:340,overflowY:'auto',borderRadius:8,border:'1px solid #e5e7eb'}}>
                  {syncData.preview.map((iso,i)=>(
                    <div key={iso.isoId} style={{padding:'10px 14px',borderBottom:i<syncData.preview.length-1?'1px solid #f3f4f6':'none'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                        <Text style={{fontWeight:700,fontSize:13}}>{iso.isoName}</Text>
                        <Text style={{fontWeight:900,fontSize:15,color:'#059669'}}>{fmt(iso.total)}</Text>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:2}}>
                        {iso.transactions.map((tx,j)=>(
                          <div key={j} style={{fontSize:11,color:'#6b7280',display:'flex',justifyContent:'space-between'}}>
                            <span>{tx.date} — {tx.description}</span>
                            <span style={{fontWeight:600,color:'#374151'}}>${Number(tx.amount).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <Button onClick={()=>{setSyncModal(false);setSyncData(null);}}>Cancel</Button>
              {syncData.preview?.length>0&&(
                <Button type="primary" loading={confirming} onClick={confirmSync} icon={<CheckCircleOutlined/>} style={{background:'#059669',borderColor:'#059669'}}>
                  Confirm & Write {syncData.preview.length} ISO{syncData.preview.length!==1?'s':''}
                </Button>
              )}
            </div>
          </Space>
        )}
      </Modal>

      {/* Record Payment Modal */}
      <Modal open={paymentModal} onCancel={()=>{setPaymentModal(false);setEditingPayment(null);}} footer={null}
        title={<Space><DollarOutlined style={{color:'var(--primary-color)'}}/><span>Record Payment - {selectedIsoForPayment.isoName}</span></Space>}>
        <Space direction="vertical" style={{width:'100%',marginTop:8}} size="middle">
          <div style={{padding:'10px 14px',background:'var(--background-color)',borderRadius:8,border:'1px solid var(--line-color)'}}><Text style={{fontSize:12,color:'var(--muted-color)'}}>Expected for {selectedMonth?dayjs(selectedMonth).format('MMMM YYYY'):''}</Text><div style={{fontSize:20,fontWeight:700,color:'var(--primary-color)'}}>{fmt(selectedIsoForPayment.expected)}</div></div>
          <div><Text style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Payment Expected By</Text><DatePicker style={{width:'100%'}} placeholder="Set expected payment date" value={paymentForm.expected_date?dayjs(paymentForm.expected_date):null} onChange={d=>setPaymentForm(f=>({...f,expected_date:d?d.format('YYYY-MM-DD'):''}))} /></div>
          <div><Text style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Amount Received</Text><Input prefix="$" placeholder="0.00" value={paymentForm.received_amount} onChange={e=>setPaymentForm(f=>({...f,received_amount:e.target.value}))} size="large"/></div>
          <div><Text style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Payment Date</Text><DatePicker style={{width:'100%'}} value={paymentForm.payment_date?dayjs(paymentForm.payment_date):null} onChange={d=>setPaymentForm(f=>({...f,payment_date:d?d.format('YYYY-MM-DD'):''}))} /></div>
          <div><Text style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Payment Method</Text><Select placeholder="Select method" style={{width:'100%'}} value={paymentForm.payment_method||undefined} onChange={v=>setPaymentForm(f=>({...f,payment_method:v}))} allowClear><Option value="ACH">ACH Transfer</Option><Option value="wire">Wire Transfer</Option><Option value="check">Check</Option><Option value="other">Other</Option></Select></div>
          <div><Text style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Notes (optional)</Text><Input.TextArea rows={2} value={paymentForm.notes} onChange={e=>setPaymentForm(f=>({...f,notes:e.target.value}))}/></div>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            {editingPayment?<Button danger onClick={deletePayment}>Delete</Button>:<span/>}
            <Space><Button onClick={()=>{setPaymentModal(false);setEditingPayment(null);}}>Cancel</Button><Button type="primary" loading={savingPayment} onClick={savePayment}>Save Payment</Button></Space>
          </div>
        </Space>
      </Modal>
    </div>
  );
};
export default PaymentsPage;
