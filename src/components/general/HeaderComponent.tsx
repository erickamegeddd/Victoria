// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Avatar, Badge, Dropdown, Tooltip } from "antd";
import { MenuUnfoldOutlined, MenuFoldOutlined, UserOutlined, LogoutOutlined, BellOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import { getUserFromLocalStorage } from "../../utils/getUser";
import { handleLogout } from "../../utils/logout";
import ResetPasswordModal from "../modals/ResetPasswordModal";
import ResetPassWordIcon from "../ui/ResetPasswordIcon";
import dayjs from "dayjs";

const parseExpDate = (notes) => { if (!notes) return null; const m = notes.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/); return m ? m[1] : null; };
const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "--";

const HeaderComponent = ({ collapsed, handleToggle }) => {
  const user = getUserFromLocalStorage();
  const navigate = useNavigate();
  const [isModalVisible, setModalVisible] = useState(false);
  const [overduePayments, setOverduePayments] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => { fetchOverdue(); }, []);

  const fetchOverdue = async () => {
    const { data } = await supabase.from("iso_payments").select("*, isos(name)").is("received_amount", null);
    if (!data) return;
    const today = dayjs().format("YYYY-MM-DD");
    setOverduePayments(
      data.filter(p => { const exp = parseExpDate(p.notes); return exp && exp < today; })
          .map(p => ({ id: p.id, isoName: p.isos?.name || "Unknown ISO", month: p.report_month, expDate: parseExpDate(p.notes), expected: p.expected_amount }))
    );
  };

  const userMenuItems = [
    { key: "1", label: (<span style={{ display: "flex", alignItems: "center" }} onClick={() => setModalVisible(true)}><ResetPassWordIcon />Reset Password</span>) },
    { key: "2", label: (<span onClick={(e) => { e.stopPropagation(); handleLogout(navigate); }} style={{ color: "var(--red-color)", width: "100%" }}><LogoutOutlined style={{ marginRight: "10px" }} />Logout</span>) },
  ];

  const bellContent = (
    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", minWidth: 300, maxWidth: 380, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Payment Notifications</span>
        {overduePayments.length > 0 && <span style={{ background: "#dc2626", color: "#fff", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{overduePayments.length}</span>}
      </div>
      {overduePayments.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "#6b7280", fontSize: 13 }}>No overdue payments</div>
      ) : (
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          {overduePayments.map(p => (
            <div key={p.id} style={{ padding: "10px 16px", borderBottom: "1px solid #f9fafb", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              onClick={() => { navigate("/home/payments"); setBellOpen(false); }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#111" }}>{p.isoName}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                  {p.month ? dayjs(p.month).format("MMMM YYYY") : "--"} - Due {dayjs(p.expDate).format("MMM D, YYYY")}
                </div>
              </div>
              <div style={{ color: "#dc2626", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", marginLeft: 12 }}>{fmtMoney(p.expected)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <header style={{ color: "#333", height: 90, backgroundColor: "var(--panel-color)", borderBottom: "2px solid var(--line-color)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", boxShadow: "0 2px 12px rgba(29,78,216,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Tooltip title="Click to toggle the Sidebar" color="black">
            {collapsed ? <MenuUnfoldOutlined style={{ fontSize: 22, color: "var(--muted-color)" }} onClick={handleToggle} /> : <MenuFoldOutlined style={{ fontSize: 22, color: "var(--muted-color)" }} onClick={handleToggle} />}
          </Tooltip>
          <img src="/paydiverse-logo.svg" alt="PayDiverse" style={{ height: 90, marginLeft: 10, objectFit: "contain", maxWidth: 340 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "20px" }}>
          <Dropdown open={bellOpen} onOpenChange={setBellOpen} dropdownRender={() => bellContent} trigger={["click"]} placement="bottomRight">
            <div style={{ cursor: "pointer", padding: "4px 6px", borderRadius: 8 }}>
              <Badge count={overduePayments.length} size="small" color="#dc2626">
                <BellOutlined style={{ fontSize: 22, color: overduePayments.length > 0 ? "#dc2626" : "var(--muted-color)" }} />
              </Badge>
            </div>
          </Dropdown>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
            <span style={{ fontSize: "16px", fontWeight: "600" }}>{user?.name || "PayDiverse"}</span>
            <span>{user?.role == "super_admin" ? "Admin" : "Dashboard"}</span>
          </div>
          <Dropdown placement="bottomLeft" trigger={["hover", "click"]} menu={{ items: userMenuItems }}>
            <Avatar size="large" style={{ backgroundColor: "var(--primary-color)" }} icon={<UserOutlined />} />
          </Dropdown>
        </div>
      </header>
      {isModalVisible && <ResetPasswordModal isResetPassword={true} onOk={() => setModalVisible(false)} onCancel={() => setModalVisible(false)} />}
    </>
  );
};
export default HeaderComponent;
