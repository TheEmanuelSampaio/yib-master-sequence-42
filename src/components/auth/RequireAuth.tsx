
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading, setupCompleted } = useAuth();
  const location = useLocation();

  // Mostra loading state apenas por um tempo razoável
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Verifica se o setup foi concluído
  if (setupCompleted === false) {
    return <Navigate to="/setup" state={{ from: location }} replace />;
  }

  // Verifica se o usuário está logado
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se o usuário está autenticado e o setup foi concluído, mostra o conteúdo
  return children;
}
