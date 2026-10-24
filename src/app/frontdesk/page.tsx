"use client";

import { useShift } from "./hooks/useShift";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { MonitorPlay, Package, LogOut, UserCheck, Settings, Tv, CalendarClock, LogIn, Fingerprint, Clock, CheckCircle2, Stethoscope, Banknote, Printer, FileText, AlertTriangle, RotateCcw, FlaskConical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { ShiftSummaryReceipt, ShiftSummaryData } from "./components/PrintTemplates/ShiftSummaryReceipt";
import { buildShiftSummaryEscPos } from "./utils/shiftSummaryEscpos";

export default function FrontDeskDashboard() {
  const { shift, isLoaded, openShift, closeShift } = useShift();
  const { user, logout } = useAuth();
  const [startingFloat, setStartingFloat] = useState("0");
  const [declaredCash, setDeclaredCash] = useState("");
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [closingSummary, setClosingSummary] = useState<ShiftSummaryData | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleBrowserPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `AMAZ_Shift_Summary_${new Date().toISOString().slice(0, 10)}`,
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
        toast.success("Shift summary receipt printed to thermal printer.");
        return true;
      }
      return false;
    } catch (e) {
      console.warn("Hardware printer bridge offline or failed:", e);
      return false;
    }
  };

  if (!isLoaded || !user) return null;

  const isNurse = user.role.toLowerCase() === "nurse";

  const handleStartShift = async () => {
    await openShift(user.fullName, parseFloat(startingFloat));
    setIsStartShiftOpen(false);
  };

  const handleCloseShift = async () => {
    if (!declaredCash || isNaN(parseFloat(declaredCash))) {
      toast.error("Please enter a valid cash amount");
      return;
    }

    try {
      setIsClosingShift(true);
      const data = await closeShift(parseFloat(declaredCash));
      if (data?.summary) {
        setClosingSummary(data.summary);
        setIsCloseShiftOpen(false);
        setShowSummaryModal(true);

        // Attempt hardware thermal print
        const hwOk = await printThermalHardware(data.summary);
        if (!hwOk) {
          toast.info("Thermal printer bridge offline. You can print via browser or PDF.");
          // Trigger browser print preview automatically if thermal is unavailable
          setTimeout(() => {
            handleBrowserPrint();
          }, 350);
        }
      }
    } catch (e: any) {
      console.error("Failed to close shift:", e);
      toast.error(e?.message || "Failed to close shift");
    } finally {
      setIsClosingShift(false);
    }
  };

  const handlePOSClick = () => {
    if (!shift.isOpen) {
      toast.error("You must open a shift to access POS.");
      return;
    }
    router.push('/frontdesk/workspace');
  };

  const handleArrivalsClick = () => {
    if (!shift.isOpen) {
      if (isNurse) {
        toast.error("Please punch your fingerprint on the attendance scanner to start duty.");
      } else {
        toast.error("You must open a shift to access Doctor Arrivals.");
      }
      return;
    }
    router.push('/frontdesk/arrivals');
  };

  return (
    <div className="flex-1 p-8 h-[calc(100vh-56px)] overflow-y-auto animate-in fade-in relative">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isNurse ? "Nurse Station & Clinic Operations" : "Front Desk Dashboard"}
            </h1>
            
            {isNurse ? (
              <div className="mt-1 flex items-center gap-2">
                {shift.isOpen ? (
                  <>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 gap-1.5 py-0.5">
                      <Fingerprint className="w-3.5 h-3.5 text-emerald-600" /> On Duty · Biometric Verified
                    </Badge>
                    {shift.startedAt && (
                      <span className="text-xs text-muted-foreground">
                        Fingerprint clock-in at {new Date(shift.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 gap-1.5 py-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Off Duty · Biometric Scan Required
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Please punch your fingerprint on the attendance scanner to start duty
                    </span>
                  </>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground mt-1">
                {shift.isOpen ? `Shift started by ${shift.cashierName}` : "No active shift"}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isNurse && (
              <Button
                variant="outline"
                onClick={() => router.push('/frontdesk/doctor-share')}
                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold"
              >
                <Stethoscope className="w-4 h-4 mr-2 text-emerald-600" /> Release Doctor Fund
              </Button>
            )}
            {isNurse ? (
              <Button variant="outline" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" /> Log Out
              </Button>
            ) : (
              shift.isOpen ? (
                <Button variant="destructive" onClick={() => setIsCloseShiftOpen(true)}>
                  <LogOut className="w-4 h-4 mr-2" /> Close Shift
                </Button>
              ) : (
                <>
                  <Button variant="default" onClick={() => setIsStartShiftOpen(true)}>
                    <LogIn className="w-4 h-4 mr-2" /> Start Shift
                  </Button>
                  <Button variant="outline" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" /> Log Out
                  </Button>
                </>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {!isNurse && (
            <button 
              onClick={handlePOSClick}
              disabled={!shift.isOpen}
              className={`flex flex-col items-center justify-center gap-4 border-2 rounded-2xl p-6 transition-colors group text-center h-48 ${
                shift.isOpen 
                ? "bg-primary/10 border-primary/20 hover:bg-primary hover:text-primary-foreground text-primary" 
                : "bg-muted text-muted-foreground border-transparent opacity-50 cursor-not-allowed"
              }`}
            >
              <MonitorPlay className="w-10 h-10" />
              <div>
                <h2 className="text-lg font-bold">POS & Tokens</h2>
                <p className="opacity-80 text-xs mt-1">Access the main workspace</p>
              </div>
            </button>
          )}

          {!isNurse && (
            <button 
              onClick={() => router.push('/frontdesk/doctor-share')}
              className="flex flex-col items-center justify-center gap-4 bg-card border border-border hover:border-emerald-500 hover:text-emerald-600 text-foreground rounded-2xl p-6 transition-colors group text-center h-48"
            >
              <Stethoscope className="w-10 h-10 opacity-50 group-hover:opacity-100 group-hover:text-emerald-600 text-emerald-600" />
              <div>
                <h2 className="text-lg font-bold">Release Doctor Fund</h2>
                <p className="text-muted-foreground text-xs mt-1">Cash & bank payouts</p>
              </div>
            </button>
          )}

          {!isNurse && (
            <button 
              onClick={() => router.push('/frontdesk/cancellations')}
              className="flex flex-col items-center justify-center gap-4 bg-card border border-border hover:border-rose-500 hover:text-rose-600 text-foreground rounded-2xl p-6 transition-colors group text-center h-48 shadow-sm"
            >
              <RotateCcw className="w-10 h-10 opacity-60 group-hover:opacity-100 group-hover:text-rose-500 text-rose-500 transition-all" />
              <div>
                <h2 className="text-lg font-bold">Refund & Cancel</h2>
                <p className="text-muted-foreground text-xs mt-1">Manage cancellations & refunds</p>
              </div>
            </button>
          )}

          {!isNurse && (
            <button 
              onClick={() => router.push('/frontdesk/outsource-lab')}
              className="flex flex-col items-center justify-center gap-4 bg-card border border-border hover:border-cyan-500 hover:text-cyan-600 text-foreground rounded-2xl p-6 transition-colors group text-center h-48 shadow-sm"
            >
              <FlaskConical className="w-10 h-10 opacity-60 group-hover:opacity-100 group-hover:text-cyan-500 text-cyan-500 transition-all" />
              <div>
                <h2 className="text-lg font-bold">Outsource Lab</h2>
                <p className="text-muted-foreground text-xs mt-1">Send, receive & dispatch</p>
              </div>
            </button>
          )}

          {!isNurse && (
            <button 
              onClick={() => router.push('/frontdesk/inventory')}
              className="flex flex-col items-center justify-center gap-4 bg-card border border-border hover:border-secondary hover:text-secondary text-foreground rounded-2xl p-6 transition-colors group text-center h-48"
            >
              <Package className="w-10 h-10 opacity-50 group-hover:opacity-100" />
              <div>
                <h2 className="text-lg font-bold">Inventory</h2>
                <p className="text-muted-foreground text-xs mt-1">Manage pharmacy stock</p>
              </div>
            </button>
          )}

          <button 
            onClick={handleArrivalsClick}
            disabled={!shift.isOpen}
            className={`flex flex-col items-center justify-center gap-4 border rounded-2xl p-6 transition-colors group text-center h-48 ${
              !shift.isOpen 
              ? "bg-muted text-muted-foreground border-transparent opacity-50 cursor-not-allowed"
              : isNurse 
                ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground" 
                : "bg-card border-border hover:border-green-500 hover:text-green-600 text-foreground"
            }`}
          >
            <UserCheck className={`w-10 h-10 ${(!isNurse && shift.isOpen) ? "opacity-50 group-hover:opacity-100 group-hover:text-green-600" : ""}`} />
            <div>
              <h2 className="text-lg font-bold">{isNurse ? "Clinic Operations" : "Doctor Arrivals"}</h2>
              <p className="opacity-80 text-xs mt-1">{isNurse ? "Access arrivals and sessions" : "Mark daily attendance"}</p>
            </div>
          </button>

          {!isNurse && (
            <button 
              onClick={() => router.push('/frontdesk/rooms')}
              className="flex flex-col items-center justify-center gap-4 bg-card border border-border hover:border-purple-500 hover:text-purple-600 text-foreground rounded-2xl p-6 transition-colors group text-center h-48"
            >
              <MonitorPlay className="w-10 h-10 opacity-50 group-hover:opacity-100 group-hover:text-purple-600" />
              <div>
                <h2 className="text-lg font-bold">Live Room Matrix</h2>
                <p className="text-muted-foreground text-xs mt-1">Monitor all hospital rooms</p>
              </div>
            </button>
          )}

          {!isNurse && (
            <button 
              onClick={() => window.open('/frontdesk/customer-display', '_blank')}
              className="flex flex-col items-center justify-center gap-4 bg-card border border-border hover:border-amber-500 hover:text-amber-600 text-foreground rounded-2xl p-6 transition-colors group text-center h-48"
            >
              <Tv className="w-10 h-10 opacity-50 group-hover:opacity-100 group-hover:text-amber-600" />
              <div>
                <h2 className="text-lg font-bold">Patient Display</h2>
                <p className="text-muted-foreground text-xs mt-1">Launch 2nd screen status</p>
              </div>
            </button>
          )}

          <button 
            onClick={() => router.push('/frontdesk/hr')}
            className="flex flex-col items-center justify-center gap-4 bg-card border border-border hover:border-indigo-500 hover:text-indigo-600 text-foreground rounded-2xl p-6 transition-colors group text-center h-48"
          >
            <CalendarClock className="w-10 h-10 opacity-50 group-hover:opacity-100 group-hover:text-indigo-600" />
            <div>
              <h2 className="text-lg font-bold">HR Portal</h2>
              <p className="text-muted-foreground text-xs mt-1">Leaves & Attendance</p>
            </div>
          </button>

          <button 
            onClick={() => router.push('/frontdesk/settings')}
            className="flex flex-col items-center justify-center gap-4 bg-card border border-border hover:border-blue-500 hover:text-blue-600 text-foreground rounded-2xl p-6 transition-colors group text-center h-48"
          >
            <Settings className="w-10 h-10 opacity-50 group-hover:opacity-100 group-hover:text-blue-600" />
            <div>
              <h2 className="text-lg font-bold">Settings</h2>
              <p className="text-muted-foreground text-xs mt-1">Manage account</p>
            </div>
          </button>
        </div>
      </div>

      {/* Cashier/Receptionist Only Modals (Never shown to nurses who do not work with money) */}
      {!isNurse && (
        <>
          <Dialog open={isStartShiftOpen} onOpenChange={setIsStartShiftOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Open Shift</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Starting Float (LKR)</label>
                  <Input
                    type="number"
                    value={startingFloat}
                    onChange={(e) => setStartingFloat(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleStartShift}>Start Shift</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCloseShiftOpen} onOpenChange={setIsCloseShiftOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Close Shift & Settle Drawer</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Declared Cash Balance (LKR)</label>
                  <Input
                    type="number"
                    value={declaredCash}
                    onChange={(e) => setDeclaredCash(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Count the physical cash in the drawer and enter the total amount before generating settlement receipt.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCloseShiftOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleCloseShift} 
                  disabled={!declaredCash || isClosingShift}
                >
                  {isClosingShift ? "Settling Shift..." : "Close Shift & Print Receipt"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Shift Settlement Review & Reprint Dialog */}
          <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <DialogTitle>Shift Settlement Summary</DialogTitle>
                </div>
              </DialogHeader>

              {closingSummary && (
                <div className="space-y-4 py-2 text-sm">
                  {/* Cashier & Time Info */}
                  <div className="bg-muted/40 p-3 rounded-lg border text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cashier:</span>
                      <span className="font-semibold">{closingSummary.cashierName} ({closingSummary.cashierRole})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shift Ref:</span>
                      <span className="font-mono">{closingSummary.shiftRef || closingSummary.shiftId.slice(0, 8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shift Start:</span>
                      <span>{new Date(closingSummary.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shift Close:</span>
                      <span>{new Date(closingSummary.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-medium">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="text-primary">{closingSummary.durationFormatted}</span>
                    </div>
                  </div>

                  {/* Day & Shift Sales */}
                  <div className="border rounded-lg p-3 space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
                      Day & Shift Sales
                    </h4>
                    {closingSummary.todayHospitalTotalSales !== undefined && (
                      <div className="flex justify-between text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 p-1.5 rounded">
                        <span>Today Hospital Total Sales:</span>
                        <span>LKR {closingSummary.todayHospitalTotalSales.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-muted-foreground">Gross Shift Sales:</span>
                        <p className="font-semibold">LKR {closingSummary.grossSales.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cash Collections:</span>
                        <p className="font-semibold text-emerald-600">LKR {closingSummary.systemCashTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Card Collections:</span>
                        <p className="font-semibold">LKR {closingSummary.systemCardTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Invoices:</span>
                        <p className="font-semibold">{closingSummary.totalInvoices}</p>
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
                        variant={closingSummary.variance === 0 ? "outline" : closingSummary.variance > 0 ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {closingSummary.varianceStatus || (closingSummary.variance === 0 ? "BALANCED" : closingSummary.variance > 0 ? "SURPLUS" : "SHORTAGE")}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Starting Float:</span>
                        <span>LKR {closingSummary.startingFloat.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>(+) Cash Collected:</span>
                        <span>LKR {closingSummary.systemCashTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {closingSummary.cashRefundsTotal > 0 && (
                        <div className="flex justify-between text-destructive">
                          <span>(-) Cash Refunds:</span>
                          <span>- LKR {closingSummary.cashRefundsTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {(closingSummary.doctorCashDisbursed ?? 0) > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>(-) Doctor Cash Payouts:</span>
                          <span>- LKR {closingSummary.doctorCashDisbursed?.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-t pt-1">
                        <span>Expected Cash in Drawer:</span>
                        <span>LKR {closingSummary.expectedCash.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-bold text-primary">
                        <span>Declared Physical Cash:</span>
                        <span>LKR {closingSummary.declaredCash.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-dashed pt-1">
                        <span>Variance:</span>
                        <span className={closingSummary.variance === 0 ? "text-emerald-600" : closingSummary.variance > 0 ? "text-blue-600" : "text-destructive"}>
                          LKR {closingSummary.variance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Payments Breakdown */}
                  {closingSummary.doctorPayments && closingSummary.doctorPayments.length > 0 && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center border-b pb-1">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          Doctor Payments ({closingSummary.doctorPayments.length})
                        </h4>
                        <span className="text-xs font-bold text-primary">
                          Net Due: LKR {(closingSummary.totalDoctorPayments?.netDoctorPayment ?? closingSummary.totalDoctorPayments?.totalDoctorNetPayment ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {closingSummary.doctorPayments.map((dp, i) => (
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
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => closingSummary && printThermalHardware(closingSummary)}
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
                  onClick={logout}
                  className="gap-1.5"
                >
                  <LogOut className="w-4 h-4" /> Log Out
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Hidden React Print Template for 80mm Roll Receipt */}
          <div className="hidden">
            <ShiftSummaryReceipt ref={printRef} summary={closingSummary} user={user} />
          </div>
        </>
      )}
    </div>
  );
}
