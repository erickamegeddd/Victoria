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
      const { data, error } = await supabase.auth.getUser();
      if (!error) { const { data: s } = await supabase.auth.getSession(); if (s?.session?.access_token) localStorage.setItem("token", s.session.access_token); return; }
      if (error.status === 401 || error.status === 403 || /session|jwt|not found/i.test(error.message || "")) {
        // The 1h access token may simply have expired (e.g. tab asleep) - try to renew it before signing out
        const { data: r, error: rErr } = await supabase.auth.refreshSession();
        if (r?.session?.access_token) { localStorage.setItem("token", r.session.access_token); return; }
        if (rErr && (rErr.status === 400 || rErr.status === 401 || rErr.status === 403 || /refresh|session|jwt/i.test(rErr.message || ""))) handleLogout(navigate);
      }
    };
    // Keep the stored API token in step with Supabase's silent refreshes so the session never lapses while the 12h idle rule is the only limit
    const { data: authSub } = supabase.auth.onAuthStateChange((evt, sess) => { if (sess?.access_token && localStorage.getItem("token") && (evt === "TOKEN_REFRESHED" || evt === "SIGNED_IN")) localStorage.setItem("token", sess.access_token); });
    // Auto sign-out after 12 hours without activity (shared across tabs via localStorage)
    const IDLE_MS = 12 * 60 * 60 * 1000;
    let lastWrite = 0;
    const idleCheck = () => {
      const last = parseInt(localStorage.getItem("lastActivity") || "0", 10);
      if (localStorage.getItem("token") && last && Date.now() - last > IDLE_MS) { localStorage.removeItem("lastActivity"); handleLogout(navigate); }
    };
    const touch = () => { const n = Date.now(); if (n - lastWrite > 30000) { lastWrite = n; localStorage.setItem("lastActivity", String(n)); } };
    idleCheck();
    touch();
    const acts = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    acts.forEach(a => window.addEventListener(a, touch, { passive: true }));
    const idleTimer = setInterval(idleCheck, 60000);
    const onStorage = (e) => { if (e.key === "token" && !e.newValue) navigate("/login", { replace: true }); };
    const onFocus = () => { idleCheck(); check(); };
    const t = setInterval(check, 30000);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    check();
    return () => { authSub?.subscription?.unsubscribe(); clearInterval(t); clearInterval(idleTimer); acts.forEach(a => window.removeEventListener(a, touch)); window.removeEventListener("focus", onFocus); window.removeEventListener("storage", onStorage); };
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
