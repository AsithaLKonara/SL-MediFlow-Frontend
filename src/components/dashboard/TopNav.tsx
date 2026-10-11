"use client";

import { Search, Menu, Sun, Moon, Maximize, Minimize, Pointer, CalendarCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./SidebarProvider";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CashierCloseModal } from "./CashierCloseModal";

export function TopNav() {
  const { isCollapsed, toggleSidebar, isTouchMode, toggleTouchMode } = useSidebar();
  const { user, logout } = useAuth();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const marginLeft = isCollapsed ? "ml-[80px]" : "ml-64";

  useEffect(() => {
    setMounted(true);
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      await document.exitFullscreen().catch(err => console.error(err));
    }
  };

  return (
    <header className={cn("h-16 bg-background/80 backdrop-blur-md border-b border-border/40 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-all duration-300 ease-in-out", marginLeft)}>
      <div className="flex items-center gap-4 w-full max-w-md">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0 text-muted-foreground hover:text-foreground">
          <Menu className="w-5 h-5" />
        </Button>
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search anything..." 
            className="w-full pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/30 rounded-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {mounted && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground"
              title="Toggle Dark Mode"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            <Button
              variant={isTouchMode ? "secondary" : "ghost"}
              size="icon"
              onClick={toggleTouchMode}
              className={cn("text-muted-foreground hover:text-foreground", isTouchMode && "text-primary bg-primary/10 hover:bg-primary/20")}
              title="Toggle Touch/Kiosk Mode"
            >
              <Pointer className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-muted-foreground hover:text-foreground mr-2 hidden sm:flex"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
          </>
        )}


        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-9 w-9 rounded-full ml-2 outline-none">
            <Avatar className="h-9 w-9">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.fullName || "User"}`} alt={user?.fullName || "User"} />
              <AvatarFallback>{user?.fullName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <div className="px-2 py-1.5 text-sm">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.fullName || "Loading..."}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || ""}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/hr')} className="cursor-pointer w-full flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-primary" />
              <span>My HR & Leaves</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer w-full">
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowCloseModal(true)} className="cursor-pointer w-full text-orange-600 focus:text-orange-600">
              End Shift & Close
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <CashierCloseModal 
          open={showCloseModal} 
          onOpenChange={setShowCloseModal} 
        />
      </div>
    </header>
  );
}
