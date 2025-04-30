
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function ApiDocsLink() {
  const navigate = useNavigate();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentação da API</CardTitle>
        <CardDescription>
          Consulte a documentação para integrar seu sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Acesse a documentação completa da API para entender como integrar
          o Master Sequence com seu sistema existente.
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => navigate('/api-docs')}
        >
          Ver Documentação
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
