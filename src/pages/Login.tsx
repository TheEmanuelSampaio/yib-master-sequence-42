
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigate } from "react-router-dom";
import { Spinner } from "@/components/layout/Spinner";

export default function Login() {
  const { login, loading, user, setupCompleted } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Se o sistema ainda está carregando a autenticação inicial, mostrar spinner
  if (loading && !isSubmitting) {
    return <Spinner message="Verificando autenticação..." />;
  }

  // Se o usuário já está autenticado, redirecionar para a página inicial
  if (user) {
    return <Navigate to="/" />;
  }

  // Se o setup ainda não foi concluído, redirecionar para a página de setup
  if (setupCompleted === false) {
    return <Navigate to="/setup" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await login(email, password);
    } finally {
      // Se o login não redirecionar (o que deve acontecer em caso de sucesso), 
      // desativamos o estado de submissão
      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Master Sequence</CardTitle>
          <CardDescription>
            Entre com seus dados de acesso
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Entrando...</span>
                </div>
              ) : "Entrar"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
