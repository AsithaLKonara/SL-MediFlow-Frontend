import type { Metadata } from "next";
import Link from "next/link";
import { Home } from "lucide-react";
import { FullScreenButton } from "./components/FullScreenButton";
import { FrontdeskToggles } from "./components/FrontdeskToggles";

export const metadata: Metadata = {
  title: "Front Desk | AMAZ Hospital",
  description: "Unified Front Desk and Pharmacy POS",
};

export default function FrontDeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Front Desk Minimal Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/frontdesk" className="flex items-center gap-2 font-bold text-lg text-primary hover:text-primary/80 transition-colors" title="Return to Dashboard">
            <Home className="w-5 h-5" />
            <span>AMAZ</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="text-sm font-medium">Front Desk & POS</div>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Shift Active</span>
          </div>
          <div className="font-medium text-muted-foreground ml-2">
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
          <div className="h-4 w-px bg-border mx-1" />
          <FrontdeskToggles />
          <FullScreenButton />
        </div>
      </header>
      
      {/* Main Workspace Area - No Sidebar, No margins */}
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
    </div>
  );
}
