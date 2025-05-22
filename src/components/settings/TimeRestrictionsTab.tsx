import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const TimeRestrictionsTab = () => {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Restrições de Horário</CardTitle>
        <CardDescription>
          Configure as restrições de horário para o sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Em breve</h3>
          <p className="text-sm text-muted-foreground">
            Esta funcionalidade estará disponível em breve.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeRestrictionsTab;
