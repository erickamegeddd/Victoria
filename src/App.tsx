// @ts-nocheck
import { Route, Routes, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import WarningMessage from "./components/ui/WarningMessage";
import { Spin } from "antd";
import Home from "./pages/general/Home";
import Login from "./pages/general/Login";
const ErrorPage = lazy(() => import("./pages/general/ErrorPage"));
const PageNotFound = lazy(() => import("./pages/general/PageNotFound"));

const RequireAuth = ({ children }) => {
  return localStorage.getItem("token") ? children : <Navigate to="/login" replace />;
};

const App = () => (
  <><ErrorBoundary fallback={<WarningMessage />}><Suspense fallback={<Spin className="app-loading-wrapper" />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home/*" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/error-page" element={<ErrorPage />} />
      <Route path="/unauthorized" element={<ErrorPage />} />
      <Route path="/*" element={<PageNotFound />} />
    </Routes>
  </Suspense></ErrorBoundary></>
);
export default App;
