// @ts-nocheck
import { Menu } from "antd";
import { useNavigate } from "react-router-dom";
import { LogoutOutlined, DollarOutlined, BarChartOutlined, AreaChartOutlined, ImportOutlined, LineChartOutlined, SnippetsOutlined, DiffOutlined, UserAddOutlined, HomeOutlined, BulbOutlined, BankOutlined } from "@ant-design/icons";
import { FaTable, FaPlus } from "react-icons/fa";
import { VscEye } from "react-icons/vsc";
import { IoInformationCircleOutline } from "react-icons/io5";
import { LuUsers, LuUserSearch } from "react-icons/lu";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { MdPayment } from "react-icons/md";
import { getUserFromLocalStorage } from "../../utils/getUser";
import { handleLogout } from "../../utils/logout";
const ic = (icon, color, bg) => (<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:28,height:28,borderRadius:8,background:bg,color:color,fontSize:14,flexShrink:0}}>{icon}</span>);
const SiderComponent = () => {
  const navigate = useNavigate();
  const currentPath = window.location.pathname;
  const user = getUserFromLocalStorage();
  const items = [
    { key:"/home", label:"Home", icon:ic(<LineChartOutlined/>, "#60a5fa", "rgba(96,165,250,0.18)") },
    { key:"/home/import-data", label:"Import Data", icon:ic(<ImportOutlined/>, "#34d399", "rgba(52,211,153,0.18)") },
    { key:"/home/iso", label:"ISO", icon:ic(<IoInformationCircleOutline/>, "#c084fc", "rgba(192,132,252,0.18)"), children:[
      { key:"/home/iso/new", label:"Add ISO", icon:ic(<FaPlus/>, "#c084fc", "rgba(192,132,252,0.15)") },
      { key:"/home/iso", label:"View ISO", icon:ic(<VscEye/>, "#c084fc", "rgba(192,132,252,0.15)") },
      { key:"/home/iso/mids", label:"MIDs Per ISO", icon:ic(<FaTable/>, "#c084fc", "rgba(192,132,252,0.15)") },
    ]},
    { key:"/home/users", label:"Users", icon:ic(<LuUsers/>, "#f472b6", "rgba(244,114,182,0.18)"), children:[
      { key:"/home/users/new", label:"Add Users", icon:ic(<UserAddOutlined/>, "#f472b6", "rgba(244,114,182,0.15)") },
      { key:"/home/users", label:"View Users", icon:ic(<LuUserSearch/>, "#f472b6", "rgba(244,114,182,0.15)") },
    ]},
    { key:"/home/merchants", label:"Merchants / MIDs", icon:ic(<DiffOutlined/>, "#fb923c", "rgba(251,146,60,0.18)") },
    { key:"/home/iso-merchants", label:"ISOs", icon:ic(<BankOutlined/>, "#818cf8", "rgba(129,140,248,0.18)") },
    { key:"/home/revenue-mid", label:"Revenue per MID", icon:ic(<DollarOutlined/>, "#fbbf24", "rgba(251,191,36,0.18)") },
    { key:"/home/agents", label:"Agents Data", icon:ic(<BarChartOutlined/>, "#22d3ee", "rgba(34,211,238,0.18)") },
    { key:"/home/adjustments", label:"Adjustments", icon:ic(<LiaFileInvoiceDollarSolid/>, "#f87171", "rgba(248,113,113,0.18)"), children:[
      { key:"/home/adjustments/new", label:"Add Adjustments", icon:ic(<FaPlus/>, "#f87171", "rgba(248,113,113,0.15)") },
      { key:"/home/adjustments", label:"View Adjustments", icon:ic(<VscEye/>, "#f87171", "rgba(248,113,113,0.15)") },
    ]},
    { key:"/home/payments", label:"Payments", icon:ic(<MdPayment/>, "#4ade80", "rgba(74,222,128,0.18)") },
    { key:"/home/insights", label:"Insights", icon:ic(<BulbOutlined/>, "#fcd34d", "rgba(252,211,77,0.18)") },
    { key:"/home/industry", label:"Industry", icon:ic(<AreaChartOutlined/>, "#38bdf8", "rgba(56,189,248,0.18)") },
    { key:"/home/logs", label:"Logs", icon:ic(<SnippetsOutlined/>, "#94a3b8", "rgba(148,163,184,0.18)") },
    { key:"logout", label:"Logout", icon:ic(<LogoutOutlined/>, "#f87171", "rgba(248,113,113,0.18)"), danger:true },
  ];
  const flatten = (items=[]) => items.reduce((acc,item)=>{ acc.push(item); if(item.children)acc=acc.concat(flatten(item.children)); return acc; },[]);
  const flatItems = flatten(items);
  const matchKey = (path, menuItems) => {
    for(const item of menuItems){ if(path===item.key)return item.key; if(item.children){const c=matchKey(path,item.children);if(c)return c;} }
    if(path.startsWith("/home/users")&&path!=="/home/users")return"/home/users/new";
    else if(path.startsWith("/home/iso/mids"))return"/home/iso/mids";
    else if(path.startsWith("/home/iso")&&path!=="/home/iso")return"/home/iso/new";
    else if(path.startsWith("/home/adjustments")&&path!=="/home/adjustments")return"/home/adjustments/new";
    else if(path.startsWith("/home/merchants"))return"/home/merchants";
    return undefined;
  };
  const onClick = ({key}) => { if(key==="logout")handleLogout(navigate); else navigate(key); };
  return (
    <div style={{paddingTop:8}}>
      <div style={{padding:"14px 16px 10px",borderBottom:"1px solid rgba(255,255,255,0.07)",marginBottom:4}}>
        <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:"rgba(255,255,255,0.3)"}}>Menu</span>
      </div>
      <Menu onClick={onClick} theme="dark" style={{background:"transparent",border:"none"}} selectedKeys={[matchKey(currentPath,flatItems)||currentPath]} mode="inline" items={items}/>
    </div>
  );
};
export default SiderComponent;
