"use client";

import { useState } from "react";
import { POSPane } from "../components/POSPane";
import { TokenPane } from "../components/TokenPane";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function WorkspacePage() {
  const [incomingRx, setIncomingRx] = useState<any>(null);

  return (
    <div className="flex-1 h-[calc(100vh-56px)] w-full bg-background text-foreground overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col border-r border-border bg-background">
          <POSPane incomingRx={incomingRx} clearIncoming={() => setIncomingRx(null)} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col bg-muted/30">
          <TokenPane onSendToPOS={(rx) => setIncomingRx(rx)} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
