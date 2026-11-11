"use client";

import React from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomerPoleDisplayPanel } from "./CustomerPoleDisplayPanel";

interface HardwareSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settingsHref?: string;
}

export function HardwareSettingsModal({
  open,
  onOpenChange,
  settingsHref = "/frontdesk/settings?tab=hardware",
}: HardwareSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 pr-8">
          <div>
            <DialogTitle className="text-xl font-bold">
              Customer Display &amp; Pole Display Controls
            </DialogTitle>
            <DialogDescription>
              Configure dual-screen checkout display and serial/bridge pole display without leaving your active POS session.
            </DialogDescription>
          </div>
          <Link href={settingsHref} onClick={() => onOpenChange(false)}>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0">
              <Settings className="w-3.5 h-3.5" />
              All Hardware Settings
            </Button>
          </Link>
        </DialogHeader>

        <div className="mt-2">
          <CustomerPoleDisplayPanel enableSystemDefaults showPatientQueueLauncher />
        </div>
      </DialogContent>
    </Dialog>
  );
}
