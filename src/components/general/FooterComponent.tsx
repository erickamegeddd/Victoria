import { Typography, Layout } from "antd";
const { Footer } = Layout;

const FooterComponent = () => {
  return (
    <Footer style={footerStyle}>
      <Typography.Text style={{ color: "white" }}>
        © 2024 Copyright <b> PayDiverse</b>. All Rights Reserved
      </Typography.Text>
    </Footer>
  );
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  position: "sticky",
  bottom: "0px",
  height: 55,
  width: "100vw",
  color: "#fff",
  backgroundColor: "var(--navy-color)",
};

export default FooterComponent;
