// @ts-nocheck
import { Route, Routes, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import WarningMessage from "./components/ui/WarningMessage";
import { Spin } from "antd";
import Home from "./pages/general/Home";
const ErrorPage = lazy(() => import("./pages/general/ErrorPage"));
const PageNotFound = lazy(() => import("./pages/general/PageNotFound"));
const App = () => (
  <><ErrorBoundary fallback={<WarningMessage />}><Suspense fallback={<Spin className="app-loading-wrapper" />}>
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home/*" element={<Home />} />
      <Route path="/error-page" element={<ErrorPage />} />
      <Route path="/unauthorized" element={<ErrorPage />} />
      <Route path="/*" element={<PageNotFound />} />
    </Routes>
  </Suspense></ErrorBoundary></>
);
export default App;
