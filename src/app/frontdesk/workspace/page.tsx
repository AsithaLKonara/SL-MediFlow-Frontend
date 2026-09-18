"use client";

import { POSPane } from "../components/POSPane";
import { TokenPane } from "../components/TokenPane";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function WorkspacePage() {
  return (
    <div className="flex-1 h-[calc(100vh-56px)] w-full bg-background text-foreground overflow-hidden">
      {/* @ts-expect-error shadcn types mismatch */}
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col border-r border-border bg-background">
          <POSPane />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col bg-muted/30">
          <TokenPane />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
