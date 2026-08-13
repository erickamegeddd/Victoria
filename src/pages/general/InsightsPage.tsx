// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { Card, Row, Col, Tabs, Button, DatePicker, Typography, Space, Statistic, Tag, Alert, Spin, Radio, Tooltip } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, WarningOutlined, UserDeleteOutlined, UserAddOutlined, BulbOutlined } from "@ant-design/icons";
import { supabase } from "../../utils/supabase";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
dayjs.extend(quarterOfYear);
const { Title, Text } = Typography;

const fmt=(n)=>n!=null?`$${Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"--";
const fmtK=(n)=>{if(n==null)return"--";const abs=Math.abs(n);if(abs>=1000000)return`$${(n/1000000).toFixed(1)}M`;if(abs>=1000)return`$${(n/1000).toFixed(1)}K`;return fmt(n);};
const fmtPct=(n)=>n!=null?`${n>=0?"+":""}${n.toFixed(1)}%`:"--";

// ── SVG Line Chart ────────────────────────────────────────────────────────────
const TrendChart = ({ data, height = 140, primaryColor = "#1d4ed8", secondaryData = null, secondaryColor = "#f59e0b", labelKey = "label", valueKey = "net" }) => {
  if (!data || data.length < 2) return null;
  const W = 900, H = height, PAD_L = 48, PAD_R = 16, PAD_T = 12, PAD_B = 28;
  const w = W - PAD_L - PAD_R, h = H - PAD_T - PAD_B;

  const allVals = [
    ...data.map(d => d[valueKey] || 0),
    ...(secondaryData ? secondaryData.map(d => d[valueKey] || 0) : [])
  ];
  const minV = Math.min(0, ...allVals);
  const maxV = Math.max(...allVals, 1);
  const range = maxV - minV || 1;

  const toX = (i, n) => PAD_L + (i / (n - 1)) * w;
  const toY = (v) => PAD_T + h - ((v - minV) / range) * h;

  const makePath = (pts, n) => pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i, n).toFixed(1)} ${toY(p[valueKey] || 0).toFixed(1)}`).join(" ");
  const makeArea = (pts, n) => {
    const line = makePath(pts, n);
    return `${line} L ${toX(n - 1, n).toFixed(1)} ${toY(minV).toFixed(1)} L ${toX(0, n).toFixed(1)} ${toY(minV).toFixed(1)} Z`;
  };

  // Y-axis labels
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => minV + f * range);

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
        <defs>
          <linearGradient id="trendGrad1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0"/>
          </linearGradient>
          {secondaryData && (
            <linearGradient id="trendGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.14"/>
              <stop offset="100%" stopColor={secondaryColor} stopOpacity="0"/>
            </linearGradient>
          )}
        </defs>

        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD_L} y1={toY(v)} x2={W - PAD_R} y2={toY(v)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray={i === 0 ? "none" : "4,3"}/>
            <text x={PAD_L - 4} y={toY(v) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{fmtK(v)}</text>
          </g>
        ))}

        {/* Secondary area + line */}
        {secondaryData && secondaryData.length >= 2 && (
          <>
            <path d={makeArea(secondaryData, secondaryData.length)} fill="url(#trendGrad2)" />
            <path d={makePath(secondaryData, secondaryData.length)} fill="none" stroke={secondaryColor} strokeWidth="2" strokeDasharray="6,3"/>
            {secondaryData.map((d, i) => (
              <circle key={i} cx={toX(i, secondaryData.length)} cy={toY(d[valueKey] || 0)} r="3.5" fill="#fff" stroke={secondaryColor} strokeWidth="2"/>
            ))}
          </>
        )}

        {/* Primary area + line */}
        <path d={makeArea(data, data.length)} fill="url(#trendGrad1)" />
        <path d={makePath(data, data.length)} fill="none" stroke={primaryColor} strokeWidth="2.5"/>
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={toX(i, data.length)} cy={toY(d[valueKey] || 0)} r="4" fill="#fff" stroke={primaryColor} strokeWidth="2.5"/>
            {/* X-axis label */}
            <text x={toX(i, data.length)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">
              {d[labelKey]}
            </text>
          </g>
        ))}

        {/* Zero line if needed */}
        {minV < 0 && (
          <line x1={PAD_L} y1={toY(0)} x2={W - PAD_R} y2={toY(0)} stroke="#6b7280" strokeWidth="1" strokeDasharray="3,2"/>
        )}
      </svg>
    </div>
  );
};

// ── Compact 2-point comparison chart ─────────────────────────────────────────
const CompareChart = ({ items, labelA, labelB }) => {
  if (!items || items.length === 0) return null;
  // Show top N ISOs by absolute change
  const top = items.filter(i => i.hasDataA && i.hasDataB).slice(0, 8);
  if (top.length < 1) return null;

  const allVals = top.flatMap(i => [i.netA, i.netB]);
  const maxV = Math.max(...allVals, 1);
  const W = 900, H = 120, BAR_H = 10, LABEL_W = 140, GAP = 8;

  const rowH = (H - 20) / top.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
      {top.map((iso, i) => {
        const y = 10 + i * rowH;
        const barW = W - LABEL_W - 60;
        const wA = (iso.netA / maxV) * barW;
        const wB = (iso.netB / maxV) * barW;
        const grew = iso.netB >= iso.netA;
        return (
          <g key={iso.isoId}>
            <text x={LABEL_W - 6} y={y + rowH / 2 + 3} textAnchor="end" fontSize="10" fill="#374151" fontWeight="600">
              {iso.isoName.length > 18 ? iso.isoName.slice(0, 18) + ".." : iso.isoName}
            </text>
            {/* Bar A (faded) */}
            <rect x={LABEL_W} y={y + (rowH - BAR_H * 2 - GAP) / 2} width={Math.max(wA, 2)} height={BAR_H} rx="3" fill="#bfdbfe"/>
            {/* Bar B */}
            <rect x={LABEL_W} y={y + (rowH - BAR_H * 2 - GAP) / 2 + BAR_H + GAP} width={Math.max(wB, 2)} height={BAR_H} rx="3" fill={grew ? "#059669" : "#dc2626"}/>
            {/* Value labels */}
            <text x={LABEL_W + Math.max(wB, 2) + 4} y={y + (rowH - BAR_H * 2 - GAP) / 2 + BAR_H + BAR_H / 2 + GAP + 3} fontSize="9" fill={grew ? "#059669" : "#dc2626"} fontWeight="700">
              {fmtK(iso.netB)} {grew ? "▲" : "▼"} {Math.abs(iso.netPct).toFixed(0)}%
            </text>
          </g>
        );
      })}
      {/* Legend */}
      <rect x={W - 140} y={4} width={10} height={8} rx="2" fill="#bfdbfe"/>
      <text x={W - 127} y={11} fontSize="9" fill="#6b7280">{labelA}</text>
      <rect x={W - 80} y={4} width={10} height={8} rx="2" fill="#059669"/>
      <text x={W - 67} y={11} fontSize="9" fill="#6b7280">{labelB}</text>
    </svg>
  );
};

// ── Existing helpers ──────────────────────────────────────────────────────────
const generateSummary=(netChange,netPct,lostMerchants,newMerchants,hasDataA,hasDataB,netA)=>{
  if(!hasDataA&&hasDataB)return{type:"warning",text:"No data for the earlier period -- this ISO may be new or the report hasn't been uploaded yet."};
  if(hasDataA&&!hasDataB)return{type:"warning",text:`No report uploaded for the later period yet. Last recorded net income was ${fmt(netA)}.`};
  if(!hasDataA&&!hasDataB)return{type:"info",text:"No data found for either period."};
  const parts=[];
  if(lostMerchants.length>0){const names=lostMerchants.slice(0,3).map(m=>m.name).join(", ");const more=lostMerchants.length>3?` and ${lostMerchants.length-3} more`:"";parts.push(`${lostMerchants.length} merchant${lostMerchants.length>1?"s":""} stopped processing (${names}${more})`)}
  if(newMerchants.length>0){const names=newMerchants.slice(0,3).map(m=>m.name).join(", ");const more=newMerchants.length>3?` and ${newMerchants.length-3} more`:"";parts.push(`${newMerchants.length} new merchant${newMerchants.length>1?"s":""} started processing (${names}${more})`)}
  if(parts.length===0){if(Math.abs(netPct)<2)return{type:"success",text:"Income is stable -- same merchants, no significant changes detected."};if(netChange<0)return{type:"warning",text:`Same merchants, but income dropped ${Math.abs(netPct).toFixed(1)}%. Likely lower processing volume, rate adjustments, or higher fees.`};return{type:"success",text:`Same merchants with higher activity -- income grew ${netPct.toFixed(1)}%.`};}
  if(netChange<-50)return{type:"error",text:`Income dropped because: ${parts.join(", and ")}. This explains the ${fmt(Math.abs(netChange))} decrease.`};
  if(netChange>50)return{type:"success",text:`Income grew because: ${parts.join(", and ")}. This contributed ${fmt(netChange)} to earnings.`};
  return{type:"info",text:`${parts.join(" and ")}, but the overall income impact was small.`};
};

const MetricBox=({label,valA,valB,change,changePct,formatter=fmtK})=>(
  <div style={{textAlign:"center",padding:"14px 8px",background:"#f8fafc",borderRadius:8,border:"1px solid var(--line-color)"}}>
    <Text style={{fontSize:10,color:"var(--muted-color)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",display:"block",marginBottom:8}}>{label}</Text>
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginBottom:4}}>
      <Text style={{fontSize:13,color:"var(--muted-color)"}}>{formatter(valA)}</Text>
      <Text style={{fontSize:12,color:"var(--muted-color)"}}>-></Text>
      <Text style={{fontSize:15,fontWeight:800,color:change===0?"var(--black-color)":change>0?"#059669":"#dc2626"}}>{formatter(valB)}</Text>
    </div>
    {change!==0&&<div style={{fontSize:12,color:change>0?"#059669":"#dc2626",fontWeight:600}}>
      {change>0?"up":"dn"} {formatter(Math.abs(change))} ({Math.abs(changePct).toFixed(1)}%)
    </div>}
    {change===0&&<div style={{fontSize:12,color:"var(--muted-color)"}}>No change</div>}
  </div>
);

const ISOCard=({iso,labelA,labelB})=>{
  const borderColor=!iso.hasDataA||!iso.hasDataB?"#f59e0b":iso.netChange<-50?"#dc2626":iso.netChange>50?"#059669":"#d1d5db";
  const badgeBg=!iso.hasDataA||!iso.hasDataB?"#fff7ed":iso.netChange<-50?"#fef2f2":iso.netChange>50?"#f0fdf4":"#f9fafb";
  const badgeColor=!iso.hasDataA||!iso.hasDataB?"#c2410c":iso.netChange<-50?"#dc2626":iso.netChange>50?"#059669":"#6b7a99";
  const badgeLabel=!iso.hasDataA||!iso.hasDataB?"Missing Data":iso.netChange<-50?"Income Dropped":iso.netChange>50?"Income Grew":"Stable";
  return(
    <Card style={{borderLeft:`4px solid ${borderColor}`,marginBottom:12,borderRadius:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div>
          <Text strong style={{fontSize:16}}>{iso.isoName}</Text>
          <div style={{marginTop:2}}>
            <Text style={{fontSize:12,color:"var(--muted-color)"}}>
              {labelA}: <strong style={{color:"var(--black-color)"}}>{fmt(iso.netA)}</strong>
              {" -> "}
              {labelB}: <strong style={{color:iso.netChange<0?"#dc2626":iso.netChange>0?"#059669":"var(--black-color)"}}>{fmt(iso.netB)}</strong>
            </Text>
          </div>
        </div>
        <span style={{padding:"4px 10px",borderRadius:20,background:badgeBg,color:badgeColor,fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>{badgeLabel}</span>
      </div>
      <Alert type={iso.summary.type} showIcon message={iso.summary.text} style={{marginBottom:14,borderRadius:8}}/>
      <Row gutter={12} style={{marginBottom:iso.lostMerchants.length>0||iso.newMerchants.length>0?12:0}}>
        <Col span={8}><MetricBox label="Net Income" valA={iso.netA} valB={iso.netB} change={iso.netChange} changePct={iso.netPct}/></Col>
        <Col span={8}><MetricBox label="Volume" valA={iso.volA} valB={iso.volB} change={iso.volChange} changePct={iso.volPct}/></Col>
        <Col span={8}><MetricBox label="Merchants" valA={iso.midsA} valB={iso.midsB} change={iso.midsB-iso.midsA} changePct={iso.midsA?((iso.midsB-iso.midsA)/iso.midsA*100):0} formatter={v=>String(Math.round(v))}/></Col>
      </Row>
      {(iso.lostMerchants.length>0||iso.newMerchants.length>0)&&(
        <div style={{padding:"10px 12px",background:"#f8fafc",borderRadius:8,border:"1px solid var(--line-color)"}}>
          {iso.lostMerchants.length>0&&(
            <div style={{marginBottom:iso.newMerchants.length>0?8:0}}>
              <Text style={{fontSize:12,fontWeight:700,color:"#dc2626",display:"block",marginBottom:6}}>
                <UserDeleteOutlined style={{marginRight:4}}/>{iso.lostMerchants.length} Left
              </Text>
              <Space wrap size={4}>
                {iso.lostMerchants.map(m=><Tag key={m.mid} style={{margin:0,background:"#fef2f2",borderColor:"#fecaca",color:"#dc2626"}}>{m.name}</Tag>)}
              </Space>
            </div>
          )}
          {iso.newMerchants.length>0&&(
            <div>
              <Text style={{fontSize:12,fontWeight:700,color:"#059669",display:"block",marginBottom:6}}>
                <UserAddOutlined style={{marginRight:4}}/>{iso.newMerchants.length} New
              </Text>
              <Space wrap size={4}>
                {iso.newMerchants.map(m=><Tag key={m.mid} style={{margin:0,background:"#f0fdf4",borderColor:"#bbf7d0",color:"#059669"}}>{m.name}</Tag>)}
              </Space>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

const getPeriodDates=(period)=>{
  const now=dayjs();
  if(period==="30")return{labelA:now.subtract(1,"month").format("MMM YYYY"),labelB:now.format("MMM YYYY"),dateA:now.subtract(1,"month").startOf("month").format("YYYY-MM-DD"),dateB:now.startOf("month").format("YYYY-MM-DD"),type:"month"};
  if(period==="60")return{labelA:now.subtract(2,"month").format("MMM YYYY"),labelB:now.subtract(1,"month").format("MMM YYYY"),dateA:now.subtract(2,"month").startOf("month").format("YYYY-MM-DD"),dateB:now.subtract(1,"month").startOf("month").format("YYYY-MM-DD"),type:"month"};
  if(period==="90")return{labelA:now.subtract(3,"month").format("MMM YYYY"),labelB:now.subtract(2,"month").format("MMM YYYY"),dateA:now.subtract(3,"month").startOf("month").format("YYYY-MM-DD"),dateB:now.subtract(2,"month").startOf("month").format("YYYY-MM-DD"),type:"month"};
  if(period==="quarter"){const curQ=now.startOf("quarter"),prevQ=curQ.subtract(1,"quarter");return{labelA:`Q${prevQ.quarter()} ${prevQ.year()}`,labelB:`Q${curQ.quarter()} ${curQ.year()}`,monthsA:[0,1,2].map(i=>prevQ.add(i,"month").format("YYYY-MM-DD")),monthsB:[0,1,2].map(i=>curQ.add(i,"month").format("YYYY-MM-DD")),type:"quarter"};}
  if(period==="year")return{labelA:String(now.year()-1),labelB:String(now.year()),yearA:now.year()-1,yearB:now.year(),type:"year"};
  return null;
};

const InsightsPage=()=>{
  const [activeTab,setActiveTab]=useState("overview");
  const [overviewPeriod,setOverviewPeriod]=useState("30");
  const [overviewData,setOverviewData]=useState(null);
  const [loadingOverview,setLoadingOverview]=useState(false);
  const [activeFilter,setActiveFilter]=useState(null);
  const [monthlyTrend,setMonthlyTrend]=useState([]);
  const [compareBy,setCompareBy]=useState("iso");
  const [comparePeriodType,setComparePeriodType]=useState("month");
  const [compareA,setCompareA]=useState(null);
  const [compareB,setCompareB]=useState(null);
  const [comparison,setComparison]=useState(null);
  const [runningComparison,setRunningComparison]=useState(false);

  useEffect(()=>{loadOverview();loadTrend();setActiveFilter(null);},[overviewPeriod]);

  const fetchByMonths=async(months)=>{const{data}=await supabase.from("residuals").select("*,isos(id,name)").in("report_month",months);return data||[];};
  const fetchByYear=async(year)=>{const{data}=await supabase.from("residuals").select("*,isos(id,name)").gte("report_month",`${year}-01-01`).lte("report_month",`${year}-12-31`);return data||[];};

  const loadTrend=async()=>{
    const{data}=await supabase.from("residuals").select("report_month,paydiversenet,gross_revenue").order("report_month");
    if(!data||data.length===0)return;
    const map={};
    data.forEach(r=>{
      const m=r.report_month;
      if(!m)return;
      if(!map[m])map[m]={label:dayjs(m).format("MMM YY"),net:0,vol:0};
      map[m].net+=(r.paydiversenet||0);
      map[m].vol+=(r.gross_revenue||0);
    });
    setMonthlyTrend(Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>v));
  };

  const groupData=(rows)=>{const map={};rows.forEach(r=>{const k=r.iso_id;if(!map[k])map[k]={isoId:k,isoName:r.isos?.name||"Unknown",rows:[],totalNet:0,totalVolume:0,mids:new Map()};map[k].rows.push(r);map[k].totalNet+=(r.paydiversenet||0);map[k].totalVolume+=(r.gross_volume||0);map[k].mids.set(r.mid,r.business_name||r.mid);});return map;};

  const buildComparison=(rowsA,rowsB,labelA,labelB)=>{
    const gA=groupData(rowsA),gB=groupData(rowsB);
    const allIds=new Set([...Object.keys(gA),...Object.keys(gB)]);
    const isoList=Array.from(allIds).map(isoId=>{
      const a=gA[isoId],b=gB[isoId];
      const isoName=a?.isoName||b?.isoName||"Unknown";
      const netA=a?.totalNet||0,netB=b?.totalNet||0,volA=a?.totalVolume||0,volB=b?.totalVolume||0;
      const midsA=a?.mids||new Map(),midsB=b?.mids||new Map();
      const netChange=netB-netA,netPct=netA!==0?(netChange/Math.abs(netA)*100):(netB!==0?100:0);
      const volChange=volB-volA,volPct=volA!==0?(volChange/Math.abs(volA)*100):0;
      const lostMerchants=[...midsA.entries()].filter(([mid])=>!midsB.has(mid)).map(([mid,name])=>({mid,name}));
      const newMerchants=[...midsB.entries()].filter(([mid])=>!midsA.has(mid)).map(([mid,name])=>({mid,name}));
      const summary=generateSummary(netChange,netPct,lostMerchants,newMerchants,!!a,!!b,netA);
      return{isoId,isoName,netA,netB,netChange,netPct,volA,volB,volChange,volPct,midsA:midsA.size,midsB:midsB.size,lostMerchants,newMerchants,hasDataA:!!a,hasDataB:!!b,summary};
    }).sort((a,b)=>Math.abs(b.netChange)-Math.abs(a.netChange));
    const totNetA=rowsA.reduce((s,r)=>s+(r.paydiversenet||0),0),totNetB=rowsB.reduce((s,r)=>s+(r.paydiversenet||0),0);
    const totVolA=rowsA.reduce((s,r)=>s+(r.gross_volume||0),0),totVolB=rowsB.reduce((s,r)=>s+(r.gross_volume||0),0);
    const midSetA=new Set(rowsA.map(r=>r.mid)),midSetB=new Set(rowsB.map(r=>r.mid));
    const byMerchant=[];
    const allMids=new Set([...rowsA.map(r=>r.mid),...rowsB.map(r=>r.mid)]);
    allMids.forEach(mid=>{
      const ra=rowsA.filter(r=>r.mid===mid);
      const rb=rowsB.filter(r=>r.mid===mid);
      const netA=ra.reduce((s,r)=>s+(r.paydiversenet||0),0);
      const netB=rb.reduce((s,r)=>s+(r.paydiversenet||0),0);
      const volA=ra.reduce((s,r)=>s+(r.gross_volume||0),0);
      const volB=rb.reduce((s,r)=>s+(r.gross_volume||0),0);
      const netChange=netB-netA;
      const netPct=netA!==0?(netChange/Math.abs(netA)*100):(netB!==0?100:0);
      const name=rb[0]?.business_name||ra[0]?.business_name||mid;
      const isoName=rb[0]?.isos?.name||ra[0]?.isos?.name||"";
      byMerchant.push({mid,name,isoName,netA,netB,netChange,netPct,volA,volB,volChange:volB-volA,hasDataA:ra.length>0,hasDataB:rb.length>0});
    });
    byMerchant.sort((a,b)=>Math.abs(b.netChange)-Math.abs(a.netChange));
    return{labelA,labelB,isos:isoList,merchants:byMerchant,overall:{netA:totNetA,netB:totNetB,netChange:totNetB-totNetA,netPct:totNetA!==0?((totNetB-totNetA)/Math.abs(totNetA)*100):0,volA:totVolA,volB:totVolB,volChange:totVolB-totVolA,volPct:totVolA!==0?((totVolB-totVolA)/Math.abs(totVolA)*100):0,midsA:midSetA.size,midsB:midSetB.size,lostMerchants:[...midSetA].filter(m=>!midSetB.has(m)).length,newMerchants:[...midSetB].filter(m=>!midSetA.has(m)).length},drops:isoList.filter(i=>i.netChange<-50).length,gains:isoList.filter(i=>i.netChange>50).length};
  };

  const loadOverview=async()=>{
    setLoadingOverview(true);
    const pd=getPeriodDates(overviewPeriod);if(!pd){setLoadingOverview(false);return;}
    let rowsA=[],rowsB=[];
    if(pd.type==="month"){[rowsA,rowsB]=await Promise.all([fetchByMonths([pd.dateA]),fetchByMonths([pd.dateB])]);}
    else if(pd.type==="quarter"){[rowsA,rowsB]=await Promise.all([fetchByMonths(pd.monthsA),fetchByMonths(pd.monthsB)]);}
    else{[rowsA,rowsB]=await Promise.all([fetchByYear(pd.yearA),fetchByYear(pd.yearB)]);}
    setOverviewData(buildComparison(rowsA,rowsB,pd.labelA,pd.labelB));
    setLoadingOverview(false);
  };

  const runComparison=async()=>{
    if(!compareA||!compareB)return;
    setRunningComparison(true);
    let rowsA=[],rowsB=[];
    const pt=comparePeriodType;
    if(pt==="month"){[rowsA,rowsB]=await Promise.all([fetchByMonths([compareA]),fetchByMonths([compareB])]);}
    else if(pt==="quarter"){const qA=dayjs(compareA).startOf("quarter"),qB=dayjs(compareB).startOf("quarter");[rowsA,rowsB]=await Promise.all([fetchByMonths([0,1,2].map(i=>qA.add(i,"month").format("YYYY-MM-DD"))),fetchByMonths([0,1,2].map(i=>qB.add(i,"month").format("YYYY-MM-DD")))]);}
    else{[rowsA,rowsB]=await Promise.all([fetchByYear(dayjs(compareA).year()),fetchByYear(dayjs(compareB).year())]);}
    const labelA=pt==="month"?dayjs(compareA).format("MMM YYYY"):pt==="quarter"?`Q${dayjs(compareA).quarter()} ${dayjs(compareA).year()}`:String(dayjs(compareA).year());
    const labelB=pt==="month"?dayjs(compareB).format("MMM YYYY"):pt==="quarter"?`Q${dayjs(compareB).quarter()} ${dayjs(compareB).year()}`:String(dayjs(compareB).year());
    setComparison(buildComparison(rowsA,rowsB,labelA,labelB));
    setRunningComparison(false);
  };

  const overviewTab=(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <Text style={{color:"var(--muted-color)",fontSize:13}}>Auto-loaded summary based on available data</Text>
        <Radio.Group value={overviewPeriod} onChange={e=>setOverviewPeriod(e.target.value)} buttonStyle="solid" size="middle">
          {[{label:"Last 30 Days",value:"30"},{label:"Last 60 Days",value:"60"},{label:"Last 90 Days",value:"90"},{label:"Quarterly",value:"quarter"},{label:"Annual",value:"year"}].map(o=><Radio.Button key={o.value} value={o.value}>{o.label}</Radio.Button>)}
        </Radio.Group>
      </div>

      {/* Monthly trend line chart */}
      {monthlyTrend.length >= 2 && (
        <Card style={{ marginBottom: 16, borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <Text style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted-color)", display: "block" }}>PayDiverse Net Income -- Monthly Trend</Text>
              <Text style={{ fontSize: 12, color: "var(--muted-color)" }}>{monthlyTrend[0]?.label} to {monthlyTrend[monthlyTrend.length - 1]?.label} -- {monthlyTrend.length} months</Text>
            </div>
            <div style={{ textAlign: "right" }}>
              <Text style={{ fontSize: 11, color: "var(--muted-color)" }}>Latest</Text>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--primary-color)" }}>{fmtK(monthlyTrend[monthlyTrend.length - 1]?.net)}</div>
            </div>
          </div>
          <TrendChart data={monthlyTrend} height={140} primaryColor="#1d4ed8" labelKey="label" valueKey="net"/>
        </Card>
      )}

      {loadingOverview&&<div style={{textAlign:"center",padding:60}}><Spin size="large"/><br/><Text style={{color:"var(--muted-color)",marginTop:12,display:"block"}}>Loading summary...</Text></div>}
      {!loadingOverview&&overviewData&&(
        <>
          <Text style={{color:"var(--muted-color)",fontSize:12,display:"block",marginBottom:14}}>
            Comparing <strong>{overviewData.labelA}</strong> to <strong>{overviewData.labelB}</strong>
          </Text>
          <Row gutter={16} style={{marginBottom:16}}>
            {[
              {title:"Net Income Change",value:overviewData.overall.netChange,color:overviewData.overall.netChange>=0?"#059669":"#dc2626",doFmt:true,prefix:overviewData.overall.netChange>=0?"up":"dn",filter:null},
              {title:"ISOs with Drop",value:overviewData.drops,color:"#dc2626",filter:"drops"},
              {title:"ISOs with Growth",value:overviewData.gains,color:"#059669",filter:"gains"},
              {title:"Merchants Left",value:overviewData.overall.lostMerchants,color:"#f59e0b",filter:"left"},
            ].map(({title,value,color,prefix,doFmt,filter})=>(
              <Col span={6} key={title}>
                <Card onClick={()=>filter&&setActiveFilter(activeFilter===filter?null:filter)}
                  style={{cursor:filter?"pointer":"default",border:activeFilter===filter&&filter?`2px solid ${color}`:"1px solid var(--line-color)",transition:"all 0.18s",transform:activeFilter===filter&&filter?"translateY(-2px)":"none"}}>
                  <Statistic title={title} value={doFmt?Math.abs(value):value} prefix={doFmt?prefix:undefined} formatter={doFmt?v=>`$${Number(v).toLocaleString("en-US",{minimumFractionDigits:2})}`:undefined} valueStyle={{color,fontWeight:700}}/>
                  {filter&&<Text style={{fontSize:10,color:activeFilter===filter?color:"#94a3b8",display:"block",marginTop:4}}>{activeFilter===filter?"filtered -- click to clear":"click to filter"}</Text>}
                </Card>
              </Col>
            ))}
          </Row>
          {activeFilter&&(
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"8px 14px",background:"#eff6ff",borderRadius:10,border:"1px solid #bfdbfe"}}>
              <Text style={{fontSize:13,fontWeight:600,color:"#1d4ed8"}}>
                {activeFilter==="drops"?`Showing ${overviewData.drops} ISO${overviewData.drops!==1?"s":""} with dropped income`:
                 activeFilter==="gains"?`Showing ${overviewData.gains} ISO${overviewData.gains!==1?"s":""} with grown income`:
                 `Showing ISOs with merchants who left`}
              </Text>
              <Button size="small" onClick={()=>setActiveFilter(null)} style={{marginLeft:"auto"}}>Clear</Button>
            </div>
          )}
          <Row gutter={16} style={{marginBottom:16}}>
            <Col span={12}>
              <Card style={{borderLeft:`4px solid ${overviewData.overall.netChange>=0?"#059669":"#dc2626"}`}}>
                <Text style={{fontSize:11,color:"var(--muted-color)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px",display:"block",marginBottom:10}}>Overall Net Income</Text>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <div><Text style={{color:"var(--muted-color)",fontSize:12,display:"block"}}>{overviewData.labelA}</Text><Text strong style={{fontSize:20}}>{fmtK(overviewData.overall.netA)}</Text></div>
                  <Text style={{fontSize:20,color:"var(--muted-color)"}}>-></Text>
                  <div><Text style={{color:"var(--muted-color)",fontSize:12,display:"block"}}>{overviewData.labelB}</Text><Text strong style={{fontSize:20,color:overviewData.overall.netChange>=0?"#059669":"#dc2626"}}>{fmtK(overviewData.overall.netB)}</Text></div>
                  <Tag color={overviewData.overall.netChange>=0?"green":"red"} style={{fontSize:13,marginLeft:4}}>{overviewData.overall.netChange>=0?"up":"dn"} {fmtPct(Math.abs(overviewData.overall.netPct))}</Tag>
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card style={{borderLeft:"4px solid #6b7a99"}}>
                <Text style={{fontSize:11,color:"var(--muted-color)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px",display:"block",marginBottom:10}}>Total Volume</Text>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <div><Text style={{color:"var(--muted-color)",fontSize:12,display:"block"}}>{overviewData.labelA}</Text><Text strong style={{fontSize:20}}>{fmtK(overviewData.overall.volA)}</Text></div>
                  <Text style={{fontSize:20,color:"var(--muted-color)"}}>-></Text>
                  <div><Text style={{color:"var(--muted-color)",fontSize:12,display:"block"}}>{overviewData.labelB}</Text><Text strong style={{fontSize:20,color:overviewData.overall.volChange>=0?"#059669":"#dc2626"}}>{fmtK(overviewData.overall.volB)}</Text></div>
                  <Tag color={overviewData.overall.volChange>=0?"green":"red"} style={{fontSize:13,marginLeft:4}}>{overviewData.overall.volChange>=0?"up":"dn"} {fmtPct(Math.abs(overviewData.overall.volPct))}</Tag>
                </div>
              </Card>
            </Col>
          </Row>
          {(()=>{
            const filtered=overviewData.isos.filter(iso=>{
              if(!activeFilter)return true;
              if(activeFilter==="drops")return iso.netChange<-50;
              if(activeFilter==="gains")return iso.netChange>50;
              if(activeFilter==="left")return iso.lostMerchants.length>0;
              return true;
            });
            if(filtered.length===0)return<Card><div style={{textAlign:"center",padding:"30px",color:"var(--muted-color)"}}><Text>No ISOs match this filter for this period.</Text></div></Card>;
            return filtered.map(iso=><ISOCard key={iso.isoId} iso={iso} labelA={overviewData.labelA} labelB={overviewData.labelB}/>);
          })()}
        </>
      )}
      {!loadingOverview&&overviewData&&overviewData.isos.length===0&&!activeFilter&&(
        <Card><div style={{textAlign:"center",padding:"40px",color:"var(--muted-color)"}}><BulbOutlined style={{fontSize:40,display:"block",marginBottom:12,color:"#d1d5db"}}/><Text style={{fontSize:15,fontWeight:600,display:"block",marginBottom:8}}>No data for this period</Text><Text>Upload residual reports via Import Report to see comparisons here.</Text></div></Card>
      )}
    </div>
  );

  const comparisonTab=(
    <div>
      <Card style={{marginBottom:16}}>
        <Space direction="vertical" style={{width:"100%"}} size={12}>
          <Row gutter={16} align="middle">
            <Col><Text strong>Compare by:</Text></Col>
            <Col><Radio.Group value={compareBy} onChange={e=>setCompareBy(e.target.value)} buttonStyle="solid"><Radio.Button value="iso">By ISO</Radio.Button><Radio.Button value="overall">Overall</Radio.Button><Radio.Button value="merchant">By Merchant</Radio.Button></Radio.Group></Col>
            <Col><Text strong style={{marginLeft:16}}>Period:</Text></Col>
            <Col><Radio.Group value={comparePeriodType} onChange={e=>{setComparePeriodType(e.target.value);setCompareA(null);setCompareB(null);}} buttonStyle="solid"><Radio.Button value="month">Month</Radio.Button><Radio.Button value="quarter">Quarter</Radio.Button><Radio.Button value="year">Year</Radio.Button></Radio.Group></Col>
          </Row>
          <Row gutter={12} align="middle">
            <Col><Text strong>From:</Text></Col>
            <Col><DatePicker picker={comparePeriodType==="month"?"month":comparePeriodType==="quarter"?"quarter":"year"} onChange={d=>setCompareA(d?d.startOf(comparePeriodType==="year"?"year":comparePeriodType==="quarter"?"quarter":"month").format("YYYY-MM-DD"):null)} style={{width:160}}/></Col>
            <Col><Text style={{color:"var(--muted-color)",fontSize:16}}>-></Text></Col>
            <Col><DatePicker picker={comparePeriodType==="month"?"month":comparePeriodType==="quarter"?"quarter":"year"} onChange={d=>setCompareB(d?d.startOf(comparePeriodType==="year"?"year":comparePeriodType==="quarter"?"quarter":"month").format("YYYY-MM-DD"):null)} style={{width:160}}/></Col>
            <Col><Button type="primary" onClick={runComparison} loading={runningComparison} disabled={!compareA||!compareB} size="large">Run Comparison</Button></Col>
          </Row>
        </Space>
      </Card>
      {runningComparison&&<div style={{textAlign:"center",padding:60}}><Spin size="large"/></div>}
      {comparison&&!runningComparison&&(
        <>
          <Row gutter={16} style={{marginBottom:16}}>
            {[{title:"Net Income Delta",value:comparison.overall.netChange,color:comparison.overall.netChange>=0?"#059669":"#dc2626",doFmt:true,prefix:comparison.overall.netChange>=0?"up":"dn"},{title:"ISOs with Drop",value:comparison.drops,color:"#dc2626"},{title:"ISOs with Growth",value:comparison.gains,color:"#059669"}].map(({title,value,color,prefix,doFmt})=>(
              <Col span={8} key={title}><Card><Statistic title={title} value={doFmt?Math.abs(value):value} prefix={doFmt?prefix:undefined} formatter={doFmt?v=>`$${Number(v).toLocaleString("en-US",{minimumFractionDigits:2})}`:undefined} valueStyle={{color,fontWeight:700}}/></Card></Col>
            ))}
          </Row>

          {/* Line chart for trend comparison */}
          {monthlyTrend.length >= 2 && (
            <Card style={{ marginBottom: 16, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted-color)", display: "block", marginBottom: 4 }}>Net Income Trend -- Full History</Text>
              <Text style={{ fontSize: 12, color: "var(--muted-color)", display: "block", marginBottom: 12 }}>
                Highlighted periods: <strong style={{color:"#1d4ed8"}}>{comparison.labelA}</strong> and <strong style={{color:"#059669"}}>{comparison.labelB}</strong>
              </Text>
              <TrendChart data={monthlyTrend} height={130} primaryColor="#1d4ed8" labelKey="label" valueKey="net"/>
            </Card>
          )}

          {/* ISO comparison bar chart */}
          {compareBy === "iso" && comparison.isos.filter(i => i.hasDataA && i.hasDataB).length > 0 && (
            <Card style={{ marginBottom: 16, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted-color)", display: "block", marginBottom: 12 }}>
                ISO Net Income -- {comparison.labelA} vs {comparison.labelB} (top 8 by change)
              </Text>
              <CompareChart items={comparison.isos} labelA={comparison.labelA} labelB={comparison.labelB}/>
            </Card>
          )}

          <Text style={{color:"var(--muted-color)",fontSize:12,display:"block",marginBottom:12}}>{comparison.labelA} to {comparison.labelB} -- {compareBy==="merchant"?`${comparison.merchants.length} merchants`:compareBy==="iso"?`${comparison.isos.length} ISOs`:"overall"} compared</Text>
          {compareBy==="iso"&&comparison.isos.map(iso=><ISOCard key={iso.isoId} iso={iso} labelA={comparison.labelA} labelB={comparison.labelB}/>)}
          {compareBy==="merchant"&&(
            <div>
              {comparison.merchants.length===0?(
                <Card><div style={{textAlign:"center",padding:"40px",color:"var(--muted-color)"}}><Text>No merchant data for this period.</Text></div></Card>
              ):(
                <Space direction="vertical" style={{width:"100%"}} size={8}>
                  {comparison.merchants.map(m=>(
                    <Card key={m.mid} size="small" style={{borderLeft:`3px solid ${!m.hasDataA||!m.hasDataB?"#f59e0b":m.netChange<-10?"#dc2626":m.netChange>10?"#059669":"#d1d5db"}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <Text strong style={{fontSize:14}}>{m.name}</Text>
                          {m.isoName&&<Tag style={{marginLeft:8}} color="blue">{m.isoName}</Tag>}
                          {!m.hasDataB&&<Tag color="red" style={{marginLeft:4}}>Left</Tag>}
                          {!m.hasDataA&&<Tag color="green" style={{marginLeft:4}}>New</Tag>}
                          <div style={{fontSize:11,color:"var(--muted-color)",marginTop:2}}>MID: {m.mid}</div>
                        </div>
                        <Space align="center">
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:11,color:"var(--muted-color)"}}>Net Income</div>
                            <Space>
                              <Text style={{color:"var(--muted-color)",fontSize:13}}>{m.netA!=null?`$${Number(m.netA).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"--"}</Text>
                              <Text style={{color:"var(--muted-color)"}}>-></Text>
                              <Text strong style={{color:m.netChange<-1?"#dc2626":m.netChange>1?"#059669":"var(--black-color)",fontSize:14}}>
                                {m.netB!=null?`$${Number(m.netB).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"--"}
                              </Text>
                            </Space>
                          </div>
                          <Tag color={m.netChange>1?"green":m.netChange<-1?"red":"default"} style={{fontSize:12,padding:"4px 10px"}}>
                            {m.netChange>=0?"up":"dn"} {Math.abs(m.netPct).toFixed(1)}%
                          </Tag>
                        </Space>
                      </div>
                    </Card>
                  ))}
                </Space>
              )}
            </div>
          )}
          {compareBy==="overall"&&(
            <Card><Row gutter={12}>
              <Col span={8}><MetricBox label="Net Income" valA={comparison.overall.netA} valB={comparison.overall.netB} change={comparison.overall.netChange} changePct={comparison.overall.netPct}/></Col>
              <Col span={8}><MetricBox label="Volume" valA={comparison.overall.volA} valB={comparison.overall.volB} change={comparison.overall.volChange} changePct={comparison.overall.volPct}/></Col>
              <Col span={8}><MetricBox label="Merchants" valA={comparison.overall.midsA} valB={comparison.overall.midsB} change={comparison.overall.midsB-comparison.overall.midsA} changePct={comparison.overall.midsA?((comparison.overall.midsB-comparison.overall.midsA)/comparison.overall.midsA*100):0} formatter={v=>String(Math.round(v))}/></Col>
            </Row></Card>
          )}
        </>
      )}
      {!comparison&&!runningComparison&&(<Card><div style={{textAlign:"center",padding:"60px 20px",color:"var(--muted-color)"}}><BulbOutlined style={{fontSize:48,marginBottom:16,display:"block",color:"#d1d5db"}}/><Text style={{fontSize:16,fontWeight:600,display:"block",marginBottom:8}}>Set your comparison parameters above</Text><Text>Choose the period type, pick two periods, and click Run Comparison.</Text></div></Card>)}
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><Title level={4} style={{margin:0}}>Insights</Title></div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large" items={[{key:"overview",label:"Overview",children:overviewTab},{key:"comparison",label:"Comparison",children:comparisonTab}]}/>
    </div>
  );
};
export default InsightsPage;
