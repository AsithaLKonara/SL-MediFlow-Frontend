"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Appointment {
  id: string;
  tokenNumber: string;
  status: string;
  Patient: { fullName: string; phone: string };
  User: { fullName: string; roomNumber?: string };
  appointmentDate: string;
}

export function ArrivalsPane() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/booking/appointments?date=${date}`);
      const result = await res.json();
      if (result.success) {
        setAppointments(result.data);
      }
    } catch (e) {
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [date]);

  const handleArrive = async (id: string) => {
    try {
      const res = await fetch(`${API}/booking/${id}/arrive`, {
        method: "PATCH",
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Patient marked as arrived. Invoice created for Cashier.");
        fetchAppointments(); // refresh
      } else {
        toast.error(result.error || "Failed to mark arrived");
      }
    } catch (e) {
      toast.error("Error connecting to server");
    }
  };

  return (
    <div className="flex-1 bg-background border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border bg-card flex justify-between items-center gap-4">
        <h3 className="font-medium whitespace-nowrap">Today's Appointments</h3>
        <div className="relative flex-1 max-w-[200px]">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            type="date" 
            className="pl-9 h-8 text-sm" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : appointments.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground text-sm">No appointments found for this date.</div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div key={apt.id} className="p-4 border border-border rounded-lg bg-card flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-primary">Token: {apt.tokenNumber}</h4>
                    <p className="text-sm font-medium">{apt.Patient.fullName} <span className="text-muted-foreground text-xs">({apt.Patient.phone})</span></p>
                    <p className="text-xs text-muted-foreground">
                      Dr. {apt.User?.fullName ?? 'Walk-in / Lab'}
                      {apt.User?.roomNumber && <span className="font-bold text-black dark:text-white ml-2 bg-secondary px-1.5 py-0.5 rounded">Room {apt.User.roomNumber}</span>}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    apt.status === "ARRIVED" ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"
                  }`}>
                    {apt.status}
                  </span>
                </div>

                {apt.status !== "ARRIVED" && (
                  <div className="pt-3 border-t border-border">
                    <Button size="sm" className="w-full bg-primary hover:bg-primary/90" onClick={() => handleArrive(apt.id)}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Arrived & Bill
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
