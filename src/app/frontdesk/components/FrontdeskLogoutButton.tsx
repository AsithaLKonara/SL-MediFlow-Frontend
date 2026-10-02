"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";

export function FrontdeskLogoutButton() {
  const { logout } = useAuth();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={logout}
      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-9 ml-2 gap-2"
      title="Logout & Close Shift"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden md:inline">Logout & Close Shift</span>
    </Button>
  );
}
