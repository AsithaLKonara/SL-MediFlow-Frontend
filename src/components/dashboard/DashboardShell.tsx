"use client";

import { SidebarProvider, useSidebar } from "./SidebarProvider";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { cn } from "@/lib/utils";
import React from "react";

function ShellInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const marginLeft = isCollapsed ? "ml-[80px]" : "ml-64";
  
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopNav />
      <main className={cn("p-8 transition-all duration-300 ease-in-out", marginLeft)}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <ShellInner>{children}</ShellInner>;
}
