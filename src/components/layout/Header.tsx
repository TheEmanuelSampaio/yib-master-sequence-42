
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";
import { MenuIcon, Moon, Sun } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/context/AuthContext";

export interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <MenuIcon className="h-6 w-6" />
          <span className="sr-only">Abrir menu</span>
        </Button>
        <div className="flex items-center justify-between w-full">
          <div className="flex">
            <h2 className="text-lg font-semibold md:text-xl">Painel</h2>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && (
              <span className="text-sm text-muted-foreground hidden md:block">
                {user.email}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
