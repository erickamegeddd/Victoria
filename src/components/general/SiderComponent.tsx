// @ts-nocheck
import { useState } from "react";
import { Menu } from "antd";
import { useNavigate } from "react-router-dom";
import { LogoutOutlined, DollarOutlined, BarChartOutlined, AreaChartOutlined, ImportOutlined, SnippetsOutlined, DiffOutlined, UserAddOutlined, BulbOutlined, BankOutlined, SettingOutlined, MessageOutlined } from "@ant-design/icons";
import { LuUsers } from "react-icons/lu";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { MdPayment } from "react-icons/md";
import { TbLayoutDashboard } from "react-icons/tb";
import { getUserFromLocalStorage } from "../../utils/getUser";
import { handleLogout } from "../../utils/logout";
import AskVictoria from "./AskVictoria";

const ic = (icon, color, bg) => (
  <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:28,height:28,borderRadius:8,background:bg,color:color,fontSize:15,flexShrink:0}}>
    {icon}
  </span>
);

const SiderComponent = () => {
  const navigate = useNavigate();
  const currentPath = window.location.pathname;
  const user = getUserFromLocalStorage();
  const [askOpen, setAskOpen] = useState(false);

  const adminPaths = ["/home/users","/home/adjustments","/home/agents","/home/logs","/home/import-data"];

  const allMenuItems = [
    { key:"/home", label:"Overview", icon:ic(<TbLayoutDashboard/>, "#60a5fa", "rgba(96,165,250,0.18)") },
    { key:"/home/iso-merchants", label:"ISOs", icon:ic(<BankOutlined/>, "#818cf8", "rgba(129,140,248,0.18)") },
    { key:"/home/merchants", label:"Merchants / MIDs", icon:ic(<DiffOutlined/>, "#fb923c", "rgba(251,146,60,0.18)") },
    { key:"/home/revenue-mid", label:"Revenue per MID", icon:ic(<DollarOutlined/>, "#fbbf24", "rgba(251,191,36,0.18)") },
    { key:"/home/payments", label:"Payments", icon:ic(<MdPayment/>, "#4ade80", "rgba(74,222,128,0.18)") },
    { key:"/home/insights", label:"Insights", icon:ic(<BulbOutlined/>, "#fcd34d", "rgba(252,211,77,0.18)") },
    { key:"/home/industry", label:"Industry", icon:ic(<AreaChartOutlined/>, "#38bdf8", "rgba(56,189,248,0.18)") },
    { type:"divider" },
    {
      key:"admin",
      label:"Administrator",
      icon:ic(<SettingOutlined/>, "#a78bfa", "rgba(167,139,250,0.18)"),
      children:[
        { key:"/home/users", label:"Users", icon:ic(<LuUsers/>, "#f472b6", "rgba(244,114,182,0.18)") },
        { key:"/home/adjustments", label:"Adjustments", icon:ic(<LiaFileInvoiceDollarSolid/>, "#f87171", "rgba(248,113,113,0.18)") },
        { key:"/home/agents", label:"Agents Data", icon:ic(<BarChartOutlined/>, "#22d3ee", "rgba(34,211,238,0.18)") },
        { key:"/home/logs", label:"Logs", icon:ic(<SnippetsOutlined/>, "#94a3b8", "rgba(148,163,184,0.18)") },
        { key:"/home/import-data", label:"Import Data", icon:ic(<ImportOutlined/>, "#34d399", "rgba(52,211,153,0.18)") },
      ]
    },
    { type:"divider" },
    { key:"logout", label:"Logout", icon:ic(<LogoutOutlined/>, "#f87171", "rgba(248,113,113,0.18)"), danger:true },
  ];

  const flatten = (items=[]) => items.reduce((acc,item)=>{ acc.push(item); if(item.children)acc=acc.concat(flatten(item.children)); return acc; },[]);
  const flatItems = flatten(allMenuItems);

  const matchKey = (path) => {
    for(const item of flatItems){
      if(item.key && path === item.key) return item.key;
    }
    if(path.startsWith("/home/users")) return "/home/users";
    if(path.startsWith("/home/adjustments")) return "/home/adjustments";
    if(path.startsWith("/home/merchants")) return "/home/merchants";
    return undefined;
  };

  const onClick = ({key}) => {
    if(key === "logout") handleLogout(navigate);
    else if(key !== "admin") navigate(key);
  };

  const isInAdmin = adminPaths.some(p => currentPath.startsWith(p));

  return (
    <>
      <div style={{paddingTop:8,height:"100%",display:"flex",flexDirection:"column",position:"relative"}}>
        <div style={{padding:"14px 16px 10px",borderBottom:"1px solid rgba(255,255,255,0.07)",marginBottom:4}}>
          <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:"rgba(255,255,255,0.3)"}}>Menu</span>
        </div>
        <Menu
          onClick={onClick}
          theme="dark"
          style={{background:"transparent",border:"none",flex:1,overflowY:"auto"}}
          selectedKeys={[matchKey(currentPath)||currentPath]}
          defaultOpenKeys={isInAdmin ? ["admin"] : []}
          mode="inline"
          items={allMenuItems}
        />
        {/* Ask Victoria floating bubble + label - centered */}
        <div style={{display:"flex",justifyContent:"center",marginBottom:16,marginTop:4}}>
          <div
            onClick={() => setAskOpen(true)}
            style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}
            onMouseEnter={e => e.currentTarget.querySelector("span").style.color="rgba(255,255,255,1)"}
            onMouseLeave={e => e.currentTarget.querySelector("span").style.color="rgba(255,255,255,0.7)"}
          >
            <div style={{
              width:38,height:38,borderRadius:"50%",flexShrink:0,
              background:"#f59e0b",
              boxShadow:"0 4px 14px rgba(245,158,11,0.45)",
              display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all 0.18s",
            }}>
              <MessageOutlined style={{fontSize:17,color:"#fff"}}/>
            </div>
            <span style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.7)",transition:"color 0.18s"}}>Ask Victoria</span>
          </div>
        </div>
      </div>
      <AskVictoria open={askOpen} onClose={() => setAskOpen(false)} />
    </>
  );
};
export default SiderComponent;
