// @ts-nocheck
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";

const ViewAdjustments = () => (
  <>
    <h2>View Adjustments</h2>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
      <LiaFileInvoiceDollarSolid style={{ fontSize: 48, color: "#f87171", marginBottom: 16 }} />
      <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Revenue Adjustments</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Coming soon — adjustment tracking and management</div>
    </div>
  </>
);

export default ViewAdjustments;
