import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";

let loggingOut = false;

export const handleLogout = async (_navigate?: ReturnType<typeof useNavigate>) => {
  if (loggingOut) return;
  loggingOut = true;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  try {
    // Never let a slow or failing signOut block the logout
    await Promise.race([
      supabase.auth.signOut({ scope: "local" }),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch { /* ignore */ }
  // Remove any leftover Supabase session so a refresh can't restore the login
  Object.keys(localStorage).filter((k) => k.startsWith("sb-")).forEach((k) => localStorage.removeItem(k));
  // Full reload clears cached data and in-flight requests
  window.location.replace("/login");
};
