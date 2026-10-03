"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Calendar as CalendarIcon, User, Search, Loader2, PlusCircle, SendToBack, Send } from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import { useRxToPOS } from "../hooks/useCartSync";

interface Doctor {
  id: string;
  fullName: string;
  specialty?: string;
  roomNumber?: string;
  consultationFee?: number;
  feeType?: string;
}

export function PhoneBookingPane() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [date, setDate] = useState("");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientLookupResult, setPatientLookupResult] = useState<{found: boolean; message: string} | null>(null);
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);

  const [availability, setAvailability] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const [dates, setDates] = useState<any[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);

  const [selectedTokenNumber, setSelectedTokenNumber] = useState<number | null>(null);

  const [todayBookings, setTodayBookings] = useState<any[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const { sendAppointmentToPOS } = useRxToPOS();

  const API = process.env.NEXT_PUBLIC_API_URL;
  const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : "http://localhost:5000";

  // Establish socket connection once
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Listen for real-time availability updates
  useEffect(() => {
    if (!socketRef.current || !selectedDocId || !date) return;
    
    const room = `doctor_${selectedDocId}_${date}`;
    socketRef.current.emit("join", room);

    const handleUpdate = (newAvailability: any) => {
      setAvailability(newAvailability);
      // If the currently selected token just got booked, deselect it
      if (selectedTokenNumber) {
        const token = newAvailability.tokens?.find((t: any) => t.tokenNumber === selectedTokenNumber);
        if (token && token.status !== "AVAILABLE") {
          setSelectedTokenNumber(null);
          toast.warning("The token you had selected was just booked by someone else!");
        }
      }
    };

    socketRef.current.on("availability_updated", handleUpdate);

    return () => {
      socketRef.current?.emit("leave", room);
      socketRef.current?.off("availability_updated", handleUpdate);
    };
  }, [selectedDocId, date, selectedTokenNumber]);

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

  const fetchTodayBookings = async () => {
    try {
      const res = await fetch(`${API}/booking/appointments`);
      const data = await res.json();
      if (data.success) {
        // Filter for today's PHONE bookings that are not completed/cancelled
        const todayPhone = data.data.filter((a: any) => a.bookingType === 'PHONE' && a.status === 'BOOKED');
        setTodayBookings(todayPhone);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTodayBookings();
  }, []);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        setPatientPhone(searchQuery); // auto-sync with phone
        fetch(`${API}/reception/patients?q=${searchQuery}`)
          .then(r => r.json())
          .then(data => {
            if (data.success && data.data.length > 0) {
              setPatientSearchResults(data.data);
              setIsPatientSearchOpen(true);
              setPatientLookupResult({ found: true, message: `${data.data.length} match(es) found.` });
            } else {
              setPatientSearchResults([]);
              setIsPatientSearchOpen(true);
              setPatientLookupResult({ found: false, message: "No match found. Fill in details to register new patient." });
            }
          })
          .catch(console.error);
      } else {
        setPatientPhone(searchQuery);
        setPatientSearchResults([]);
        setIsPatientSearchOpen(false);
        setPatientLookupResult(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectPatient = (p: any) => {
    setPatientName(p.fullName);
    setPatientPhone(p.phone);
    setPatientAge(p.ageFallback?.toString() || "");
    setSearchQuery(p.phone);
    setIsPatientSearchOpen(false);
    setPatientLookupResult({ found: true, message: `Patient selected: ${p.fullName}` });
  };

  const handleBook = async () => {
    if (!patientPhone || !patientName || !selectedDocId || !date) {
      toast.error("Please fill all fields");
      return;
    }

    setIsBooking(true);
    try {
      const res = await fetch(`${API}/booking/phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: patientPhone, 
          fullName: patientName, 
          ageFallback: patientAge ? parseInt(patientAge, 10) : undefined,
          doctorId: selectedDocId, 
          date,
          tokenNumber: selectedTokenNumber
        })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Token booked successfully! Token No: ${result.data.tokenNumber}`);
        // Reset — also clear dates to avoid stale tiles showing on next selection
        setSearchQuery("");
        setPatientName("");
        setPatientPhone("");
        setPatientAge("");
        setPatientLookupResult(null);
        setDate("");
        setSelectedDocId("");
        setAvailability(null);
        setDates([]);
        setSelectedTokenNumber(null);
        fetchTodayBookings();
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
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 pb-2">
        <div className="bg-background border border-border rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-muted-foreground text-sm">Patient Lookup</h3>
        <div className="flex gap-2">
          <div className="relative flex-1" onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsPatientSearchOpen(false);
            }
          }}>
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone number..."
              className="pl-9 bg-card border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchQuery.length >= 3) setIsPatientSearchOpen(true) }}
            />
            {isPatientSearchOpen && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                {patientSearchResults.length > 0 ? (
                  <ul className="py-1">
                    {patientSearchResults.map((p) => (
                      <li
                        key={p.id}
                        className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onMouseDown={(e) => { e.preventDefault(); selectPatient(p); }}
                      >
                        <div className="font-semibold">{p.fullName}</div>
                        <div className="text-xs text-muted-foreground">{p.phone} • {p.ageFallback ? `${p.ageFallback} yrs` : "No age"}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground italic">
                    No matches found. Quick register instead.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {patientLookupResult && (
          <p className={`text-xs mt-1 ${patientLookupResult.found ? 'text-green-500' : 'text-yellow-500'}`}>
            {patientLookupResult.message}
          </p>
        )}

        {/* Quick Registration Form */}
        <div className="pt-2 border-t border-border mt-2 space-y-4">
          <h3 className="font-medium text-muted-foreground text-sm flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Quick Register (Optional)
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Full Name</label>
              <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="John Doe" className="bg-card border-border" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Age</label>
              <Input type="number" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} placeholder="45" className="bg-card border-border" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phone (For SMS)</label>
              <Input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="077..." className="bg-card border-border" />
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
              <option key={d.id} value={d.id}>
                {d.fullName} {d.specialty ? `(${d.specialty})` : ''} {d.roomNumber ? `[Room ${d.roomNumber}]` : ''} {(d as any).isArrived ? '(Arrived)' : ''}
              </option>
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
                    t.status !== "AVAILABLE" ? 'bg-destructive/10 text-destructive border border-destructive/20 cursor-not-allowed' : 
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
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button 
          className="w-full h-12 text-lg bg-secondary hover:bg-secondary/90" 
          onClick={handleBook}
          disabled={!availability?.available || isBooking || !selectedDocId || !date || (!selectedTokenNumber && availability?.tokens?.length > 0)}
        >
          {isBooking ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Phone className="w-5 h-5 mr-2" />}
          Book Phone Token
        </Button>
      </div>

      {/* Today's Phone Bookings List */}
      <div className="mt-6">
        <h3 className="font-medium text-sm mb-3">Today's Phone Bookings</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {todayBookings.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center p-4 border rounded-lg bg-card">No pending phone bookings for today.</p>
          ) : (
            todayBookings.map((appt) => (
              <div key={appt.id} className="p-3 border rounded-lg bg-card hover:border-primary/50 transition-colors flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{appt.patientName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Token #{appt.tokenNumber} • Dr. {appt.doctorName}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="bg-primary/10 text-primary hover:bg-primary/20"
                  onClick={() => {
                    const docInfo = doctors.find(d => d.fullName === appt.doctorName);
                    sendAppointmentToPOS({
                      appointmentId: appt.id,
                      tokenNumber: appt.tokenNumber,
                      patientName: appt.patientName,
                      doctorName: appt.doctorName,
                      fee: docInfo?.consultationFee || 2500, // Fallback if missing
                      isUpfront: docInfo?.feeType === 'UPFRONT'
                    });
                    toast.success("Sent to POS for checkout.");
                  }}
                >
                  <Send className="w-4 h-4 mr-2" /> Checkout
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
