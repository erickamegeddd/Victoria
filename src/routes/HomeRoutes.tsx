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
import ProtectedRoute from "./ProtectedRoute"; // Import the ProtectedRoute component
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
        {user?.role === "super_admin" && (
          <Route
            index
            element={
              <Suspense fallback={<Spin className="app-loading-wrapper" />}>
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <Dashboard />
                </ProtectedRoute>
              </Suspense>
            }
          />
        )}
        {user?.role === "agent" && (
          <Route
            index
            element={
              <Suspense fallback={<Spin className="app-loading-wrapper" />}>
                <ProtectedRoute allowedRoles={["agent"]}>
                  <AgentsDashboard />
                </ProtectedRoute>
              </Suspense>
            }
          />
        )}
        <Route path="/*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};

export default HomeRoutes;
