
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export interface SidebarProps {
  open?: boolean;
  setOpen: (open: boolean) => void;
}

export function Sidebar({ open = false, setOpen }: SidebarProps) {
  const { logout, user } = useAuth();
  
  const handleLogout = async () => {
    await logout();
  };
  
  return (
    <>
      {/* Overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r bg-background transition-transform duration-300 md:translate-x-0 md:z-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">🤖 EvolutionGPT</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Fechar sidebar</span>
          </Button>
        </div>
        <ScrollArea className="flex-1 py-3">
          <nav className="grid gap-1 px-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent" : "transparent"
                )
              }
            >
              📊 Dashboard
            </NavLink>
            <NavLink
              to="/sequences"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent" : "transparent"
                )
              }
            >
              📱 Sequências
            </NavLink>
            <NavLink
              to="/contacts"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent" : "transparent"
                )
              }
            >
              👤 Contatos
            </NavLink>
            <NavLink
              to="/messages"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent" : "transparent"
                )
              }
            >
              💬 Mensagens
            </NavLink>
            <NavLink
              to="/instances"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent" : "transparent"
                )
              }
            >
              🔄 Instâncias
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent" : "transparent"
                )
              }
            >
              ⚙️ Configurações
            </NavLink>
            <NavLink
              to="/api-docs"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent" : "transparent"
                )
              }
            >
              📚 Documentação API
            </NavLink>
          </nav>
        </ScrollArea>
        <div className="mt-auto border-t p-4">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            🚪 Sair
          </Button>
        </div>
      </div>
    </>
  );
}
