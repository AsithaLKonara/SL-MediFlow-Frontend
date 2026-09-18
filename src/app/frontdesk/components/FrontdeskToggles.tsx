"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Sun, Moon, Pointer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/dashboard/SidebarProvider";
import { cn } from "@/lib/utils";

export function FrontdeskToggles() {
  const { theme, setTheme } = useTheme();
  const { isTouchMode, toggleTouchMode } = useSidebar();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-[88px] h-9"></div>; // Placeholder space
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="text-muted-foreground hover:text-foreground h-9 w-9"
        title="Toggle Dark Mode"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      
      <Button
        variant={isTouchMode ? "secondary" : "ghost"}
        size="icon"
        onClick={toggleTouchMode}
        className={cn("text-muted-foreground hover:text-foreground h-9 w-9", isTouchMode && "text-primary bg-primary/10 hover:bg-primary/20")}
        title="Toggle Touch/Kiosk Mode"
      >
        <Pointer className="h-4 w-4" />
      </Button>
    </div>
  );
}
