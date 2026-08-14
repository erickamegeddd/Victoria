// @ts-nocheck
import { useState } from "react";
import { Card, Layout } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import HomeRoutes from "../../routes/HomeRoutes";
import SiderComponent from "../../components/general/SiderComponent";
import HeaderComponent from "../../components/general/HeaderComponent";
import AskVictoria from "../../components/general/AskVictoria";
const { Sider, Content } = Layout;
const Home = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const handleToggle = () => setCollapsed(!collapsed);
  return (
    <><Layout style={layoutStyle} className="main">
      <HeaderComponent collapsed={collapsed} handleToggle={handleToggle} />
      <Layout style={{ backgroundColor: "var(--background-color)" }}>
        <Sider width="230px" style={siderStyle} trigger={null} collapsible className="side-bar" collapsed={collapsed} collapsedWidth={0} onBreakpoint={()=>setCollapsed(!collapsed)}>
          <SiderComponent />
        </Sider>
        <Card style={{ width: "100%", margin: 20 }} bordered={false}>
          <Content style={contentStyle}><HomeRoutes /></Content>
        </Card>
      </Layout>
    </Layout>
    {/* Ask Victoria — fixed floating button, always visible */}
    <div
      onClick={() => setAskOpen(true)}
      style={{position:"fixed",bottom:24,left:collapsed?20:96,zIndex:1100,display:"flex",alignItems:"center",gap:10,cursor:"pointer",transition:"left 0.2s"}}
    >
      <div style={{width:42,height:42,borderRadius:"50%",background:"#f59e0b",boxShadow:"0 4px 14px rgba(245,158,11,0.5)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <MessageOutlined style={{fontSize:18,color:"#fff"}}/>
      </div>
      <span style={{fontSize:13,fontWeight:700,color:"#fff",background:"rgba(15,32,64,0.75)",padding:"3px 10px",borderRadius:20,whiteSpace:"nowrap",backdropFilter:"blur(4px)"}}>Ask Victoria</span>
    </div>
    <AskVictoria open={askOpen} onClose={() => setAskOpen(false)} />
    </>
  );
};
const layoutStyle = { overflow: "hidden", width: "100%", minHeight: "100vh" };
const siderStyle: any = { textAlign: "center", lineHeight: "120px", color: "#fff", backgroundColor: "var(--sidebar-bg, #0f2040)", padding: 2, height: "inherit", boxShadow: "4px 0 24px rgba(15,32,64,0.22)" };
const contentStyle = { padding: "10px 14px", height: "100%" };
export default Home;
