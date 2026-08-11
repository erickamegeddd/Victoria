// @ts-nocheck
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { ConfigProvider } from "antd";
const qc = new QueryClient({ defaultOptions: { queries: { suspense: true, retry: 3, retryDelay: 2000 } } });
createRoot(document.getElementById("root")!).render(
  <StrictMode><QueryClientProvider client={qc}><BrowserRouter>
    <ConfigProvider theme={{
      token:{ colorPrimary:"#1d4ed8", colorBgBase:"#eef2f7", colorBgContainer:"#ffffff", colorText:"#0f172a", colorTextSecondary:"#64748b", colorBorder:"#e2e8f0", colorError:"#dc2626", colorSuccess:"#059669", borderRadius:10, fontFamily:"'Albert Sans', sans-serif", fontSize:13 },
      components:{ Layout:{ siderBg:"#0f2040", headerBg:"#ffffff", bodyBg:"#eef2f7" }, Menu:{ darkItemBg:"#0f2040", darkItemColor:"rgba(255,255,255,0.72)", darkItemSelectedBg:"#1d4ed8", darkItemSelectedColor:"#ffffff", darkItemHoverBg:"rgba(255,255,255,0.08)", darkItemHoverColor:"#ffffff", darkSubMenuItemBg:"rgba(0,0,0,0.18)" } }
    }}><App/></ConfigProvider>
  </BrowserRouter></QueryClientProvider></StrictMode>
);
