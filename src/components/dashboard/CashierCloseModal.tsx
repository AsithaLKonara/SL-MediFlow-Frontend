"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import React from "react";

const ShiftSummaryPrint = React.forwardRef<HTMLDivElement, { summary: any, user: any }>(
  ({ summary, user }, ref) => {
    if (!summary) return null;
    return (
      <div className="hidden">
        <div ref={ref} className="w-[290px] mx-auto box-border bg-white text-black px-3.5 py-3 font-mono text-sm print:w-[290px] print:px-3.5 print:py-2 leading-tight">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: auto;
                margin: 3mm 2mm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          `}} />
          <div className="text-center mb-4 border-b-2 border-black pb-2">
            <img src="/logo.png" alt="AMAZ Hospital" className="w-44 mx-auto mb-2 grayscale brightness-0" />
            <p className="text-xs font-bold uppercase tracking-widest mt-1">Cashier Shift Close</p>
            <p className="text-[10px] mt-1">Date: {new Date().toLocaleString()}</p>
            <p className="text-[10px]">Cashier: {user?.fullName}</p>
          </div>
          
          <div className="mb-4">
            <h4 className="font-bold border-b border-dashed border-black mb-1">Sales Summary</h4>
            <div className="flex justify-between text-xs">
              <span>Total Invoices:</span>
              <span>{summary.totalInvoices}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>Total Cash (System):</span>
              <span>LKR {summary.systemCashTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>Total Card (System):</span>
              <span>LKR {summary.systemCardTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="mb-4 border-t border-dashed border-black pt-2">
            <h4 className="font-bold border-b border-dashed border-black mb-1">Reconciliation</h4>
            <div className="flex justify-between text-xs">
              <span>System Cash:</span>
              <span>LKR {summary.systemCashTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>Declared Cash:</span>
              <span>LKR {summary.declaredCash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold mt-2">
              <span>Difference:</span>
              <span>LKR {(summary.declaredCash - summary.systemCashTotal).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-center mt-6 pt-2 border-t-2 border-black flex flex-col items-center">
            <p className="text-[10px] mt-4 pt-4 border-t border-dashed border-black w-24">Signature</p>
          </div>
        </div>
      </div>
    );
  }
);
ShiftSummaryPrint.displayName = "ShiftSummaryPrint";

export function CashierCloseModal({ open, onOpenChange, onClosed }: { open: boolean, onOpenChange: (open: boolean) => void, onClosed?: () => void }) {
  const { token, user, logout } = useAuth();
  const [declaredCash, setDeclaredCash] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Shift_Summary",
    onAfterPrint: () => {
      onOpenChange(false);
      if (onClosed) onClosed();
      else logout();
    }
  });

  const handleSubmit = async () => {
    if (!declaredCash || isNaN(Number(declaredCash))) {
      toast.error("Please enter a valid cash amount");
      return;
    }

    try {
      setLoading(true);
      // Fetch today's invoices for this user
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/shift-summary`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ declaredCash: Number(declaredCash) })
      });
      
      if (!res.ok) {
        throw new Error("Failed to close shift");
      }
      
      const data = await res.json();
      setSummary({
        ...data.data,
        declaredCash: Number(declaredCash)
      });
      
      // Delay to allow React to render the print template
      setTimeout(() => {
        handlePrint();
      }, 500);

    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Cashier Shift</DialogTitle>
        </DialogHeader>
        {!summary ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Counted Cash in Drawer (LKR)</label>
              <Input 
                type="number" 
                placeholder="Enter physical cash amount" 
                value={declaredCash}
                onChange={(e) => setDeclaredCash(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Processing..." : "Close Shift & Print"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground mb-4">Printing shift summary...</p>
          </div>
        )}
        
        <ShiftSummaryPrint ref={printRef} summary={summary} user={user} />
      </DialogContent>
    </Dialog>
  );
}
