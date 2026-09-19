"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";

export function FrontdeskLogoutButton() {
  const { logout } = useAuth();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={logout}
      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-9 w-9 ml-2"
      title="Logout"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
