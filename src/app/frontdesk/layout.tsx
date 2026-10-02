import type { Metadata } from "next";
import { FrontdeskHeaderWrapper } from "./components/FrontdeskHeaderWrapper";
import { FrontdeskAuthGuard } from "./components/FrontdeskAuthGuard";

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
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden relative">
      <FrontdeskHeaderWrapper />
      
      {/* Main Workspace Area - No Sidebar, No margins */}
      <main className="flex-1 flex overflow-hidden">
        <FrontdeskAuthGuard>
          {children}
        </FrontdeskAuthGuard>
      </main>
    </div>
  );
}
