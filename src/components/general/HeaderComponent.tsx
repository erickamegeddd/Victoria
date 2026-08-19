// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Avatar, Badge, Dropdown, Menu, Tooltip } from "antd";
import { UserOutlined, LogoutOutlined, BellOutlined, BarChartOutlined, SnippetsOutlined, ImportOutlined, DiffOutlined, SettingOutlined } from "@ant-design/icons";
import { DollarOutlined, AreaChartOutlined, BulbOutlined, BankOutlined } from "@ant-design/icons";
import { LuUsers } from "react-icons/lu";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { MdPayment } from "react-icons/md";
import { TbLayoutDashboard } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import { getUserFromLocalStorage } from "../../utils/getUser";
import { handleLogout } from "../../utils/logout";
import ResetPasswordModal from "../modals/ResetPasswordModal";
import ResetPassWordIcon from "../ui/ResetPasswordIcon";
import dayjs from "dayjs";

const parseExpDate = (notes) => { if (!notes) return null; const m = notes.match(/^EXP:(\d{4}-\d{2}-\d{2})\|/); return m ? m[1] : null; };
const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "--";

const navItems = [
  { key: "/home",             label: "Overview",        icon: <TbLayoutDashboard /> },
  { key: "/home/iso-merchants",label: "ISOs",           icon: <BankOutlined /> },
  { key: "/home/merchants",   label: "Merchants",        icon: <DiffOutlined /> },
  { key: "/home/revenue-mid", label: "Revenue/MID",     icon: <DollarOutlined /> },
  { key: "/home/payments",    label: "Payments",         icon: <MdPayment /> },
  { key: "/home/insights",    label: "Insights",         icon: <BulbOutlined /> },
  { key: "/home/industry",    label: "Industry",         icon: <AreaChartOutlined /> },
  {
    key: "admin", label: "Administrator", icon: <SettingOutlined />,
    children: [
      { key: "/home/users",       label: "Users",        icon: <LuUsers /> },
      { key: "/home/adjustments", label: "Adjustments",  icon: <LiaFileInvoiceDollarSolid /> },
      { key: "/home/agents",      label: "Agents Data",  icon: <BarChartOutlined /> },
      { key: "/home/logs",        label: "Logs",         icon: <SnippetsOutlined /> },
      { key: "/home/import-data", label: "Import Data",  icon: <ImportOutlined /> },
    ]
  },
];

const HeaderComponent = () => {
  const user = getUserFromLocalStorage();
  const navigate = useNavigate();
  const currentPath = window.location.pathname;
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

  const getSelectedKey = () => {
    const adminPaths = ["/home/users","/home/adjustments","/home/agents","/home/logs","/home/import-data"];
    if (adminPaths.some(p => currentPath.startsWith(p))) return currentPath;
    if (currentPath.startsWith("/home/merchants")) return "/home/merchants";
    return currentPath;
  };

  return (
    <>
      <header style={{ backgroundColor: "#0f2040", borderBottom: "2px solid rgba(255,255,255,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 64, position: "sticky", top: 0, zIndex: 100 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <img src="/paydiverse-logo.webp" alt="PayDiverse" style={{ height: 44, objectFit: "contain", maxWidth: 180 }} />
        </div>

        {/* Horizontal Nav */}
        <Menu
          mode="horizontal"
          selectedKeys={[getSelectedKey()]}
          onClick={({ key }) => { if (key !== "admin") navigate(key); }}
          items={navItems}
          style={{ flex: 1, background: "transparent", border: "none", minWidth: 0, margin: "0 24px" }}
          theme="dark"
        />

        {/* Right: bell + user */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
          <Dropdown open={bellOpen} onOpenChange={setBellOpen} dropdownRender={() => bellContent} trigger={["click"]} placement="bottomRight">
            <div style={{ cursor: "pointer", padding: "4px 6px", borderRadius: 8 }}>
              <Badge count={overduePayments.length} size="small" color="#dc2626">
                <BellOutlined style={{ fontSize: 22, color: overduePayments.length > 0 ? "#fca5a5" : "rgba(255,255,255,0.8)" }} />
              </Badge>
            </div>
          </Dropdown>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>{user?.name || "PayDiverse"}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{user?.role == "super_admin" ? "Admin" : "Dashboard"}</span>
          </div>
          <Dropdown placement="bottomLeft" trigger={["hover", "click"]} menu={{ items: userMenuItems }}>
            <Avatar size="large" style={{ backgroundColor: "var(--primary-color)", cursor: "pointer" }} icon={<UserOutlined />} />
          </Dropdown>
        </div>
      </header>
      {isModalVisible && <ResetPasswordModal isResetPassword={true} onOk={() => setModalVisible(false)} onCancel={() => setModalVisible(false)} />}
    </>
  );
};
export default HeaderComponent;
