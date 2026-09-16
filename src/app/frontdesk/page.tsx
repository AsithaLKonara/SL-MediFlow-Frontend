"use client";

import { useShift } from "./hooks/useShift";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MonitorPlay, Package, LogOut } from "lucide-react";

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button 
            onClick={() => router.push('/frontdesk/workspace')}
            className="flex flex-col items-center justify-center gap-4 bg-primary/10 border-2 border-primary/20 hover:bg-primary hover:text-primary-foreground text-primary rounded-2xl p-8 transition-colors group text-left h-48"
          >
            <MonitorPlay className="w-12 h-12" />
            <div className="text-center">
              <h2 className="text-xl font-bold">POS & Tokens</h2>
              <p className="opacity-80 text-sm mt-1">Access the main workspace</p>
            </div>
          </button>

          <button 
            onClick={() => router.push('/frontdesk/inventory')}
            className="flex flex-col items-center justify-center gap-4 bg-card border border-border hover:border-secondary hover:text-secondary text-foreground rounded-2xl p-8 transition-colors group text-left h-48"
          >
            <Package className="w-12 h-12 opacity-50 group-hover:opacity-100" />
            <div className="text-center">
              <h2 className="text-xl font-bold">Inventory</h2>
              <p className="text-muted-foreground text-sm mt-1">Manage pharmacy stock</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
