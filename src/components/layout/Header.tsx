
import { useApp } from "@/context/AppContext";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Button } from "../ui/button";
import { 
  MenuIcon, 
  Loader2 as LoaderIcon
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

type HeaderProps = {
  sidebarCollapsed: boolean;
  isLoading?: boolean;
};

export const Header = ({ sidebarCollapsed, isLoading = false }: HeaderProps) => {
  const { currentInstance, refreshData } = useApp();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  return (
    <header className="bg-background border-b border-border h-16 px-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {currentInstance && (
          <div className="text-sm font-medium flex items-center gap-2">
            <span className="text-muted-foreground">Instância:</span>
            <span className="font-semibold">{currentInstance.name}</span>
            <span className={`w-2 h-2 rounded-full ${currentInstance.active ? 'bg-green-500' : 'bg-yellow-500'}`} />
          </div>
        )}

        {isLoading && (
          <div className="flex items-center text-sm text-muted-foreground gap-2 ml-4">
            <LoaderIcon className="h-4 w-4 animate-spin" />
            <span>Carregando dados...</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <LoaderIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
        
        <ThemeToggle />
        
        {user && (
          <div className="text-sm font-medium ml-4">
            {user.email?.split('@')[0]}
          </div>
        )}
      </div>
    </header>
  );
};
