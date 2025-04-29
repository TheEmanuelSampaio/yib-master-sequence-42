import {
  Home,
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
  Whatsapp,
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
import Link from "next/link";
import { usePathname } from "next/navigation";

const SidebarNavItem = ({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <li>
      <Link href={href} className="w-full">
        <Button variant="ghost" className="w-full justify-start" active={isActive}>
          <Icon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </Link>
    </li>
  );
};

export function Sidebar() {
  const { user, currentInstance } = useApp();

  return (
    <div className="sidebar fixed left-0 top-0 z-40 h-screen w-60 overflow-y-auto border-r bg-secondary py-4">
      <ScrollArea className="h-[calc(100vh-8rem)] px-3">
        <div className="mb-4 flex items-center space-x-2 px-4">
          <Avatar>
            <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Separator className="mb-4" />
        <nav className="flex flex-col space-y-1">
          <ul>
            <SidebarNavItem href="/" label="Dashboard" icon={LayoutDashboard} />
            <SidebarNavItem href="/instances" label="Instances" icon={Whatsapp} />
            <SidebarNavItem href="/sequences" label="Sequences" icon={ListChecks} />
            <SidebarNavItem href="/contacts" label="Contacts" icon={Users} />
          </ul>
          <Separator />
          <ul>
            <SidebarNavItem href="/settings" label="Settings" icon={Settings} />
          </ul>
        </nav>
      </ScrollArea>
      <div className="absolute bottom-0 left-0 w-full border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              {currentInstance ? (
                <>
                  <Whatsapp className="mr-2 h-4 w-4" />
                  {currentInstance.name}
                </>
              ) : (
                <>
                  <Whatsapp className="mr-2 h-4 w-4" />
                  Select Instance
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Link href="/instances" className="w-full">
                Manage Instances
              </Link>
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
