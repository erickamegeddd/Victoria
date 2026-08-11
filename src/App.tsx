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
  const logError = (error: any) => {
    console.log("data error", error.response.status);
    const token = localStorage.getItem("token");
    if (error.response.status === 401 || token == null || token == "null") {
      NotificationModal({
        description:
          "Your session is expired or your account is no longer active. Please login again or contact support",
        type: "error",
      });
      localStorage.clear();
      window.location.reload();
    } else if (error.response.status === 500 || error.response.status === 404) {
      NotificationModal({
        description:
          "An error occurred. Please report it to the system administrator",
        type: "error",
      });
      window.location.reload();
    }
  };
  return (
    <>
      <ErrorBoundary fallback={<WarningMessage />} onError={logError}>
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
