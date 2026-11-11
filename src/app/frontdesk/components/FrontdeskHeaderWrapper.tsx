"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FrontdeskToggles } from "./FrontdeskToggles";
import { FullScreenButton } from "./FullScreenButton";
import { FrontdeskLogoutButton } from "./FrontdeskLogoutButton";

export function FrontdeskHeaderWrapper() {
  const pathname = usePathname();
  
  if (pathname === "/frontdesk/customer-display") {
    return null;
  }

  return (
    <>
      {/* Subtle top-page radial gradient for Enterprise Sheen */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none -z-10"></div>
      
      {/* Front Desk Minimal Header */}
      <header className="h-14 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/frontdesk" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors" title="Return to Dashboard">
            <Image src="/logo.png" alt="SL MediFlow" width={140} height={32} className="object-contain" priority />
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
          <FrontdeskLogoutButton />
        </div>
      </header>
    </>
  );
}
