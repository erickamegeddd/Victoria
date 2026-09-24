// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Avatar, Badge, Dropdown, Menu } from "antd";
import { UserOutlined, LogoutOutlined, BellOutlined, BarChartOutlined, SnippetsOutlined, DiffOutlined, SettingOutlined, DollarOutlined, AreaChartOutlined, BulbOutlined, BankOutlined, MailOutlined, CloseOutlined } from "@ant-design/icons";
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

const ic = (icon, color) => (<span style={{color, fontSize:15, display:"inline-flex", alignItems:"center"}}>{icon}</span>);

const navItems = [
  { key: "/home",              label: "Overview",   icon: ic(<TbLayoutDashboard />, "#60a5fa") },
  // HIDDEN: { key: "/home/iso-merchants",label: "ISOs",         icon: ic(<BankOutlined />, "#818cf8") },
  // HIDDEN: { key: "/home/merchants",    label: "Merchants",      icon: ic(<DiffOutlined />, "#fb923c") },
  { key: "/home/revenue-mid",  label: "Revenue/MID",   icon: ic(<DollarOutlined />, "#fbbf24") },
  { key: "/home/payments",     label: "Payments",       icon: ic(<MdPayment />, "#4ade80") },
  { key: "/home/insights",     label: "Insights",       icon: ic(<BulbOutlined />, "#fcd34d") },
  { key: "/home/outreach",     label: "Outreach",       icon: ic(<MailOutlined />, "#f472b6") },
  { key: "/home/industry",     label: "Industry",       icon: ic(<AreaChartOutlined />, "#38bdf8") },
  {
    key: "admin", label: "Administrator", icon: ic(<SettingOutlined />, "#a78bfa"),
    children: [
      { key: "/home/users",        label: "Users",        icon: ic(<LuUsers />, "#f472b6") },
      { key: "/home/adjustments",  label: "Adjustments",  icon: ic(<LiaFileInvoiceDollarSolid />, "#f87171") },
      { key: "/home/agents",       label: "Agents Data",  icon: ic(<BarChartOutlined />, "#22d3ee") },
      { key: "/home/logs",         label: "Logs",         icon: ic(<SnippetsOutlined />, "#94a3b8") },
      { key: "/home/bank-mappings", label: "Bank Mappings", icon: ic(<BankOutlined />, "#6ee7b7") },
    ]
  },
];

const agentNavItems = [
  { key: "/home/agents", label: "Agents Data", icon: ic(<BarChartOutlined />, "#22d3ee") },
];

const HeaderComponent = () => {
  const user = getUserFromLocalStorage();
  const navigate = useNavigate();
  const visibleNavItems = user?.role === "agent" ? agentNavItems : navItems;
  const currentPath = window.location.pathname;
  const [isModalVisible, setModalVisible] = useState(false);
  const [overduePayments, setOverduePayments] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("dismissed_notifs") || "[]")); }
    catch { return new Set(); }
  });

  useEffect(() => { fetchOverdue(); }, []);

  const fetchOverdue = async () => {
    const { data } = await supabase.from("iso_payments").select("*, isos(name)").is("received_amount", null);
    if (!data) return;
    const today = dayjs().format("YYYY-MM-DD");
    const overdue = data
      .filter(p => { const exp = parseExpDate(p.notes); return exp && exp < today; })
      .map(p => ({ id: p.id, isoName: p.isos?.name || "Unknown ISO", iso_id: p.iso_id, month: p.report_month, expDate: parseExpDate(p.notes), computedAmount: 0 }))
      .sort((a, b) => b.month.localeCompare(a.month) || b.expDate.localeCompare(a.expDate));

    if (overdue.length > 0) {
      const isoIds = [...new Set(overdue.map(p => p.iso_id))];
      const { data: residuals } = await supabase
        .from("residuals")
        .select("iso_id, report_month, paydiversenet")
        .in("iso_id", isoIds);
      const resMap = {};
      if (residuals) {
        residuals.forEach(r => {
          const k = `${r.iso_id}|${r.report_month}`;
          resMap[k] = (resMap[k] || 0) + (r.paydiversenet || 0);
        });
      }
      setOverduePayments(
        overdue.map(p => ({ ...p, computedAmount: Math.round((resMap[`${p.iso_id}|${p.month}`] || 0) * 100) / 100 }))
      );
    } else {
      setOverduePayments([]);
    }
  };

  const dismiss = (id, e) => {
    e.stopPropagation();
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("dismissed_notifs", JSON.stringify([...next]));
  };

  const dismissAll = (e) => {
    e.stopPropagation();
    const next = new Set(overduePayments.map(p => p.id));
    setDismissed(next);
    localStorage.setItem("dismissed_notifs", JSON.stringify([...next]));
  };

  const userMenuItems = [
    { key: "1", label: (<span style={{ display: "flex", alignItems: "center" }} onClick={() => setModalVisible(true)}><ResetPassWordIcon />Reset Password</span>) },
    { key: "2", label: (<span onClick={() => handleLogout(navigate)} style={{ color: "#f87171", width: "100%" }}><LogoutOutlined style={{ marginRight: "10px" }} />Logout</span>) },
  ];

  const visible = overduePayments.filter(p => !dismissed.has(p.id));

  const bellContent = (
    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", minWidth: 340, maxWidth: 420, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Payment Notifications</span>
          {visible.length > 0 && <span style={{ background: "#dc2626", color: "#fff", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{visible.length}</span>}
        </div>
        {visible.length > 0 && (
          <span onClick={dismissAll} style={{ fontSize: 11, color: "#9ca3af", cursor: "pointer", userSelect: "none" }}
            onMouseEnter={e => e.currentTarget.style.color = "#dc2626"}
            onMouseLeave={e => e.currentTarget.style.color = "#9ca3af"}>
            Clear all
          </span>
        )}
      </div>
      {visible.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "#6b7280", fontSize: 13 }}>No overdue payments</div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {visible.map(p => (
            <div key={p.id} style={{ padding: "10px 16px", borderBottom: "1px solid #f9fafb", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              onClick={() => { navigate("/home/payments"); setBellOpen(false); }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#111" }}>{p.isoName}</div>
                <div style={{ fontSize: 11, color: "#6f7280", marginTop: 2 }}>
                  {p.month ? dayjs(p.month).format("MMMM YYYY") : "--"} &middot; Due {dayjs(p.expDate).format("MMM D, YYYY")}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 12, flexShrink: 0 }}>
                <span style={{ color: "#dc2626", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {p.computedAmount > 0 ? `$${p.computedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "--"}
                </span>
                <span onClick={(e) => dismiss(p.id, e)}
                  style={{ color: "#d1d5db", fontSize: 13, cursor: "pointer", lineHeight: 1, padding: "2px 3px", borderRadius: 4, display: "inline-flex", alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#dc2626"}
                  onMouseLeave={e => e.currentTarget.style.color = "#d1d5db"}>
                  <CloseOutlined />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const getSelectedKey = () => {
    const adminPaths = ["/home/users","/home/adjustments","/home/agents","/home/logs","/home/bank-mappings"];
    if (adminPaths.some(p => currentPath.startsWith(p))) return currentPath;
    if (currentPath.startsWith("/home/merchants")) return "/home/merchants";
    return currentPath;
  };

  return (
    <>
      {/* Fix Administrator dropdown popup visibility */}
      <style>{`
        .ant-menu-submenu-popup > ul {
          background-color: #1a3a6e !important;
          border: 1px solid rgba(255,255,255,0.15) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important;
          border-radius: 8px !important;
          padding: 4px 0 !important;
        }
        .ant-menu-submenu-popup .ant-menu-item {
          color: rgba(255,255,255,0.9) !important;
        }
        .ant-menu-submenu-popup .ant-menu-item:hover {
          background-color: rgba(255,255,255,0.12) !important;
          color: #fff !important;
        }
        .ant-menu-submenu-popup .ant-menu-item-selected {
          background-color: rgba(255,255,255,0.18) !important;
          color: #fff !important;
        }
        header .ant-menu-item,
        header .ant-menu-submenu-title {
          font-size: 16px !important;
          font-weight: 700 !important;
        }
      `}</style>

      <header style={{ backgroundColor: "#0f2040", borderBottom: "2px solid rgba(255,255,255,0.08)", boxShadow: "0 2px 16px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 80, position: "sticky", top: 0, zIndex: 100 }}>

        {/* Logo — white pill so white background looks intentional */}
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: "6px 14px", display: "inline-flex", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
            <img src="/paydiverse-logo.webp" alt="PayDiverse" style={{ height: 42, objectFit: "contain", maxWidth: 170 }} />
          </div>
        </div>

        {/* Horizontal Nav */}
        <Menu
          mode="horizontal"
          selectedKeys={[getSelectedKey()]}
          onClick={({ key }) => { if (key !== "admin") navigate(key); }}
          items={visibleNavItems}
          theme="dark"
          style={{ flex: 1, background: "transparent", border: "none", minWidth: 0, margin: "0 28px", fontSize: 16, fontWeight: 700 }}
        />

        {/* Right: bell + user */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
          <Dropdown open={bellOpen} onOpenChange={setBellOpen} dropdownRender={() => bellContent} trigger={["click"]} placement="bottomRight">
            <div style={{ cursor: "pointer", padding: "4px 6px", borderRadius: 8 }}>
              <Badge count={visible.length} size="small" color="#dc2626">
                <BellOutlined style={{ fontSize: 22, color: visible.length > 0 ? "#fca5a5" : "rgba(255,255,255,0.8)" }} />
              </Badge>
            </div>
          </Dropdown>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>{user?.name || "PayDiverse"}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{user?.role === "admin" ? "Admin" : user?.role === "agent" ? "Agent" : "Dashboard"}</span>
          </div>
          <Dropdown placement="bottomLeft" trigger={["hover", "click"]} menu={{ items: userMenuItems }}>
            <Avatar size="large" style={{ backgroundColor: "rgba(255,255,255,0.2)", cursor: "pointer", border: "2px solid rgba(255,255,255,0.2)" }} icon={<UserOutlined />} />
          </Dropdown>
        </div>
      </header>
      {isModalVisible && <ResetPasswordModal isResetPassword={true} onOk={() => setModalVisible(false)} onCancel={() => setModalVisible(false)} />}
    </>
  );
};
export default HeaderComponent;
