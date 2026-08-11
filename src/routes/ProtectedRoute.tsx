import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getUserFromLocalStorage } from "../utils/getUser";

type Role = "super_admin" | "agent"; // Define allowed roles explicitly

interface ProtectedRouteProps {
  allowedRoles: Role[]; // Use the Role type for strict typing
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const user = getUserFromLocalStorage();
  const userRole = user?.role as Role | null;

  // Check if the user's role is in the list of allowed roles
  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
