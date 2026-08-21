// @ts-nocheck
import { useState } from "react";
import { Card, Layout } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import HomeRoutes from "../../routes/HomeRoutes";
import HeaderComponent from "../../components/general/HeaderComponent";
import AskVictoria from "../../components/general/AskVictoria";
const { Content } = Layout;
const Home = () => {
  const [askOpen, setAskOpen] = useState(false);
  return (
    <><Layout style={{ overflowX: "hidden", width: "100%", minHeight: "100vh" }} className="main">
      <HeaderComponent />
      <Card style={{ width: "100%", margin: 20 }} bordered={false}>
        <Content style={{ padding: "10px 14px", height: "100%" }}><HomeRoutes /></Content>
      </Card>
    </Layout>
    {!askOpen && (
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1100 }}>
        <div onClick={() => setAskOpen(true)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "#f59e0b", borderRadius: 50, padding: "10px 18px", boxShadow: "0 4px 14px rgba(245,158,11,0.45)" }}>
          <MessageOutlined style={{ fontSize: 18, color: "#fff" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Ask Victoria</span>
        </div>
      </div>
    )}
    <AskVictoria open={askOpen} onClose={() => setAskOpen(false)} />
    </>
  );
};
export default Home;
