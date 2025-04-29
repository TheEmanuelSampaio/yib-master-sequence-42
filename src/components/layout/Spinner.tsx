
import React from "react";

interface SpinnerProps {
  message?: string;
}

export function Spinner({ message = "Carregando..." }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
