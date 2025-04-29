import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useApp } from "@/context/AppContext";
import { UserAvatar } from "@/components/ui/avatar";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useApp();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="pr-0">
          {/* Mobile Navigation */}
        </SheetContent>
      </Sheet>
      <div className="flex-1">
        <Input
          type="search"
          placeholder="Buscar..."
          className="md:w-[200px] lg:w-[300px] hidden md:flex"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-bounce items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
            5
          </span>
          <span className="sr-only">Notifications</span>
        </Button>
        <ThemeToggle />
        <div className="flex items-center gap-2">
          <UserAvatar name={user?.name || "User"} />
          <div className="hidden md:block">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
