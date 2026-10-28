// @ts-nocheck
import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { supabase } from "./utils/supabase";
import { handleLogout } from "./utils/logout";
import { ErrorBoundary } from "react-error-boundary";
import WarningMessage from "./components/ui/WarningMessage";
import { Spin } from "antd";
import Home from "./pages/general/Home";
import Login from "./pages/general/Login";
import ResetPassword from "./pages/general/ResetPassword";
const ErrorPage = lazy(() => import("./pages/general/ErrorPage"));
const PageNotFound = lazy(() => import("./pages/general/PageNotFound"));

const RequireAuth = ({ children }) => {
  const navigate = useNavigate();
  useEffect(() => {
    // Sign out when the session is revoked (e.g. password changed elsewhere) or the token is cleared in another tab
    const check = async () => {
      if (!localStorage.getItem("token")) return;
      const { error } = await supabase.auth.getUser();
      if (error && (error.status === 401 || error.status === 403 || /session|jwt|not found/i.test(error.message || ""))) handleLogout(navigate);
    };
    const onStorage = (e) => { if (e.key === "token" && !e.newValue) navigate("/login", { replace: true }); };
    const onFocus = () => { check(); };
    const t = setInterval(check, 30000);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    check();
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); window.removeEventListener("storage", onStorage); };
  }, []);
  return localStorage.getItem("token") ? children : <Navigate to="/login" replace />;
};

const App = () => (
  <><ErrorBoundary fallback={<WarningMessage />}><Suspense fallback={<Spin className="app-loading-wrapper" />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home/*" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/error-page" element={<ErrorPage />} />
      <Route path="/unauthorized" element={<ErrorPage />} />
      <Route path="/*" element={<PageNotFound />} />
    </Routes>
  </Suspense></ErrorBoundary></>
);
export default App;
