import { useNavigate } from "react-router-dom";

export const handleLogout = (navigate: ReturnType<typeof useNavigate>) => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  navigate("/");
};
