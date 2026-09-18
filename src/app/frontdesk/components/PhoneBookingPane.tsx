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

  const [dates, setDates] = useState<any[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);

  const [selectedTokenNumber, setSelectedTokenNumber] = useState<number | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    fetch(`${API}/booking/doctors`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setDoctors(res.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedDocId) {
      setDates([]);
      setDate("");
      setAvailability(null);
      setSelectedTokenNumber(null);
      return;
    }
    
    setIsLoadingDates(true);
    fetch(`${API}/booking/available-dates?doctorId=${selectedDocId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setDates(res.data);
          if (res.data.length > 0) {
            handleDateSelect(res.data[0]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingDates(false));
  }, [selectedDocId]);

  const handleDateSelect = async (d: any) => {
    setDate(d.date);
    setSelectedTokenNumber(null);
    setAvailability(null);
    
    // Fetch precise availability with token grid
    try {
      const res = await fetch(`${API}/booking/availability?doctorId=${selectedDocId}&date=${d.date}`);
      const result = await res.json();
      if (result.success) {
        setAvailability(result.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePhoneSearch = async () => {
    if (!phone || phone.length < 9) return;
    try {
      const res = await fetch(`${API}/reception/patients?q=${phone}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setFullName(data.data[0].fullName);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBook = async () => {
    if (!phone || !fullName || !selectedDocId || !date) {
      toast.error("Please fill all fields");
      return;
    }

    setIsBooking(true);
    try {
      const res = await fetch(`${API}/booking/phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone, 
          fullName, 
          doctorId: selectedDocId, 
          date,
          tokenNumber: selectedTokenNumber
        })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Token booked successfully! Token No: ${result.data.tokenNumber}`);
        // Reset — also clear dates to avoid stale tiles showing on next selection
        setPhone("");
        setFullName("");
        setDate("");
        setSelectedDocId("");
        setAvailability(null);
        setDates([]);
        setSelectedTokenNumber(null);
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
        <h3 className="font-medium text-muted-foreground text-sm">Patient Lookup</h3>
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
                onBlur={handlePhoneSearch}
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

        {selectedDocId && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Available Dates</label>
            {isLoadingDates ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking availability...
              </div>
            ) : dates.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {dates.map((d) => (
                  <button
                    key={d.date}
                    onClick={() => handleDateSelect(d)}
                    className={`flex-shrink-0 w-28 p-2 border rounded-lg text-left transition-colors ${
                      date === d.date ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-card hover:border-secondary'
                    }`}
                  >
                    <div className="text-xs font-semibold">{new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-sm font-bold">{new Date(d.date).getDate()} {new Date(d.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{d.availableSlots} slots left</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-destructive">No available dates found for this doctor.</div>
            )}
          </div>
        )}

        {availability && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Available Tokens</label>
            <div className="grid grid-cols-8 gap-2">
              {availability.tokens?.map((t: any) => (
                <button
                  key={t.tokenNumber}
                  disabled={t.status !== "AVAILABLE"}
                  onClick={() => setSelectedTokenNumber(t.tokenNumber)}
                  className={`h-10 rounded-md text-sm font-medium transition-colors ${
                    t.status !== "AVAILABLE" ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50' : 
                    selectedTokenNumber === t.tokenNumber ? 'bg-primary text-primary-foreground' : 'bg-card border hover:border-primary'
                  }`}
                >
                  {t.tokenNumber.toString().padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
        )}

        {availability && (
          <div className={`p-4 rounded-lg border ${availability.available ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'}`}>
            {availability.available ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-primary">Doctor is Available!</p>
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>Slots Booked: {availability.bookedSlots} / {availability.totalSlots}</span>
                  {selectedTokenNumber && <span>Selected: <strong>#{selectedTokenNumber}</strong></span>}
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
          disabled={!availability?.available || isBooking || !selectedDocId || !date || (!selectedTokenNumber && availability?.tokens?.length > 0)}
        >
          {isBooking ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Phone className="w-5 h-5 mr-2" />}
          Book Phone Token
        </Button>
      </div>
    </div>
  );
}
