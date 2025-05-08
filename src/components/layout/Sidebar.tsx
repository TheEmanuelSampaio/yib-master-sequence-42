
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  List, 
  Settings,
  Users,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Sequências',
    href: '/sequences',
    icon: List,
  },
  {
    title: 'Contatos',
    href: '/contacts',
    icon: Users,
  },
  {
    title: 'Mensagens',
    href: '/messages',
    icon: MessageCircle,
  },
  {
    title: 'Instâncias',
    href: '/instances',
    icon: ArrowRightLeft,
  },
  {
    title: 'Configurações',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <div 
      className={cn(
        "fixed top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border transition-width duration-300 ease-in-out z-10",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <div className={cn("flex items-center", collapsed && "justify-center w-full")}>
          <div className="flex items-center justify-center">
            <img 
              src="https://minios3.yearsinbox.com/chatwoot/Ico%20Years%20In%20Box%20250px.png" 
              alt="Years In Box" 
              className="h-10 w-10 rounded-full object-cover"
            />
            {!collapsed && (
              <span className="text-xl font-semibold text-sidebar-foreground ml-2">
                Master Sequence
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        className="absolute right-0 top-16 transform translate-x-1/2 bg-background border border-border rounded-full p-1 flex items-center justify-center"
        onClick={onToggle}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="py-4">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground",
                    collapsed ? "justify-center px-2" : "px-3"
                  )
                }
              >
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.title}</TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.title}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </ScrollArea>
    </div>
  );
}
