import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/providers/auth";

export default function RequireAuth() {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
