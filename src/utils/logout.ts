import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";

export const handleLogout = async (navigate: ReturnType<typeof useNavigate>) => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  await supabase.auth.signOut();
  navigate("/");
};
