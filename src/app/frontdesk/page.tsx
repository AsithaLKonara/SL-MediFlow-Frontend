import { POSPane } from "./components/POSPane";
import { TokenPane } from "./components/TokenPane";

export default function FrontDeskPage() {
  return (
    <div className="flex-1 flex flex-row h-[calc(100vh-56px)] w-full bg-background text-foreground overflow-hidden">
      {/* Left Pane - POS */}
      <div className="w-1/2 h-full border-r border-border bg-background flex flex-col">
        <POSPane />
      </div>

      {/* Right Pane - Tokens & Registration */}
      <div className="w-1/2 h-full bg-muted/30 flex flex-col">
        <TokenPane />
      </div>
    </div>
  );
}
