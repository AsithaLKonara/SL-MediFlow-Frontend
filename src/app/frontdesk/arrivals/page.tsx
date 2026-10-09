"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { Lock, Unlock } from "lucide-react";

import { DoctorSelector } from "./components/DoctorSelector";
import { OperationalWorkspace } from "./components/workspace/OperationalWorkspace";

// Shared types
export interface DoctorStatus {
  id: string;
  fullName: string;
  specialty?: string;
  roomNumber?: string;
  attendance?: any;
  sessions?: any[];
}

export default function EnhancedDoctorArrivalsPage() {
  const { token } = useAuth();

  const router = useRouter();
  const [doctors, setDoctors] = useState<DoctorStatus[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const isNurse = user?.role?.toLowerCase() === "nurse";
  
  const [assignedDoctorId, setAssignedDoctorId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`assignedDoctorId_${user.id}`);
      if (saved) setAssignedDoctorId(saved);
    }
  }, [user?.id]);

  const handleAssignNurse = () => {

    if (selectedDoctorId && user?.id) {
      localStorage.setItem(`assignedDoctorId_${user.id}`, selectedDoctorId);
      setAssignedDoctorId(selectedDoctorId);
    }
  };

  const handleUnassignNurse = () => {
    if (user?.id) {
      localStorage.removeItem(`assignedDoctorId_${user.id}`);
      setAssignedDoctorId(null);
    }
  };

  // We are currently using mock data or the real API if available
  useEffect(() => {
    fetchDoctors();
  }, [selectedDate]);

  const fetchDoctors = async (silent = false) => {
    try {
      // Format date to local YYYY-MM-DD to avoid UTC timezone off-by-one errors
      const formattedDate = new Date(selectedDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
        .split('T')[0];

      if (!silent) setIsLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/doctors/status?date=${formattedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API Error ${res.status}: ${errText || res.statusText}`);
      }
      const data = await res.json();
      setDoctors(data);
      if (data.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(data[0].id);
      }
    } catch (err: any) {
      console.error("API Failure:", err.message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // If nurse is assigned, they only see that doctor
  const displayedDoctors = isNurse && assignedDoctorId 
    ? doctors.filter(d => d.id === assignedDoctorId) 
    : doctors;

  const selectedDoctor = displayedDoctors.find(d => d.id === selectedDoctorId) || displayedDoctors[0];

  // Effect to sync selected if locked
  useEffect(() => {
    if (isNurse && assignedDoctorId && selectedDoctorId !== assignedDoctorId) {
      setSelectedDoctorId(assignedDoctorId);
    }
  }, [isNurse, assignedDoctorId, selectedDoctorId]);

  return (
    <div className="flex-1 p-6 h-[calc(100vh-56px)] overflow-y-auto bg-background animate-in fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header & Navigation */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/frontdesk")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clinic Operations</h1>
            <p className="text-muted-foreground text-sm">Manage doctor arrivals, schedules, and tokens.</p>
          </div>
        </div>

        {/* Row 1: Doctor Control & High-Level Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <DoctorSelector 
              doctors={displayedDoctors} 
              selectedId={selectedDoctor?.id || null} 
              onSelect={setSelectedDoctorId} 
            />
            {isNurse && (
              assignedDoctorId ? (
                <Button variant="outline" size="sm" onClick={handleUnassignNurse} className="gap-2 text-destructive">
                  <Lock className="w-4 h-4" /> Unassign
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleAssignNurse} className="gap-2 text-primary" disabled={!selectedDoctorId}>
                  <Unlock className="w-4 h-4" /> Assign Myself
                </Button>
              )
            )}
          </div>
          <Button 
            variant="outline" 
            className="w-full md:w-auto bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 gap-2 font-medium"
            onClick={() => window.open('/frontdesk/customer-display', '_blank')}
          >
            <MonitorPlay className="w-4 h-4 text-primary" />
            Launch Customer Display
          </Button>
        </div>

        {/* Main Operational Workspace */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : selectedDoctor ? (
          <OperationalWorkspace 
            doctor={selectedDoctor} 
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onRefresh={() => fetchDoctors(true)}
          />
        ) : (
          <div className="text-center p-12 bg-muted/20 rounded-xl border border-border border-dashed">
            <p className="text-muted-foreground">Select a doctor to view their workspace.</p>
          </div>
        )}
      </div>
    </div>
  );
}
