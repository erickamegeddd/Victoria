import { Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import WarningMessage from "./components/ui/WarningMessage";
import { NotificationModal } from "./components/ui/NotificationModal";
import { Spin } from "antd";
import Home from "./pages/general/Home";

const Login = lazy(() => import("./pages/general/Login"));
const ErrorPage = lazy(() => import("./pages/general/ErrorPage"));
const PageNotFound = lazy(() => import("./pages/general/PageNotFound"));

const App = () => {
  return (
    <>
      <ErrorBoundary fallback={<WarningMessage />}>
        <Suspense fallback={<Spin className="app-loading-wrapper" />}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/home/*" element={<Home />} />
            <Route path="/error-page" element={<ErrorPage />} />
            <Route path="/unauthorized" element={<ErrorPage />} />
            <Route path="/*" element={<PageNotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
};

export default App;
