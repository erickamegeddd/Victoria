// @ts-nocheck
import { LuUsers } from "react-icons/lu";

const ViewUsersPage = () => (
  <>
    <h2>View Users</h2>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
      <LuUsers style={{ fontSize: 48, color: "#f472b6", marginBottom: 16 }} />
      <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 8 }}>User Management</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Coming soon — user access and role management</div>
    </div>
  </>
);

export default ViewUsersPage;
