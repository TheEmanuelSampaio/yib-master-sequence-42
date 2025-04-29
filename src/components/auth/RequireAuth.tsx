
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/layout/Spinner";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading, setupCompleted } = useAuth();
  const location = useLocation();

  // Mostrar spinner com mensagem enquanto carrega
  if (loading) {
    return <Spinner message="Verificando autenticação..." />;
  }

  // Check if setup is completed
  if (setupCompleted === false) {
    console.log("Setup not completed, redirecting to /setup");
    return <Navigate to="/setup" state={{ from: location }} replace />;
  }

  // Check if user is logged in
  if (!user) {
    console.log("No user found, redirecting to /login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Usuário está autenticado e setup está completo, renderizar o conteúdo
  return children;
}
