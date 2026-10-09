"use client";

import { useShift } from "./hooks/useShift";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MonitorPlay, Package, LogOut, UserCheck, Settings, Tv, Building2 } from "lucide-react";

export default function FrontDeskDashboard() {
  const { shift, isLoaded, openShift, closeShift } = useShift();
  const [cashierName, setCashierName] = useState("");
  const [startingFloat, setStartingFloat] = useState("0");
  const router = useRouter();

  if (!isLoaded) return null;

  if (!shift.isOpen) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-56px)] bg-muted/20">
        <div className="bg-card border border-border p-8 rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95">
          <h1 className="text-2xl font-bold mb-6 text-center text-primary">Open Shift</h1>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Cashier Name</label>
              <Input value={cashierName} onChange={e => setCashierName(e.target.value)} placeholder="e.g. Jane Doe" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Starting Float (LKR)</label>
              <Input type="number" value={startingFloat} onChange={e => setStartingFloat(e.target.value)} />
            </div>
            <Button 
              className="w-full h-12 text-lg mt-4" 
              onClick={() => openShift(cashierName, parseFloat(startingFloat))}
              disabled={!cashierName}
            >
              Start Shift
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 h-[calc(100vh-56px)] overflow-y-auto animate-in fade-in">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Front Desk Dashboard</h1>
            <p className="text-muted-foreground mt-1">Shift started by {shift.cashierName}</p>
          </div>
          <Button variant="destructive" onClick={closeShift}>
            <LogOut className="w-4 h-4 mr-2" /> Close Shift
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <button 
            onClick={() => router.push('/frontdesk/workspace')}
            className="flex flex-col items-center justify-center gap-4 bg-primary/10 border-2 border-primary/20 hover:bg-primary hover:text-primary-foreground text-primary rounded-2xl p-6 transition-colors group text-center h-48"
          >
            <MonitorPlay className="w-10 h-10" />
            <div>
              <h2 className="text-lg font-bold">POS & Tokens</h2>
              <p className="opacity-80 text-xs mt-1">Access the main workspace</p>
            </div>
          </button>

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

          <button 
            onClick={() => router.push('/frontdesk/arrivals')}
            className="flex flex-col items-center justify-center gap-4 bg-card border border-border hover:border-green-500 hover:text-green-600 text-foreground rounded-2xl p-6 transition-colors group text-center h-48"
          >
            <UserCheck className="w-10 h-10 opacity-50 group-hover:opacity-100 group-hover:text-green-600" />
            <div>
              <h2 className="text-lg font-bold">Doctor Arrivals</h2>
              <p className="text-muted-foreground text-xs mt-1">Mark daily attendance</p>
            </div>
          </button>

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

          <button 
            onClick={() => router.push('/frontdesk/rooms')}
            className="flex flex-col items-center justify-center gap-4 bg-card border border-border hover:border-purple-500 hover:text-purple-600 text-foreground rounded-2xl p-6 transition-colors group text-center h-48"
          >
            <Building2 className="w-10 h-10 opacity-50 group-hover:opacity-100 group-hover:text-purple-600" />
            <div>
              <h2 className="text-lg font-bold">Room Mgmt</h2>
              <p className="text-muted-foreground text-xs mt-1">Manage physical rooms</p>
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
    </div>
  );
}
