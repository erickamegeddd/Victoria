// @ts-nocheck
import { SnippetsOutlined } from "@ant-design/icons";

const LogsPage = () => (
  <>
    <h2 style={{ marginBottom: 10 }}>Revenue Logs</h2>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
      <SnippetsOutlined style={{ fontSize: 48, color: "#94a3b8", marginBottom: 16 }} />
      <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Revenue Logs</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Coming soon — activity log tracking</div>
    </div>
  </>
);

export default LogsPage;
