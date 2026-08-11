// @ts-nocheck
import { Routes, Route } from "react-router-dom";
import PageNotFound from "../pages/general/PageNotFound";
import RevenuePage from "../pages/RevenueVolumePage";
import RevenuePerMidPage from "../pages/RevenuePerMidPage";
import AgentsPage from "../pages/AgentsPage";
import IndustryPage from "../pages/IndustryPage";
import InsightsPage from "../pages/general/InsightsPage";
import ImportDataPage from "../pages/ImportDataPage";
import LogsPage from "../pages/LogsPage";
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
import PaymentsPage from "../pages/PaymentsPage";
import Dashboard from "../pages/general/Dashboard";
import AddAgentsPage from "../pages/users/AddAgentsPage";
import ViewUsersPage from "../pages/users/ViewUsersPage";
import MidPerIso from "../pages/iso/MidPerIsoPage";

const SP = ({ children }) => <Suspense fallback={<Spin className="app-loading-wrapper"/>}>{children}</Suspense>;

const HomeRoutes = () => {
  const user = getUserFromLocalStorage();
  return (
    <Routes>
      <Route index element={<SP><Dashboard/></SP>}/>
      <Route path="/dashboard" element={<SP><Dashboard/></SP>}/>
      <Route path="/monthly-data" element={<SP><MonthlyData/></SP>}/>
      <Route path="/total-revenue-volume" element={<SP><RevenuePage/></SP>}/>
      <Route path="/revenue-mid" element={<SP><RevenuePerMidPage/></SP>}/>
      <Route path="/agents" element={<SP><AgentsPage/></SP>}/>
      <Route path="/industry" element={<SP><IndustryPage/></SP>}/>
      <Route path="/insights" element={<SP><InsightsPage/></SP>}/>
      <Route path="/merchants" element={<SP><MidPage/></SP>}/>
      <Route path="/merchants/:mid" element={<SP><MerchantPage/></SP>}/>
      <Route path="/import-data" element={<SP><ImportDataPage/></SP>}/>
      <Route path="/logs" element={<SP><LogsPage/></SP>}/>
      <Route path="/users/:id" element={<SP><AddAgentsPage/></SP>}/>
      <Route path="/users" element={<SP><ViewUsersPage/></SP>}/>
      <Route path="/payments" element={<SP><PaymentsPage/></SP>}/>
      <Route path="/iso/:id" element={<SP><AddIsoPage/></SP>}/>
      <Route path="/iso" element={<SP><ViewIsoPage/></SP>}/>
      <Route path="/iso/mids" element={<SP><MidPerIso/></SP>}/>
      <Route path="/adjustments/:id" element={<SP><AddAdjustments/></SP>}/>
      <Route path="/adjustments" element={<SP><ViewAdjustments/></SP>}/>
      <Route path="/unauthorized" element={<ErrorPage/>}/>
      <Route path="/*" element={<PageNotFound/>}/>
    </Routes>
  );
};
export default HomeRoutes;
