
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function RequireSetup({ children }: { children: JSX.Element }) {
  const { loading, setupCompleted } = useAuth();
  const location = useLocation();

  if (loading) {
    // Show loading state
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If setup is already completed, redirect to home
  if (setupCompleted === true) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If setup is not completed, show setup page
  return children;
}
