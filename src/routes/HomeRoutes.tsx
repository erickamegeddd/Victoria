import { Routes, Route } from "react-router-dom";
import PageNotFound from "../pages/general/PageNotFound";
import RevenueVolumePage from "../pages/RevenueVolumePage";
import RevenuePerMidPage from "../pages/RevenuePerMidPage";
import AgentsPage from "../pages/AgentsPage";
import IndustryPage from "../pages/IndustryPage";
import InsightsPage from "../pages/general/InsightsPage";
import ImportDataPage from "../pages/ImportDataPage";
import LogsPage from "../pages/LogsPage";
// @ts-ignore
import MidPage from "../pages/AddMidPage";
import MerchantPage from "../pages/MerchantPage";
import ProtectedRoute from "./ProtectedRoute";
import ErrorPage from "../pages/general/ErrorPage";
import AddIsoPage from "../pages/iso/AddIsoPage";
import ViewIsoPage from "../pages/iso/ViewIsoPage";
import AddAdjustments from "../pages/adjustments/AddAdjustments";
import ViewAdjustments from "../pages/adjustments/ViewAdjustments";
import { Suspense } from "react";
import { Spin } from "antd";
import { getUserFromLocalStorage } from "../utils/getUser";
import AgentsDashboard from "../pages/agentsPages/AgentsDashboard";
import MonthlyData from "../pages/agentsPages/MonthlyDataPage";
import Payments from "../pages/PaymentsPage";
import Dashboard from "../pages/general/Dashboard";
import AddAgentsPage from "../pages/users/AddAgentsPage";
import ViewUsersPage from "../pages/users/ViewUsersPage";
import MidPerIso from "../pages/iso/MidPerIsoPage";

const HomeRoutes = () => {
  const user = getUserFromLocalStorage();
  return (
    <>
      <Routes>
        {user?.role === "super_admin" && (<Route index element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><Dashboard /></ProtectedRoute></Suspense>} />)}
        {user?.role === "agent" && (<Route index element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["agent"]}><AgentsDashboard /></ProtectedRoute></Suspense>} />)}
        <Route path="/monthly-data" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["agent"]}><MonthlyData /></ProtectedRoute></Suspense>} />
        <Route path="/total-revenue-volume" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><RevenueVolumePage /></ProtectedRoute></Suspense>} />
        <Route path="/revenue-mid" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><RevenuePerMidPage /></ProtectedRoute></Suspense>} />
        <Route path="/agents" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><AgentsPage /></ProtectedRoute></Suspense>} />
        <Route path="/industry" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><IndustryPage /></ProtectedRoute></Suspense>} />
        <Route path="/insights" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><InsightsPage /></ProtectedRoute></Suspense>} />
        <Route path="/merchants" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><MidPage /></ProtectedRoute></Suspense>} />
        <Route path="/merchants/:mid" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><MerchantPage /></ProtectedRoute></Suspense>} />
        <Route path="/import-data" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><ImportDataPage /></ProtectedRoute></Suspense>} />
        <Route path="/logs" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><LogsPage /></ProtectedRoute></Suspense>} />
        <Route path="/users/:id" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><AddAgentsPage /></ProtectedRoute></Suspense>} />
        <Route path="/users" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><ViewUsersPage /></ProtectedRoute></Suspense>} />
        <Route path="/payments" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><Payments /></ProtectedRoute></Suspense>} />
        <Route path="/iso/:id" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><AddIsoPage /></ProtectedRoute></Suspense>} />
        <Route path="/iso" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><ViewIsoPage /></ProtectedRoute></Suspense>} />
        <Route path="/iso/mids" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><MidPerIso /></ProtectedRoute></Suspense>} />
        <Route path="/adjustments/:id" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><AddAdjustments /></ProtectedRoute></Suspense>} />
        <Route path="/adjustments" element={<Suspense fallback={<Spin className="app-loading-wrapper" />}><ProtectedRoute allowedRoles={["super_admin"]}><ViewAdjustments /></ProtectedRoute></Suspense>} />
        <Route path="/unauthorized" element={<ErrorPage />} />
        <Route path="/*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};

export default HomeRoutes;
