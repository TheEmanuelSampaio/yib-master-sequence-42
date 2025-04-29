
import {
  Home,
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
  MessageSquare,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useApp } from "@/context/AppContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const SidebarNavItem = ({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) => {
  // We'll use window.location.pathname instead of usePathname from Next.js
  const pathname = window.location.pathname;
  const isActive = pathname === href;

  return (
    <li>
      <a href={href} className="w-full">
        <Button variant="ghost" className={`w-full justify-start ${isActive ? 'bg-accent text-accent-foreground' : ''}`}>
          <Icon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </a>
    </li>
  );
};

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, currentInstance } = useApp();

  return (
    <div className={`sidebar fixed left-0 top-0 z-40 h-screen ${collapsed ? 'w-20' : 'w-60'} overflow-y-auto border-r bg-secondary py-4 transition-all duration-300`}>
      <ScrollArea className="h-[calc(100vh-8rem)] px-3">
        <div className="mb-4 flex items-center space-x-2 px-4">
          {!collapsed && (
            <>
              <Avatar>
                <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </>
          )}
          {collapsed && (
            <Avatar>
              <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
        </div>
        <Separator className="mb-4" />
        <nav className="flex flex-col space-y-1">
          <ul>
            <SidebarNavItem href="/" label={collapsed ? "" : "Dashboard"} icon={LayoutDashboard} />
            <SidebarNavItem href="/instances" label={collapsed ? "" : "Instances"} icon={MessageSquare} />
            <SidebarNavItem href="/sequences" label={collapsed ? "" : "Sequences"} icon={ListChecks} />
            <SidebarNavItem href="/contacts" label={collapsed ? "" : "Contacts"} icon={Users} />
          </ul>
          <Separator />
          <ul>
            <SidebarNavItem href="/settings" label={collapsed ? "" : "Settings"} icon={Settings} />
          </ul>
        </nav>
      </ScrollArea>
      <div className="absolute bottom-0 left-0 w-full border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              {currentInstance ? (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {!collapsed && currentInstance.name}
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {!collapsed && "Select Instance"}
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <a href="/instances" className="w-full">
                Manage Instances
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <ThemeToggle />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
