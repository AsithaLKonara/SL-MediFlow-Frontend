"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { Printer, FileText, LogOut, CheckCircle2 } from "lucide-react";
import { 
  ShiftSummaryReceipt, 
  ShiftSummaryData 
} from "@/app/frontdesk/components/PrintTemplates/ShiftSummaryReceipt";
import { buildShiftSummaryEscPos } from "@/app/frontdesk/utils/shiftSummaryEscpos";
import { triggerPrinterAutoCut } from "@/lib/printerAutoCut";

export function CashierCloseModal({ 
  open, 
  onOpenChange, 
  onClosed 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onClosed?: () => void;
}) {
  const { token, user, logout } = useAuth();
  const [declaredCash, setDeclaredCash] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ShiftSummaryData | null>(null);
  const [showSummaryView, setShowSummaryView] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);
  const handleBrowserPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `SL_MediFlow_Shift_Summary_${new Date().toISOString().slice(0, 10)}`,
    onAfterPrint: () => {
      triggerPrinterAutoCut();
    }
  });

  const printThermalHardware = async (summaryData: ShiftSummaryData) => {
    try {
      const builder = buildShiftSummaryEscPos(summaryData);
      const rawBase64 = builder.toBase64();
      const bridgeUrl = (typeof window !== "undefined" ? localStorage.getItem("node_print_url") : null) || "http://127.0.0.1:18181";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);

      const res = await fetch(`${bridgeUrl}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "escpos", data: rawBase64 }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        toast.success("Shift settlement receipt printed to thermal printer.");
        return true;
      }
      return false;
    } catch (e) {
      console.warn("Hardware thermal printer offline or bridge error:", e);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!declaredCash || isNaN(Number(declaredCash))) {
      toast.error("Please enter a valid cash amount");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/shift-summary`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ declaredCash: Number(declaredCash) })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to close shift");
      }
      
      const data = await res.json();
      const summaryPayload: ShiftSummaryData = data.data;
      setSummary(summaryPayload);
      setShowSummaryView(true);

      // Attempt thermal hardware print
      const hwSuccess = await printThermalHardware(summaryPayload);
      if (!hwSuccess) {
        toast.info("Thermal printer bridge offline. Triggering browser print preview...");
        setTimeout(() => {
          handleBrowserPrint();
        }, 350);
      }

    } catch (error: any) {
      toast.error(error.message || "Failed to close shift");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishAndLogout = () => {
    onOpenChange(false);
    if (onClosed) {
      onClosed();
    } else {
      logout();
    }
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen && showSummaryView) {
      // If closing after summary was shown, reset and handle exit
      setShowSummaryView(false);
      setSummary(null);
      setDeclaredCash("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className={showSummaryView ? "sm:max-w-[550px] max-h-[90vh] overflow-y-auto" : "sm:max-w-[425px]"}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {showSummaryView && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            <DialogTitle>
              {showSummaryView ? "Shift Settlement Summary" : "Close Cashier Shift"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {!showSummaryView ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Counted Physical Cash in Drawer (LKR)</label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={declaredCash}
                onChange={(e) => setDeclaredCash(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Count the physical cash in the drawer and enter the total.
              </p>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !declaredCash}>
                {loading ? "Settling Shift..." : "Close Shift & Print Receipt"}
              </Button>
            </div>
          </div>
        ) : summary && (
          <div className="space-y-4 py-2 text-sm">
            {/* Cashier & Time Info */}
            <div className="bg-muted/40 p-3 rounded-lg border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cashier:</span>
                <span className="font-semibold">{summary.cashierName} ({summary.cashierRole})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shift Ref:</span>
                <span className="font-mono">{summary.shiftRef || summary.shiftId.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shift Start:</span>
                <span>{new Date(summary.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shift Close:</span>
                <span>{new Date(summary.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-medium">
                <span className="text-muted-foreground">Duration:</span>
                <span className="text-primary">{summary.durationFormatted}</span>
              </div>
            </div>

            {/* Day & Shift Sales */}
            <div className="border rounded-lg p-3 space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
                Day & Shift Sales
              </h4>
              {summary.todayHospitalTotalSales !== undefined && (
                <div className="flex justify-between text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 p-1.5 rounded">
                  <span>Today Hospital Total Sales:</span>
                  <span>LKR {summary.todayHospitalTotalSales.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-muted-foreground">Gross Shift Sales:</span>
                  <p className="font-semibold">LKR {summary.grossSales.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cash Collections:</span>
                  <p className="font-semibold text-emerald-600">LKR {summary.systemCashTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Card Collections:</span>
                  <p className="font-semibold">LKR {summary.systemCardTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Invoices:</span>
                  <p className="font-semibold">{summary.totalInvoices}</p>
                </div>
              </div>
            </div>

            {/* Cash Balance Reconciliation */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between border-b pb-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Cash Balance Drawer
                </h4>
                <Badge 
                  variant={summary.variance === 0 ? "outline" : summary.variance > 0 ? "default" : "destructive"}
                  className="text-[10px]"
                >
                  {summary.varianceStatus || (summary.variance === 0 ? "BALANCED" : summary.variance > 0 ? "SURPLUS" : "SHORTAGE")}
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Starting Float:</span>
                  <span>LKR {summary.startingFloat.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>(+) Cash Collected:</span>
                  <span>LKR {summary.systemCashTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                </div>
                {summary.cashRefundsTotal > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>(-) Cash Refunds:</span>
                    <span>- LKR {summary.cashRefundsTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {(summary.doctorCashDisbursed ?? 0) > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>(-) Doctor Cash Payouts:</span>
                    <span>- LKR {summary.doctorCashDisbursed?.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Expected Cash in Drawer:</span>
                  <span>LKR {summary.expectedCash.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-primary">
                  <span>Declared Physical Cash:</span>
                  <span>LKR {summary.declaredCash.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-dashed pt-1">
                  <span>Variance:</span>
                  <span className={summary.variance === 0 ? "text-emerald-600" : summary.variance > 0 ? "text-blue-600" : "text-destructive"}>
                    LKR {summary.variance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Doctor Payments Breakdown */}
            {summary.doctorPayments && summary.doctorPayments.length > 0 && (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center border-b pb-1">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Doctor Payments ({summary.doctorPayments.length})
                  </h4>
                  <span className="text-xs font-bold text-primary">
                    Net Due: LKR {(summary.totalDoctorPayments?.netDoctorPayment ?? summary.totalDoctorPayments?.totalDoctorNetPayment ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {summary.doctorPayments.map((dp, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-muted/30 p-1.5 rounded">
                      <div>
                        <p className="font-medium">{dp.doctorName}</p>
                        <p className="text-[10px] text-muted-foreground">{dp.patientCount} patients · Fee: LKR {dp.totalFee.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">LKR {dp.netDoctorPayment.toFixed(2)}</p>
                        {Boolean(dp.cashDisbursed && dp.cashDisbursed > 0) && (
                          <p className="text-[10px] text-amber-600 font-medium">Paid Cash: LKR {dp.cashDisbursed?.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => summary && printThermalHardware(summary)}
                className="gap-1.5"
              >
                <Printer className="w-4 h-4" /> Thermal Print
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleBrowserPrint()}
                className="gap-1.5"
              >
                <FileText className="w-4 h-4" /> Browser / PDF
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleFinishAndLogout}
                className="gap-1.5"
              >
                <LogOut className="w-4 h-4" /> Finish & Log Out
              </Button>
            </DialogFooter>
          </div>
        )}
        
        {/* Hidden 80mm Roll Thermal Receipt for Browser Printing */}
        <div className="hidden">
          <ShiftSummaryReceipt ref={printRef} summary={summary} user={user} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
