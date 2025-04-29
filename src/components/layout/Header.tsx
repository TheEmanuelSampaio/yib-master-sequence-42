
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
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  sidebarCollapsed: boolean;
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const { user, profile, signOut } = useAuth();
  const { instances, currentInstance, setCurrentInstance } = useApp();
  const navigate = useNavigate();

  const handleInstanceChange = (instanceId: string) => {
    const instance = instances.find(inst => inst.id === instanceId);
    if (instance) {
      setCurrentInstance(instance);
    }
  };

  return (
    <header className={cn(
      "h-16 border-b border-border flex items-center justify-between px-4",
      "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    )}>
      <div className="flex items-center gap-4">
        <Select onValueChange={handleInstanceChange} value={currentInstance?.id}>
          <SelectTrigger className="w-[180px] md:w-[220px]">
            <SelectValue placeholder="Selecionar instância" />
          </SelectTrigger>
          <SelectContent>
            {instances.length === 0 ? (
              <div className="py-2 px-2 text-sm text-muted-foreground">
                Nenhuma instância configurada
              </div>
            ) : (
              instances.map((instance) => (
                <SelectItem key={instance.id} value={instance.id}>
                  {instance.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-4">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="outline-none">
              <Avatar className="h-8 w-8 border-2 border-primary bg-primary">
                <AvatarFallback className="text-primary-foreground">
                  {profile?.account_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium text-sm">
                  {profile?.account_name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">Perfil</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link to="/settings">Configurações</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={signOut}>
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
