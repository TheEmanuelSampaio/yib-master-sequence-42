
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/layout/Spinner";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading, setupCompleted } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner />;
  }

  // Check if setup is completed
  if (setupCompleted === false) {
    return <Navigate to="/setup" state={{ from: location }} replace />;
  }

  // Check if user is logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
