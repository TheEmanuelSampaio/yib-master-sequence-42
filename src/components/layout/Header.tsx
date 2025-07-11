
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface HeaderProps {
  sidebarCollapsed: boolean;
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const { user, logout } = useAuth();
  const { instances, currentInstance, setCurrentInstance, refreshData, isDataInitialized } = useApp();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");

  // Carregar dados apenas se ainda não foram inicializados e temos um usuário
  useEffect(() => {
    if (user && !isDataInitialized) {
      console.log("Header - Initial data load");
      refreshData();
    }
  }, [user, refreshData, isDataInitialized]);

  // Update local state when currentInstance changes
  useEffect(() => {
    if (currentInstance?.id) {
      console.log("Header - currentInstance changed:", currentInstance.name);
      setSelectedInstanceId(currentInstance.id);
    }
  }, [currentInstance]);

  const handleInstanceChange = (instanceId: string) => {
    console.log("Header - Instance selected manually:", instanceId);
    const instance = instances?.find(inst => inst.id === instanceId);
    if (instance) {
      setCurrentInstance(instance);
      setSelectedInstanceId(instanceId);
      // Save selected instance ID to localStorage
      localStorage.setItem('selectedInstanceId', instance.id);
    }
  };

  // Caso não tenha user ou instâncias carregadas, mostrar versão simplificada
  const hasInstances = Array.isArray(instances) && instances.length > 0;
  
  if (!user || !hasInstances || !currentInstance) {
    return (
      <header className={cn(
        "h-16 border-b border-border flex items-center justify-between px-4",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      )}>
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold">Master Sequence</span>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="outline-none">
                  <Avatar className="h-8 w-8 border-2 border-primary bg-primary">
                    <AvatarFallback className="text-primary-foreground">
                      {user?.accountName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">{user?.accountName || "Usuário"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => logout()}>Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className={cn(
      "h-16 border-b border-border flex items-center justify-between px-4",
      "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    )}>
      <div className="flex items-center gap-4">
        {hasInstances && (
          <Select 
            onValueChange={handleInstanceChange} 
            value={selectedInstanceId}
          >
            <SelectTrigger className="w-[180px] md:w-[220px]">
              <SelectValue placeholder="Selecionar instância" />
            </SelectTrigger>
            <SelectContent>
              {instances.map((instance) => (
                <SelectItem key={instance.id} value={instance.id}>
                  {instance.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="outline-none">
              <Avatar className="h-8 w-8 border-2 border-primary bg-primary">
                <AvatarFallback className="text-primary-foreground">{user?.accountName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium text-sm">{user?.accountName || "Usuário"}</p>
                <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">Perfil</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link to="/settings">Configurações</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => logout()}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
