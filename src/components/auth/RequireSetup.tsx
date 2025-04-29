
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/layout/Spinner";

export function RequireSetup({ children }: { children: JSX.Element }) {
  const { loading, setupCompleted } = useAuth();
  const location = useLocation();

  // Mostrar spinner com mensagem enquanto carrega
  if (loading) {
    return <Spinner message="Verificando status de configuração..." />;
  }

  // Se setupCompleted for null, ainda estamos carregando ou houve um erro
  if (setupCompleted === null) {
    return <Spinner message="Carregando configurações iniciais..." />;
  }

  // If setup is already completed, redirect to home
  if (setupCompleted === true) {
    console.log("Setup already completed, redirecting to /");
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If setup is not completed, show setup page
  return children;
}
