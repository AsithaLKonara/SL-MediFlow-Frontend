"use client";

import React from "react";
import { CheckCircle2, CreditCard, ScanLine } from "lucide-react";
import type { CustomerDisplayState } from "@/services/hardware.service";

export function CustomerDisplayLastItemBanner({
  broadcastState,
}: {
  broadcastState: CustomerDisplayState | null;
}) {
  if (!broadcastState || broadcastState.status !== "SCANNING" || !broadcastState.lastScannedItem) {
    return null;
  }

  const { name, qty, priceLkr } = broadcastState.lastScannedItem;

  return (
    <div className="mx-4 mt-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-primary/15 text-primary shrink-0">
          <ScanLine className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold block">
            Last Item Added
          </span>
          <div className="font-bold text-sm md:text-base text-foreground truncate">
            {name} &times; {qty}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono font-bold text-base md:text-lg text-primary">
          LKR {priceLkr.toFixed(2)}
        </div>
        <div className="text-[11px] text-muted-foreground font-mono">
          {broadcastState.itemCount} {broadcastState.itemCount === 1 ? "item" : "items"}
        </div>
      </div>
    </div>
  );
}

export function CustomerDisplayStatusOverlay({
  broadcastState,
}: {
  broadcastState: CustomerDisplayState | null;
}) {
  if (!broadcastState) return null;

  if (broadcastState.status === "COMPLETED") {
    const paid = broadcastState.amountPaidLkr ?? broadcastState.totalLkr;
    const change = broadcastState.changeDueLkr ?? 0;

    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
        <div className="max-w-lg w-full rounded-3xl bg-card border-2 border-emerald-500/40 shadow-2xl p-8 md:p-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
              {broadcastState.storeName || "SL MediFlow"}
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              Payment Completed!
            </h2>
            <p className="text-base md:text-lg text-muted-foreground">
              Thank you for choosing SL MediFlow.
            </p>
          </div>

          <div className="bg-muted/40 border border-border rounded-2xl p-5 space-y-3 text-base">
            <div className="flex justify-between text-muted-foreground">
              <span>Total Paid</span>
              <span className="font-mono font-semibold text-foreground">
                LKR {broadcastState.totalLkr.toFixed(2)}
              </span>
            </div>
            {paid > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Amount Received</span>
                <span className="font-mono font-semibold text-foreground">
                  LKR {paid.toFixed(2)}
                </span>
              </div>
            )}
            {change > 0 && (
              <div className="flex justify-between items-center pt-3 border-t border-border text-emerald-600 dark:text-emerald-400 text-2xl font-bold">
                <span>Change Due</span>
                <span className="font-mono">LKR {change.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (
    broadcastState.status === "PAYMENT" &&
    broadcastState.paymentMethod !== "QR" &&
    broadcastState.paymentMethod !== "BANK"
  ) {
    return (
      <div className="mx-4 md:mx-8 mb-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs md:text-sm text-amber-700 dark:text-amber-300 font-medium">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 shrink-0" />
          <span>Checkout in progress &mdash; Please confirm total</span>
        </div>
        <span className="font-mono font-bold">LKR {broadcastState.totalLkr.toFixed(2)}</span>
      </div>
    );
  }

  return null;
}

