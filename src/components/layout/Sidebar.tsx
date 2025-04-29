
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart3, 
  ListFilter, 
  MessagesSquare, 
  Users, 
  ServerCog,
  Settings as SettingsIcon,
  FileCode,
  UserCog
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ className, isCollapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation();
  const { isSuperAdmin, isAdmin } = useAuth();

  const routes = [
    {
      title: "Dashboard",
      icon: <BarChart3 className="h-5 w-5" />,
      href: "/",
      variant: "default",
    },
    {
      title: "Sequências",
      icon: <ListFilter className="h-5 w-5" />,
      href: "/sequences",
      variant: "ghost",
    },
    {
      title: "Contatos",
      icon: <Users className="h-5 w-5" />,
      href: "/contacts",
      variant: "ghost",
    },
    {
      title: "Mensagens",
      icon: <MessagesSquare className="h-5 w-5" />,
      href: "/messages",
      variant: "ghost",
    },
    {
      title: "Instâncias",
      icon: <ServerCog className="h-5 w-5" />,
      href: "/instances",
      variant: "ghost",
    },
    {
      title: "Usuários",
      icon: <UserCog className="h-5 w-5" />,
      href: "/users",
      variant: "ghost",
      show: isAdmin || isSuperAdmin,
    },
    {
      title: "Configurações",
      icon: <SettingsIcon className="h-5 w-5" />,
      href: "/settings",
      variant: "ghost",
    },
    {
      title: "API Docs",
      icon: <FileCode className="h-5 w-5" />,
      href: "/api-docs",
      variant: "ghost",
    },
  ];

  return (
    <div className={cn("flex flex-col", className)}>
      <div className={cn(
        "flex h-[52px] items-center justify-center",
        isCollapsed ? "h-[52px]" : "px-2"
      )}>
        <Link 
          to="/" 
          className={cn(
            "flex items-center gap-2 font-semibold",
            isCollapsed ? "justify-center" : "px-2"
          )}
        >
          <ServerCog className="h-6 w-6" />
          {!isCollapsed && <span>Master Sequence</span>}
        </Link>
      </div>
      <ScrollArea className="flex-1 overflow-auto">
        <div className={cn("flex flex-1 flex-col gap-1 p-2", 
          isCollapsed ? "items-center" : ""
        )}>
          {routes.map((route) => 
            // Só mostrar a rota se não tiver condição ou se a condição for true
            (!route.hasOwnProperty('show') || route.show) && (
              <Button
                key={route.href}
                variant={pathname === route.href ? "secondary" : "ghost"}
                className={cn(
                  "justify-start",
                  isCollapsed ? "w-9 px-0" : "w-full",
                )}
                size={isCollapsed ? "icon" : "default"}
                asChild
              >
                <Link to={route.href}>
                  {route.icon}
                  {!isCollapsed && <span className="ml-2">{route.title}</span>}
                </Link>
              </Button>
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
