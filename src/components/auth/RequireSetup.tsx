
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function RequireSetup({ children }: { children: JSX.Element }) {
  const { loading, setupCompleted } = useAuth();
  const location = useLocation();

  // Mostra loading state apenas por um tempo razoável
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se o setup já foi concluído, redireciona para home
  if (setupCompleted === true) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Se o setup ainda não foi concluído, mostra a página de setup
  return children;
}
