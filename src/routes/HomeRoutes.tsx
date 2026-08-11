import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Spin } from "antd";
import { getUserFromLocalStorage } from "../utils/getUser";
import Dashboard from "../pages/general/Dashboard";
import InsightsPage from "../pages/general/InsightsPage";
import ImportDataPage from "../pages/ImportDataPage";
import ErrorPage from "../pages/general/ErrorPage";
import PageNotFound from "../pages/general/PageNotFound";

const ProtectedRoute = ({ children }) => children;

const HomeRoutes = () => {
  const user = getUserFromLocalStorage();
  return (
    <>
      <Routes>
        <Route index element={<Suspense fallback={<Spin/>}><Dashboard/></Suspense>}/>
        <Route path="/insights" element={<Suspense fallback={<Spin/>}><InsightsPage/></Suspense>}/>
        <Route path="/import-data" element={<Suspense fallback={<Spin/>}><ImportDataPage/></Suspense>}/>
        <Route path="/unauthorized" element={<ErrorPage/>}/>
        <Route path="/*" element={<PageNotFound/>}/>
      </Routes>
    </>
  );
};

export default HomeRoutes;
