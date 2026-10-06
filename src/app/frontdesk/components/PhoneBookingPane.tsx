"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Calendar as CalendarIcon, User, Search, Loader2, PlusCircle, SendToBack, Send, UserRound, Stethoscope, FlaskConical, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import { useRxToPOS } from "../hooks/useCartSync";
import { useAuth } from "@/components/providers/AuthProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EnhancedCalendar } from "@/app/frontdesk/arrivals/components/workspace/left-panel/EnhancedCalendar";

interface Doctor {
  id: string;
  fullName: string;
  specialty?: string;
  roomNumber?: string;
  consultationFee?: number;
  feeType?: string;
}

export function PhoneBookingPane() {
  const { token } = useAuth();

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`
      }
    });
  }, [token]);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [labCatalog, setLabCatalog] = useState<any[]>([]);
  const [extraServicesCatalog, setExtraServicesCatalog] = useState<any[]>([]);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [customLabPrices, setCustomLabPrices] = useState<Record<string, number>>({});
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [customServicePrices, setCustomServicePrices] = useState<Record<string, number>>({});

  const [selectedDocToken, setSelectedDocToken] = useState<number | null>(null);
  const [docTokens, setDocTokens] = useState<any[]>([]);
  const [selectedLabToken, setSelectedLabToken] = useState<number | null>(null);
  const [labTokens, setLabTokens] = useState<any[]>([]);
  const [selectedServiceToken, setSelectedServiceToken] = useState<number | null>(null);
  const [serviceTokens, setServiceTokens] = useState<any[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientLookupResult, setPatientLookupResult] = useState<{found: boolean; message: string} | null>(null);
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);

  const [isBooking, setIsBooking] = useState(false);
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [bookingSearchQuery, setBookingSearchQuery] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const { sendAppointmentToPOS } = useRxToPOS();

  const API = process.env.NEXT_PUBLIC_API_URL;
  const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace("/api", "") : "http://localhost:5000";

  
  const [calendarData, setCalendarData] = useState<any>(null);
  const fetchCalendarData = useCallback(() => {
    if (!selectedDocId) return;
    const monthStr = selectedDate.substring(0, 7);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    apiFetch(`${apiUrl}/frontdesk/doctors/${selectedDocId}/calendar?month=${monthStr}`)
      .then(r => r.json())
      .then(res => setCalendarData(res))
      .catch(console.error);
  }, [selectedDocId, selectedDate, apiFetch]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const fetchDocTokens = useCallback(() => {
    if (!selectedDocId) return;
    apiFetch(`${API}/booking/availability?doctorId=${selectedDocId}&date=${selectedDate}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setDocTokens(res.data.tokens || []);
      })
      .catch(console.error);
  }, [selectedDocId, selectedDate, API, apiFetch]);

  const fetchLabTokens = useCallback(() => {
    if (!selectedTestIds.size) return;
    apiFetch(`${API}/booking/department-availability?department=LAB&date=${selectedDate}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setLabTokens(res.data.tokens || []);
      })
      .catch(console.error);
  }, [selectedTestIds.size, selectedDate, API, apiFetch]);

  const fetchServiceTokens = useCallback(() => {
    if (!selectedServiceIds.size) return;
    apiFetch(`${API}/booking/department-availability?department=EXTRA_SERVICE&date=${selectedDate}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setServiceTokens(res.data.tokens || []);
      })
      .catch(console.error);
  }, [selectedServiceIds.size, selectedDate, API, apiFetch]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    const refreshAll = () => {
      if (selectedDocId) fetchDocTokens();
      if (selectedTestIds.size > 0) fetchLabTokens();
      if (selectedServiceIds.size > 0) fetchServiceTokens();
    };
    socketRef.current.on("connect", refreshAll);
    socketRef.current.on("TOKEN_STATUS_UPDATED", refreshAll);
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [selectedDocId, selectedTestIds.size, selectedServiceIds.size, fetchDocTokens, fetchLabTokens, fetchServiceTokens, selectedDate, SOCKET_URL]);

  useEffect(() => {
    Promise.all([
      apiFetch(`${API}/booking/doctors`).then(r => r.json()),
      apiFetch(`${API}/lab/catalog`).then(r => r.json()),
      apiFetch(`${API}/extra-services`).then(r => r.json())
    ]).then(([docRes, labRes, svcRes]) => {
      if (docRes.success) setDoctors(docRes.data);
      if (Array.isArray(labRes)) setLabCatalog(labRes);
      if (Array.isArray(svcRes)) setExtraServicesCatalog(svcRes);
    }).catch(console.error);
  }, [API, apiFetch]);

  useEffect(() => {
    if (!selectedDocId) {
      setDocTokens([]);
      setSelectedDocToken(null);
      return;
    }
    fetchDocTokens();
  }, [selectedDocId, fetchDocTokens, selectedDate]);

  useEffect(() => {
    if (selectedTestIds.size === 0) {
      setLabTokens([]);
      setSelectedLabToken(null);
      return;
    }
    fetchLabTokens();
  }, [selectedTestIds.size, fetchLabTokens, selectedDate]);

  useEffect(() => {
    if (selectedServiceIds.size === 0) {
      setServiceTokens([]);
      setSelectedServiceToken(null);
      return;
    }
    fetchServiceTokens();
  }, [selectedServiceIds.size, fetchServiceTokens, selectedDate]);

  const fetchTodayBookings = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/booking/appointments`);
      const data = await res.json();
      if (data.success) {
        // Group by booking reference to avoid showing multiple rows for the same phone booking
        const todayPhone = data.data.filter((a: any) => a.bookingType === "PHONE" && a.status === "BOOKED");
        
        // Pick primary token per booking (Doctor preferred)
        const uniqueBookings: any[] = [];
        const seenRefs = new Set();
        for (const appt of todayPhone) {
          const ref = appt.bookingReference || appt.id;
          if (!seenRefs.has(ref)) {
             // Find all for this ref
             const group = todayPhone.filter((a: any) => (a.bookingReference || a.id) === ref);
             const primary = group.find((a: any) => a.department === "CONSULTATION") || group[0];
             uniqueBookings.push(primary);
             seenRefs.add(ref);
          }
        }
        setTodayBookings(uniqueBookings);
      }
    } catch (e) {
      console.error(e);
    }
  }, [API, apiFetch]);

  useEffect(() => {
    fetchTodayBookings();
  }, [fetchTodayBookings]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        setPatientPhone(searchQuery);
        apiFetch(`${API}/reception/patients?q=${searchQuery}`)
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
  }, [searchQuery, API, apiFetch]);

  const selectPatient = (p: any) => {
    setPatientName(p.fullName);
    setPatientPhone(p.phone);
    setPatientAge(p.ageFallback?.toString() || "");
    setSearchQuery(p.phone);
    setIsPatientSearchOpen(false);
    setPatientLookupResult({ found: true, message: `Patient selected: ${p.fullName}` });
  };

  const handleBook = async () => {
    if (!patientPhone || !patientName || (!selectedDocId && selectedTestIds.size === 0 && selectedServiceIds.size === 0) || !selectedDate) {
      toast.error("Please fill all fields and select a service");
      return;
    }

    setIsBooking(true);
    try {
      const selectedDoc = doctors.find(d => d.id === selectedDocId);
      
      const tests = Array.from(selectedTestIds).map(testId => {
        const test = labCatalog.find(t => t.id === testId);
        const price = customLabPrices[testId] !== undefined ? customLabPrices[testId] : (test?.price || 0);
        return { id: testId, name: test?.name || "Lab Test", price };
      });
  
      const services = Array.from(selectedServiceIds).map(svcId => {
        const svc = extraServicesCatalog.find(s => s.id === svcId);
        const price = customServicePrices[svcId] !== undefined ? customServicePrices[svcId] : (svc?.price || 0);
        return { id: svcId, name: svc?.title || "Extra Service", price };
      });

      const payload = {
        bookingType: "PHONE",
        patientName: patientName || "Phone Booking",
        patientPhone,
        ageFallback: patientAge ? parseInt(patientAge, 10) : undefined,
        doctorId: selectedDocId,
        doctorName: selectedDoc?.fullName,
        doctorTokenNumber: selectedDocToken || undefined,
        tests,
        testIds: Array.from(selectedTestIds),
        customLabPrices,
        labTokenNumber: selectedLabToken || undefined,
        services,
        serviceIds: Array.from(selectedServiceIds),
        customServicePrices,
        serviceTokenNumber: selectedServiceToken || undefined,
        date: selectedDate
      };

      const res = await apiFetch(`${API}/reception/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Tokens booked successfully!`);
        setSearchQuery("");
        setPatientName("");
        setPatientPhone("");
        setPatientAge("");
        setPatientLookupResult(null);
        setSelectedDate(new Date().toISOString().split("T")[0]);
        setSelectedDocId(null);
        setSelectedTestIds(new Set());
        setSelectedServiceIds(new Set());
        setSelectedDocToken(null);
        setSelectedLabToken(null);
        setSelectedServiceToken(null);
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
          <p className={`text-xs mt-1 ${patientLookupResult.found ? "text-green-500" : "text-yellow-500"}`}>
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

      <div className="flex-1 bg-background border border-border rounded-lg flex flex-col overflow-hidden p-4 gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-muted-foreground text-sm">Issue Token</h3>
            
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Select Doctor Tile */}
            <Dialog>
              <DialogTrigger className="flex flex-col items-center justify-center p-6 border rounded-xl bg-card hover:border-primary/50 transition-colors gap-3 group outline-none">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Stethoscope className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-foreground">Select Doctor</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedDocId
                      ? doctors.find(d => d.id === selectedDocId)?.fullName
                      : "Assign a doctor"}
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-xl">Select Doctor</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2 overflow-y-auto p-2 flex-1 min-h-0">
                  {doctors.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id === selectedDocId ? null : doc.id)}
                      className={`w-full p-4 border rounded-lg transition-colors flex items-center justify-between gap-4 outline-none text-left ${selectedDocId === doc.id ? "border-primary ring-1 ring-primary bg-primary/5" : "bg-card border-border hover:border-secondary"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedDocId === doc.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                          <UserRound className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-base">{doc.fullName}</span>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{doc.specialty || "Consultation"}</span>
                            <span>•</span>
                            <span className="font-medium text-foreground">Rs. {doc.consultationFee || 2500}</span>
                            <span>•</span>
                            <span className="text-xs uppercase tracking-wider">{doc.feeType === "UPFRONT" ? "Upfront Pay" : "Post Pay"}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedDocId && (
                  <div className="mt-2 p-4 border-t border-border bg-card flex flex-col gap-3 shrink-0 h-[350px]">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm">Schedule & Tokens</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden min-h-[250px]">
                      {/* Left Column: Calendar */}
                      <div className="border rounded-md flex flex-col overflow-hidden bg-card p-3">
                        <EnhancedCalendar 
                          selectedDate={new Date(selectedDate)} 
                          onDateSelect={(d) => {
                            const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                            setSelectedDate(localDate);
                          }}
                          calendarData={selectedDocId ? calendarData : null} 
                        />
                      </div>

                      {/* Right Column: Matrix */}
                      <div className="border rounded-md flex flex-col overflow-hidden bg-muted/10">
                        <div className="p-2 border-b bg-muted/50 font-medium text-xs text-muted-foreground">Select Token</div>
                        <ScrollArea className="flex-1 p-2">
                          <div className="grid grid-cols-5 gap-2">
                            {docTokens.map(t => {
                              const isBooked = t.status !== "AVAILABLE";
                              let bgClass = isBooked ? "bg-red-50 text-red-500 border-red-200 cursor-not-allowed" : "bg-card border hover:border-primary cursor-pointer";
                              
                              const isSelected = selectedDocToken === t.tokenNumber;
                              if (isSelected) bgClass = "bg-primary text-primary-foreground border-primary";
                              
                              return (
                                <button
                                  key={t.tokenNumber}
                                  disabled={isBooked}
                                  onClick={() => setSelectedDocToken(t.tokenNumber)}
                                  className={`h-8 rounded-md text-xs font-medium transition-colors border ${bgClass}`}
                                >
                                  {t.tokenNumber}
                                </button>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                )}
                <div className="p-4 border-t border-border flex justify-between items-center bg-muted/30">
                  <div className="text-sm text-muted-foreground">
                    {selectedDocId ? doctors.find(d => d.id === selectedDocId)?.fullName : "No doctor selected"}
                  </div>
                  <DialogClose render={<Button variant="default" />}>
                    Select Doctor
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Lab Tests Tile */}
            <Dialog>
              <DialogTrigger className="flex flex-col items-center justify-center p-6 border rounded-xl bg-card hover:border-primary/50 transition-colors gap-3 group outline-none">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FlaskConical className="w-6 h-6 text-blue-500" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-foreground">Add Lab Tests</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedTestIds.size > 0
                      ? `${selectedTestIds.size} test(s) selected`
                      : "Select tests"}
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-xl">Add Lab Tests</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto p-2 flex-1 min-h-0 content-start">
                  {labCatalog.map((test) => {
                    const isSelected = selectedTestIds.has(test.id);
                    return (
                      <div
                        key={test.id}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).tagName === "INPUT") return;
                          const newSet = new Set(selectedTestIds);
                          if (newSet.has(test.id)) newSet.delete(test.id);
                          else {
                            newSet.add(test.id);
                            if (customLabPrices[test.id] === undefined) {
                              setCustomLabPrices(prev => ({ ...prev, [test.id]: test.price }));
                            }
                          }
                          setSelectedTestIds(newSet);
                        }}
                        className={`flex justify-between items-center p-4 rounded-lg border text-left transition-colors cursor-pointer outline-none ${isSelected
                          ? "bg-primary/10 border-primary ring-1 ring-primary text-primary"
                          : "bg-card border-border hover:border-primary/50"
                          }`}
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="font-semibold text-sm truncate" title={test.name}>{test.name}</div>
                          <div className="text-xs opacity-70 mt-0.5">{test.code}</div>
                        </div>
                        <div className="font-bold text-sm shrink-0 flex items-center gap-2">
                          {isSelected ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-normal">Rs.</span>
                              <Input
                                type="number"
                                className="w-20 h-7 text-sm px-2 text-right bg-background text-foreground"
                                value={customLabPrices[test.id] !== undefined ? customLabPrices[test.id] : test.price}
                                onChange={(e) => setCustomLabPrices(prev => ({ ...prev, [test.id]: Number(e.target.value) }))}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          ) : (
                            <span>Rs. {test.price}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedTestIds.size > 0 && (
                  <div className="mt-2 p-4 border-t border-border bg-card flex flex-col gap-3 shrink-0 h-[350px]">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm">Schedule & Tokens</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden min-h-[250px]">
                      {/* Left Column: Calendar */}
                      <div className="border rounded-md flex flex-col overflow-hidden bg-card p-3">
                        <EnhancedCalendar 
                          selectedDate={new Date(selectedDate)} 
                          onDateSelect={(d) => {
                            const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                            setSelectedDate(localDate);
                          }}
                          calendarData={selectedDocId ? calendarData : null} 
                        />
                      </div>

                      {/* Right Column: Matrix */}
                      <div className="border rounded-md flex flex-col overflow-hidden bg-muted/10">
                        <div className="p-2 border-b bg-muted/50 font-medium text-xs text-muted-foreground">Select Token</div>
                        <ScrollArea className="flex-1 p-2">
                          <div className="grid grid-cols-5 gap-2">
                            {labTokens.map(t => {
                              const isBooked = t.status !== "AVAILABLE";
                              let bgClass = isBooked ? "bg-red-50 text-red-500 border-red-200 cursor-not-allowed" : "bg-card border hover:border-primary cursor-pointer";
                              
                              const isSelected = selectedLabToken === t.tokenNumber;
                              if (isSelected) bgClass = "bg-primary text-primary-foreground border-primary";
                              
                              return (
                                <button
                                  key={t.tokenNumber}
                                  disabled={isBooked}
                                  onClick={() => setSelectedLabToken(t.tokenNumber)}
                                  className={`h-8 rounded-md text-xs font-medium transition-colors border ${bgClass}`}
                                >
                                  {t.tokenNumber}
                                </button>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                )}
                <div className="p-4 border-t border-border flex justify-between items-center bg-muted/30">
                  <div className="text-sm text-muted-foreground font-medium">
                    {selectedTestIds.size} test(s) selected
                  </div>
                  <DialogClose render={<Button variant="default" />}>
                    Select Tests
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>

            {/* Extra Services Tile */}
            <Dialog>
              <DialogTrigger className="flex flex-col items-center justify-center p-6 border rounded-xl bg-card hover:border-primary/50 transition-colors gap-3 group outline-none">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FilePlus2 className="w-6 h-6 text-purple-500" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-foreground">Extra Services</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedServiceIds.size > 0
                      ? `${selectedServiceIds.size} service(s) selected`
                      : "Addons & extras"}
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-xl">Extra Services</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto p-2 flex-1 min-h-0 content-start">
                  {extraServicesCatalog.map((svc) => {
                    const isSelected = selectedServiceIds.has(svc.id);
                    return (
                      <div
                        key={svc.id}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).tagName === "INPUT") return;
                          const newSet = new Set(selectedServiceIds);
                          if (newSet.has(svc.id)) newSet.delete(svc.id);
                          else {
                            newSet.add(svc.id);
                            if (customServicePrices[svc.id] === undefined) {
                              setCustomServicePrices(prev => ({ ...prev, [svc.id]: svc.price }));
                            }
                          }
                          setSelectedServiceIds(newSet);
                        }}
                        className={`flex justify-between items-center p-4 rounded-lg border text-left transition-colors cursor-pointer outline-none ${isSelected
                          ? "bg-primary/10 border-primary ring-1 ring-primary text-primary"
                          : "bg-card border-border hover:border-primary/50"
                          }`}
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="font-semibold text-sm truncate" title={svc.title}>{svc.title}</div>
                        </div>
                        <div className="font-bold text-sm shrink-0 flex items-center gap-2">
                          {isSelected ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-normal">Rs.</span>
                              <Input
                                type="number"
                                className="w-20 h-7 text-sm px-2 text-right bg-background text-foreground"
                                value={customServicePrices[svc.id] !== undefined ? customServicePrices[svc.id] : svc.price}
                                onChange={(e) => setCustomServicePrices(prev => ({ ...prev, [svc.id]: Number(e.target.value) }))}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          ) : (
                            <span>Rs. {svc.price}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedServiceIds.size > 0 && (
                  <div className="mt-2 p-4 border-t border-border bg-card flex flex-col gap-3 shrink-0 h-[350px]">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm">Schedule & Tokens</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden min-h-[250px]">
                      {/* Left Column: Calendar */}
                      <div className="border rounded-md flex flex-col overflow-hidden bg-card p-3">
                        <EnhancedCalendar 
                          selectedDate={new Date(selectedDate)} 
                          onDateSelect={(d) => {
                            const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                            setSelectedDate(localDate);
                          }}
                          calendarData={selectedDocId ? calendarData : null} 
                        />
                      </div>

                      {/* Right Column: Matrix */}
                      <div className="border rounded-md flex flex-col overflow-hidden bg-muted/10">
                        <div className="p-2 border-b bg-muted/50 font-medium text-xs text-muted-foreground">Select Token</div>
                        <ScrollArea className="flex-1 p-2">
                          <div className="grid grid-cols-5 gap-2">
                            {serviceTokens.map(t => {
                              const isBooked = t.status !== "AVAILABLE";
                              let bgClass = isBooked ? "bg-red-50 text-red-500 border-red-200 cursor-not-allowed" : "bg-card border hover:border-primary cursor-pointer";
                              
                              const isSelected = selectedServiceToken === t.tokenNumber;
                              if (isSelected) bgClass = "bg-primary text-primary-foreground border-primary";
                              
                              return (
                                <button
                                  key={t.tokenNumber}
                                  disabled={isBooked}
                                  onClick={() => setSelectedServiceToken(t.tokenNumber)}
                                  className={`h-8 rounded-md text-xs font-medium transition-colors border ${bgClass}`}
                                >
                                  {t.tokenNumber}
                                </button>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                )}
                <div className="p-4 border-t border-border flex justify-between items-center bg-muted/30">
                  <div className="text-sm text-muted-foreground font-medium">
                    {selectedServiceIds.size} service(s) selected
                  </div>
                  <DialogClose render={<Button variant="default" />}>
                    Select Services
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          </div>
      </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button 
          className="w-full h-12 text-lg bg-secondary hover:bg-secondary/90" 
          onClick={handleBook}
          disabled={isBooking || (!selectedDocId && selectedTestIds.size === 0 && selectedServiceIds.size === 0) || !selectedDate}
        >
          {isBooking ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Phone className="w-5 h-5 mr-2" />}
          Book Phone Token
        </Button>
      </div>

      {/* Today's Phone Bookings Modal */}
      <div className="mt-6">
        <Dialog onOpenChange={(open) => {
          if (!open) {
            setBookingSearchQuery("");
            setSelectedBookingId(null);
          }
        }}>
          <DialogTrigger className="w-full h-12 border-dashed flex items-center justify-center bg-muted/30 hover:bg-muted/50 border rounded-md font-medium text-sm transition-colors">
            <Phone className="w-5 h-5 mr-2" />
            View Phone Bookings
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Phone Bookings</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by phone number..."
                  className="pl-9"
                  value={bookingSearchQuery}
                  onChange={(e) => setBookingSearchQuery(e.target.value)}
                />
              </div>

              <ScrollArea className="h-[300px] border rounded-md p-2">
                {todayBookings.filter(appt => appt.patientPhone?.includes(bookingSearchQuery) || bookingSearchQuery === "").length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center p-4">No bookings found.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {todayBookings
                      .filter(appt => appt.patientPhone?.includes(bookingSearchQuery) || bookingSearchQuery === "")
                      .map((appt) => (
                        <div 
                          key={appt.id} 
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedBookingId === appt.id ? 'border-primary bg-primary/5' : 'bg-card hover:border-primary/50'}`}
                          onClick={() => setSelectedBookingId(appt.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">{appt.patientName}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {appt.patientPhone}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-primary">Token #{appt.tokenNumber}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {appt.department === "CONSULTATION" ? `Dr. ${appt.doctorName || "General"}` : appt.department}
                              </div>
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex justify-end pt-2 border-t">
                <DialogClose render={
                  <Button 
                    disabled={!selectedBookingId}
                    onClick={() => {
                      const selectedAppt = todayBookings.find(b => b.id === selectedBookingId);
                      if (selectedAppt) {
                        const docInfo = doctors.find(d => d.fullName === selectedAppt.doctorName);
                        sendAppointmentToPOS({
                          appointmentId: selectedAppt.id,
                          tokenNumber: selectedAppt.tokenNumber,
                          patientName: selectedAppt.patientName,
                          doctorName: selectedAppt.doctorName,
                          fee: docInfo?.consultationFee || 2500,
                          isUpfront: docInfo?.feeType === "UPFRONT"
                        });
                        toast.success("Sent to POS for checkout.");
                      }
                    }}
                    className="w-full"
                  />
                }>
                  <Send className="w-4 h-4 mr-2" /> Send to POS
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
