"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Calendar as CalendarIcon, User, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Doctor {
  id: string;
  fullName: string;
}

export function PhoneBookingPane() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [date, setDate] = useState("");
  
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");

  const [availability, setAvailability] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/api/booking/doctors")
      .then(r => r.json())
      .then(res => {
        if (res.success) setDoctors(res.data);
      })
      .catch(console.error);
  }, []);

  const checkAvailability = async () => {
    if (!selectedDocId || !date) return;
    setIsChecking(true);
    setAvailability(null);
    try {
      const res = await fetch(`http://localhost:5000/api/booking/availability?doctorId=${selectedDocId}&date=${date}`);
      const result = await res.json();
      if (result.success) {
        setAvailability(result.data);
      } else {
        toast.error(result.error);
      }
    } catch (e) {
      toast.error("Failed to check availability");
    } finally {
      setIsChecking(false);
    }
  };

  const handleBook = async () => {
    if (!phone || !fullName || !selectedDocId || !date) {
      toast.error("Please fill all fields");
      return;
    }

    setIsBooking(true);
    try {
      const res = await fetch("http://localhost:5000/api/booking/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, fullName, doctorId: selectedDocId, date })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Token booked successfully! Token No: ${result.data.tokenNumber}`);
        // Reset
        setPhone("");
        setFullName("");
        setDate("");
        setSelectedDocId("");
        setAvailability(null);
      } else {
        toast.error(result.error || "Failed to book");
      }
    } catch (e) {
      toast.error("Error booking token");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-auto">
      <div className="bg-background border border-border rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-muted-foreground text-sm">Patient Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="077..."
                className="pl-9 bg-card border-border"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="John Doe"
                className="pl-9 bg-card border-border"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background border border-border rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-muted-foreground text-sm">Doctor & Date</h3>
        
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Select Doctor</label>
          <select 
            className="w-full flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
          >
            <option value="">-- Choose Doctor --</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.fullName}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Appointment Date</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                className="pl-9 bg-card border-border"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <Button variant="secondary" onClick={checkAvailability} disabled={!selectedDocId || !date || isChecking}>
              {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {availability && (
          <div className={`p-4 rounded-lg border ${availability.available ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'}`}>
            {availability.available ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-primary">Doctor is Available!</p>
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>Slots Booked: {availability.bookedSlots} / {availability.totalSlots}</span>
                  <span>Your Token: <strong>{availability.nextToken}</strong></span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Time: {availability.startTime} - {availability.endTime}
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium text-destructive">{availability.reason || "No slots available."}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto">
        <Button 
          className="w-full h-12 text-lg bg-secondary hover:bg-secondary/90" 
          onClick={handleBook}
          disabled={!availability?.available || isBooking}
        >
          {isBooking ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Phone className="w-5 h-5 mr-2" />}
          Book Phone Token
        </Button>
      </div>
    </div>
  );
}
