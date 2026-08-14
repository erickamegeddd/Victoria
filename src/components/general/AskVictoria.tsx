// @ts-nocheck
import { useState } from "react";
import { Drawer, Typography, Spin, Input, Button, Tag } from "antd";
import { MessageOutlined, SendOutlined, ArrowLeftOutlined, CloseOutlined } from "@ant-design/icons";
import { supabase } from "../../utils/supabase";
import dayjs from "dayjs";
const { Text, Title } = Typography;
const { TextArea } = Input;

const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cWZsb2Z1emh5YnV0a2t6cm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE3NTYsImV4cCI6MjEwMTYxNzc1Nn0.46kKCy_3cY7oKuONb9e2e18yKVNui3oSOzySK33fMFE";
const fmt = (n) => n != null ? `$${Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}` : "--";
const fmtK = (n) => { if (!n) return "$0"; if (Math.abs(n) >= 1e6) return `$${(n/1e6).toFixed(1)}M`; if (Math.abs(n) >= 1e3) return `$${(n/1e3).toFixed(1)}K`; return fmt(n); };

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  });
  return res.json();
}

const CATEGORIES = [
  { key: "iso", icon: "📊", label: "ISO Performance", desc: "Top ISOs, residual trends" },
  { key: "payments", icon: "💰", label: "Payments & Collections", desc: "Pending, overdue, received" },
  { key: "merchants", icon: "🏪", label: "Merchants", desc: "Active, inactive, by ISO" },
  { key: "revenue", icon: "📈", label: "Revenue Summary", desc: "Monthly totals & trends" },
  { key: "overdue", icon: "⚠", label: "Overdue Alerts", desc: "Payments past due date" },
  { key: "custom", icon: "💬", label: "Ask a question", desc: "Type your own question" },
];

async function fetchData(category, customQ) {
  if (category === "iso") {
    const [residuals, isos] = await Promise.all([
      sbGet("residuals?select=iso_id,report_month,paydiversenet,isos(name)&order=report_month.desc&limit=500"),
      sbGet("isos?select=id,name&eq.status=active&limit=100")
    ]);
    const byISO = {};
    residuals.forEach(r => {
      const name = r.isos?.name || "Unknown";
      if (!byISO[name]) byISO[name] = { net: 0, months: new Set() };
      byISO[name].net += (r.paydiversenet || 0);
      byISO[name].months.add(r.report_month);
    });
    const ranked = Object.entries(byISO).sort((a,b) => b[1].net - a[1].net);
    const top5 = ranked.slice(0,5);
    const total = ranked.reduce((s,[,d]) => s+d.net, 0);
    return `**ISO Performance Summary**\n\nTotal PayDiverse Net (all time): ${fmtK(total)}\n\n**Top 5 ISOs by Net Income:**\n${top5.map(([name,d],i) => `${i+1}. ${name}: ${fmtK(d.net)} across ${d.months.size} month(s)`).join("\n")}\n\n**Total active ISOs with residual data:** ${ranked.length}`;
  }

  if (category === "payments") {
    const payments = await sbGet("iso_payments?select=iso_id,report_month,expected_amount,received_amount,notes,status,isos(name)&order=report_month.desc&limit=200");
    const today = dayjs().format("YYYY-MM-DD");
    let pending = 0, paid = 0, overdue = 0, shortPaid = 0;
    let totalExpected = 0, totalReceived = 0;
    const overdueList = [];
    payments.forEach(p => {
      totalExpected += (p.expected_amount || 0);
      totalReceived += (p.received_amount || 0);
      const expDate = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1];
      if (p.received_amount == null) {
        if (expDate && expDate < today) { overdue++; overdueList.push(`${p.isos?.name} (${dayjs(p.report_month).format("MMM YYYY")})`); }
        else pending++;
      } else {
        const diff = p.received_amount - (p.expected_amount || 0);
        if (Math.abs(diff) < 0.01) paid++;
        else if (diff < 0) shortPaid++;
        else paid++;
      }
    });
    return `**Payments & Collections Summary**\n\nTotal Expected: ${fmtK(totalExpected)}\nTotal Received: ${fmtK(totalReceived)}\nDifference: ${fmtK(totalReceived - totalExpected)}\n\n**Status Breakdown:**\n- Paid in Full: ${paid}\n- Pending: ${pending}\n- Short Paid: ${shortPaid}\n- Overdue: ${overdue}${overdueList.length ? "\n\n**Overdue ISOs:**\n" + overdueList.slice(0,5).join("\n") : ""}`;
  }

  if (category === "merchants") {
    const merchants = await sbGet("merchants?select=status,current_iso_id,isos(name)&limit=1000");
    const active = merchants.filter(m => m.status === "active").length;
    const inactive = merchants.filter(m => m.status !== "active").length;
    const byISO = {};
    merchants.forEach(m => {
      const name = m.isos?.name || "Unknown";
      if (!byISO[name]) byISO[name] = { active: 0, inactive: 0 };
      if (m.status === "active") byISO[name].active++;
      else byISO[name].inactive++;
    });
    const top5 = Object.entries(byISO).sort((a,b) => (b[1].active+b[1].inactive)-(a[1].active+a[1].inactive)).slice(0,5);
    return `**Merchant Overview**\n\nTotal Merchants: ${merchants.length}\n- Active: ${active}\n- Inactive: ${inactive}\n\n**Top 5 ISOs by Merchant Count:**\n${top5.map(([name,d]) => `- ${name}: ${d.active+d.inactive} total (${d.active} active)`).join("\n")}`;
  }

  if (category === "revenue") {
    const residuals = await sbGet("residuals?select=report_month,paydiversenet,gross_revenue&order=report_month.asc&limit=2000");
    const byMonth = {};
    residuals.forEach(r => {
      const m = r.report_month;
      if (!byMonth[m]) byMonth[m] = { net: 0, gross: 0 };
      byMonth[m].net += (r.paydiversenet || 0);
      byMonth[m].gross += (r.gross_revenue || 0);
    });
    const months = Object.entries(byMonth).sort(([a],[b]) => a.localeCompare(b));
    const bestMonth = months.reduce((best, cur) => cur[1].net > best[1].net ? cur : best, months[0] || ["", {net:0}]);
    const totalNet = months.reduce((s,[,d]) => s+d.net, 0);
    const last3 = months.slice(-3);
    return `**Revenue Summary**\n\nAll-Time Net Income: ${fmtK(totalNet)}\nMonths with Data: ${months.length}\nBest Month: ${dayjs(bestMonth[0]).format("MMMM YYYY")} (${fmtK(bestMonth[1].net)})\n\n**Last ${last3.length} Months:**\n${last3.map(([m,d]) => `- ${dayjs(m).format("MMM YYYY")}: ${fmtK(d.net)} net`).join("\n")}`;
  }

  if (category === "overdue") {
    const payments = await sbGet("iso_payments?select=iso_id,report_month,expected_amount,received_amount,notes,isos(name)&is.received_amount=null&limit=200");
    const today = dayjs().format("YYYY-MM-DD");
    const overdue = payments.filter(p => {
      const exp = p.notes?.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/)?.[1];
      return exp && exp < today;
    });
    if (!overdue.length) return "No overdue payments found. All expected payments are either received or not yet past due.";
    const total = overdue.reduce((s,p) => s+(p.expected_amount||0), 0);
    return `**Overdue Payment Alerts**\n\n${overdue.length} payment(s) past expected date.\nTotal Overdue Amount: ${fmtK(total)}\n\n**Overdue List:**\n${overdue.slice(0,10).map(p => `- ${p.isos?.name}: ${fmtK(p.expected_amount)} (${dayjs(p.report_month).format("MMM YYYY")})`).join("\n")}`;
  }

  if (category === "custom") {
    const groqHistory = messages.map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text
    }));
    const res = await fetch("/api/victoria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: customQ, history: groqHistory })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.answer;
  }
  return "Please select a category.";
}

const AskVictoria = ({ open, onClose }) => {
  const [step, setStep] = useState("categories"); // categories | loading | answer | custom
  const [selectedCat, setSelectedCat] = useState(null);
  const [customQ, setCustomQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [messages, setMessages] = useState([]);

  const reset = () => { setStep("categories"); setSelectedCat(null); setCustomQ(""); setAnswer(""); };

  const handleCategory = async (cat) => {
    setSelectedCat(cat);
    if (cat.key === "custom") { setStep("custom"); return; }
    setStep("loading");
    try {
      const result = await fetchData(cat.key, "");
      const now = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
      setMessages(prev => [...prev, { role:"user", text: cat.label, time: now }, { role:"victoria", text: result, time: now }]);
      setStep("answer");
    } catch(e) {
      setStep("answer");
      setMessages(prev => [...prev, { role:"victoria", text: "Sorry, I ran into an error fetching that data. Please try again.", time: "" }]);
    }
  };

  const handleCustomSubmit = async () => {
    if (!customQ.trim()) return;
    const q = customQ;
    const now = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    setMessages(prev => [...prev, { role:"user", text: q, time: now }]);
    setStep("loading");
    setCustomQ("");
    try {
      const result = await fetchData("custom", q);
      setMessages(prev => [...prev, { role:"victoria", text: result, time: now }]);
      setStep("answer");
    } catch(e) {
      setMessages(prev => [...prev, { role:"victoria", text: "Sorry, I ran into an error. Please try again.", time: now }]);
      setStep("answer");
    }
  };

  const handleClose = () => { reset(); setMessages([]); onClose(); };

  const renderMessage = (text) => text.split("\n").map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**")) return <div key={i} style={{fontWeight:700,marginTop:i>0?8:0,color:"#1d4ed8"}}>{line.replace(/\*\*/g,"")}</div>;
    if (line.startsWith("- ")) return <div key={i} style={{paddingLeft:12,marginTop:2}}>{line}</div>;
    if (!line.trim()) return <div key={i} style={{height:6}}/>;
    return <div key={i}>{line}</div>;
  });

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      placement="left"
      width={380}
      styles={{ body: { padding: 0, display:"flex", flexDirection:"column", height:"100%" } }}
      title={
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>V</div>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>Ask Victoria</div>
            <div style={{fontSize:11,color:"#64748b"}}>Your PayDiverse data assistant</div>
          </div>
        </div>
      }
      closeIcon={<CloseOutlined style={{fontSize:14}}/>}
    >
      {/* Messages area */}
      {messages.length > 0 && (
        <div style={{flex:1,overflowY:"auto",padding:"16px 16px 8px",display:"flex",flexDirection:"column",gap:12,minHeight:0}}>
          {messages.map((msg,i) => (
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:msg.role==="user"?"flex-end":"flex-start"}}>
              {msg.role === "victoria" && (
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700}}>V</div>
                  <Text style={{fontSize:11,color:"#64748b"}}>Victoria {msg.time}</Text>
                </div>
              )}
              <div style={{
                background: msg.role==="user"?"#1d4ed8":"rgba(255,255,255,0.85)",
                color: msg.role==="user"?"#fff":"#0f172a",
                padding:"10px 14px", borderRadius: msg.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
                maxWidth:"85%", fontSize:13, border: msg.role==="victoria"?"1px solid #e2e8f0":"none",
                lineHeight:1.5
              }}>
                {msg.role==="victoria" ? renderMessage(msg.text) : msg.text}
              </div>
              {msg.role==="user" && <Text style={{fontSize:11,color:"#64748b",marginTop:2}}>You {msg.time}</Text>}
            </div>
          ))}
          {step==="loading" && (
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"rgba(255,255,255,0.85)",borderRadius:12,border:"1px solid #e2e8f0",width:"fit-content"}}>
              <Spin size="small"/>
              <Text style={{fontSize:13,color:"#64748b"}}>Victoria is looking up your data...</Text>
            </div>
          )}
        </div>
      )}

      {/* Categories or loading (first time) */}
      {messages.length === 0 && step === "categories" && (
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          <div style={{background:"linear-gradient(135deg,rgba(29,78,216,0.08),rgba(124,58,237,0.06))",borderRadius:12,padding:"14px 16px",marginBottom:16,border:"1px solid rgba(29,78,216,0.12)"}}>
            <Text style={{fontSize:13,color:"#374151",lineHeight:1.5}}>Hi! I'm Victoria, your data assistant. I can pull live information from your dashboard. What would you like to know?</Text>
          </div>
          <Text style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.8px",display:"block",marginBottom:10}}>Choose a topic</Text>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {CATEGORIES.map(cat => (
              <div key={cat.key} onClick={() => handleCategory(cat)}
                style={{padding:"12px 10px",borderRadius:12,border:"1px solid #e2e8f0",background:"rgba(255,255,255,0.75)",cursor:"pointer",transition:"all 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(29,78,216,0.06)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.75)"}>
                <div style={{fontSize:20,marginBottom:4}}>{cat.icon}</div>
                <div style={{fontSize:12,fontWeight:700,color:"#0f172a",marginBottom:2}}>{cat.label}</div>
                <div style={{fontSize:11,color:"#64748b"}}>{cat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {messages.length === 0 && step === "loading" && (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
          <Spin size="large"/>
          <Text style={{color:"#64748b",fontSize:13}}>Fetching your data...</Text>
        </div>
      )}

      {/* Bottom input area */}
      <div style={{borderTop:"1px solid rgba(226,232,240,0.8)",padding:"12px 16px",background:"rgba(255,255,255,0.7)"}}>
        {(step === "custom" || step === "answer") ? (
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <TextArea
              value={customQ} onChange={e=>setCustomQ(e.target.value)}
              placeholder="Type your question..." autoSize={{minRows:1,maxRows:4}}
              style={{borderRadius:10,fontSize:13,flex:1,resize:"none"}}
              onPressEnter={e=>{if(!e.shiftKey){e.preventDefault();handleCustomSubmit();}}}
            />
            <Button type="primary" icon={<SendOutlined/>} onClick={handleCustomSubmit}
              disabled={!customQ.trim() || step==="loading"}
              style={{borderRadius:10,height:38,width:38,display:"flex",alignItems:"center",justifyContent:"center"}}/>
          </div>
        ) : (
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {step !== "loading" && messages.length > 0 && (
              <Button size="small" icon={<ArrowLeftOutlined/>} onClick={reset} style={{borderRadius:8}}>Topics</Button>
            )}
            <Text style={{fontSize:11,color:"#94a3b8",flex:1,textAlign:"center"}}>Data pulled live from your dashboard</Text>
          </div>
        )}
        {step === "answer" && (
          <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
            {CATEGORIES.filter(c=>c.key!=="custom").map(cat=>(
              <Tag key={cat.key} onClick={()=>handleCategory(cat)} style={{cursor:"pointer",borderRadius:12,fontSize:11,padding:"2px 8px"}}>
                {cat.icon} {cat.label}
              </Tag>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};
export default AskVictoria;
