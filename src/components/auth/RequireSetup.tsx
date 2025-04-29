
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/layout/Spinner";

export function RequireSetup({ children }: { children: JSX.Element }) {
  const { loading, setupCompleted } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner />;
  }

  // If setup is already completed, redirect to home
  if (setupCompleted === true) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If setup is not completed, show setup page
  return children;
}
