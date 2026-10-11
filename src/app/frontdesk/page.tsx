"use client";

import { useShift } from "./hooks/useShift";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { MonitorPlay, Package, LogOut, UserCheck, Settings, Tv, CalendarClock, LogIn, Fingerprint, Clock, CheckCircle2 } from "lucide-react";
import { NodePrintClient } from "@asithakonara/node-print-client";
import { EscPosBuilder } from "@asithakonara/escpos";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function FrontDeskDashboard() {
  const { shift, isLoaded, openShift, closeShift } = useShift();
  const { user, logout } = useAuth();
  const [startingFloat, setStartingFloat] = useState("0");
  const [declaredCash, setDeclaredCash] = useState("");
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const router = useRouter();

  if (!isLoaded || !user) return null;

  const isNurse = user.role.toLowerCase() === "nurse";

  const handleStartShift = async () => {
    await openShift(user.fullName, parseFloat(startingFloat));
    setIsStartShiftOpen(false);
  };

  const handleCloseShift = async () => {
    const data = await closeShift(parseFloat(declaredCash));
    if (data?.summary) {
      try {
        const client = new NodePrintClient({ url: "http://127.0.0.1:18181" });
        const builder = new EscPosBuilder();
        builder
            .align("center")
            .bold(true)
            .text("AMAZ HOSPITAL")
            .text("SHIFT SUMMARY")
            .bold(false)
            .text("------------------------")
            .align("left")
            .text(`Date: ${new Date().toLocaleDateString()}`)
            .text(`Cashier: ${user.fullName}`)
            .text("------------------------")
            .text(`System Cash: LKR ${data.summary.systemCashTotal.toFixed(2)}`)
            .text(`System Card: LKR ${data.summary.systemCardTotal.toFixed(2)}`)
            .text(`Declared Cash: LKR ${data.summary.declaredCash.toFixed(2)}`)
            .text(`Variance: LKR ${data.summary.variance.toFixed(2)}`)
            .text("------------------------")
            .feed(3)
            .cut();
            
        await client.print({ type: "escpos", data: builder.build().toString('base64') });
      } catch (e) {
        console.error("Failed to print receipt", e);
        toast.error("Failed to print receipt, but shift was closed.");
      }
      setIsCloseShiftOpen(false);
      // Log out directly after closing shift
      logout();
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

          <div className="flex gap-3">
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
                <DialogTitle>Close Shift & Logout</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Declared Cash Balance (LKR)</label>
                  <Input
                    type="number"
                    value={declaredCash}
                    onChange={(e) => setDeclaredCash(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Count the physical cash in the drawer and enter the total.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="destructive" onClick={handleCloseShift} disabled={!declaredCash}>
                  Close Shift & Log Out
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
