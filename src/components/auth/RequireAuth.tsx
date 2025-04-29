
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading, setupCompleted } = useAuth();
  const location = useLocation();

  if (loading) {
    // Show loading state
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
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
