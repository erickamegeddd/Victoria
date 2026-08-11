import { useState } from "react";
import { Card, Layout } from "antd";
// import FooterComponent from "../components/FooterComponent";
import ErrorPage from "./ErrorPage";
import HomeRoutes from "../../routes/HomeRoutes";
import SiderComponent from "../../components/general/SiderComponent";
import HeaderComponent from "../../components/general/HeaderComponent";

const { Sider, Content } = Layout;

const Home = () => {
  const [collapsed, setCollapsed] = useState(false);

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };
  const isAuthenticated = () => {
    return !!localStorage.getItem("token");
  };
  return isAuthenticated() ? (
    <>
      <Layout style={layoutStyle} className="main">
        <HeaderComponent collapsed={collapsed} handleToggle={handleToggle} />
        <Layout style={{ backgroundColor: "var(--background-color)" }}>
          <Sider width="230px" style={siderStyle} trigger={null} collapsible className="side-bar" collapsed={collapsed} collapsedWidth={0} onBreakpoint={() => setCollapsed(!collapsed)}>
            <SiderComponent />
          </Sider>
          <Card style={{ width: "100%", margin: 20 }} bordered={false}>
            <Content style={contentStyle}>
              <HomeRoutes />
            </Content>
          </Card>
        </Layout>
      </Layout>
    </>
  ) : (
    <ErrorPage />
  );
};
const layoutStyle = { overflow: "hidden", width: "100%", minHeight: "100vh" };
const siderStyle: any = { textAlign: "center", lineHeight: "120px", color: "#fff", backgroundColor: "var(--sidebar-bg, #0f2040)", padding: 2, height: "inherit", boxShadow: "0 1px 2px #00000008, 0 1px 6px -1px #00000005, 0 2px 4px #00000005" };
const contentStyle = { padding: "10px 14px", height: "100%" };
export default Home;
