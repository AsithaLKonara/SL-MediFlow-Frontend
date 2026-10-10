"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Calendar as CalendarIcon, User, Search, Loader2, PlusCircle, SendToBack, Send, UserRound, Stethoscope, FlaskConical, FilePlus2, CheckCircle2 } from "lucide-react";
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
      },
      cache: options.cache || 'no-store'
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

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
  );
  
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

  const [successPopupOpen, setSuccessPopupOpen] = useState(false);
  const [successTokens, setSuccessTokens] = useState<any[]>([]);

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
        // Group by patient instead of booking reference so all their bookings today appear together
        const todayPhone = data.data.filter((a: any) => a.bookingType === "PHONE" && !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(a.status));
        
        // Pick primary token per patient (Doctor preferred)
        const uniqueBookings: any[] = [];
        const seenPatients = new Set();
        for (const appt of todayPhone) {
          const patientKey = appt.Patient?.id || appt.patientPhone || appt.id;
          if (!seenPatients.has(patientKey)) {
             // Find all for this patient
             const group = todayPhone.filter((a: any) => (a.Patient?.id || a.patientPhone || a.id) === patientKey);
             const primary = group.find((a: any) => a.department === "CONSULTATION") || group[0];
             primary.groupedTokens = group;
             uniqueBookings.push(primary);
             seenPatients.add(patientKey);
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

    if (selectedDocId && docTokens.length > 0 && docTokens.every(t => t.status !== "AVAILABLE")) {
      toast.error("Doctor token limit reached. No available tokens.");
      return;
    }
    if (selectedTestIds.size > 0 && labTokens.length > 0 && labTokens.every(t => t.status !== "AVAILABLE")) {
      toast.error("Lab test token limit reached. No available tokens.");
      return;
    }
    if (selectedServiceIds.size > 0 && serviceTokens.length > 0 && serviceTokens.every(t => t.status !== "AVAILABLE")) {
      toast.error("Extra Services token limit reached. No available tokens.");
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
        setSuccessTokens(result.data.tokens || []);
        setSuccessPopupOpen(true);
        setSearchQuery("");
        setPatientName("");
        setPatientPhone("");
        setPatientAge("");
        setPatientLookupResult(null);
        setSelectedDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }));
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
                            const localDate = new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
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
                            const localDate = new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
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
                            const localDate = new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
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

      {/* Selected Items Summary */}
      {(selectedDocId || selectedTestIds.size > 0 || selectedServiceIds.size > 0) && (
        <div className="mt-4 flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Selected Items</h4>

          {selectedDocId && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{doctors.find(d => d.id === selectedDocId)?.fullName}</span>
                  <span className="text-xs text-muted-foreground">Doctor Consultation</span>
                </div>
              </div>
              <button onClick={() => setSelectedDocId(null)} className="text-xs text-destructive hover:underline p-1 outline-none">Remove</button>
            </div>
          )}

          {Array.from(selectedTestIds).map(testId => {
            const test = labCatalog.find(t => t.id === testId);
            if (!test) return null;
            const finalPrice = customLabPrices[test.id] !== undefined ? customLabPrices[test.id] : test.price;
            return (
              <div key={test.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                <div className="flex items-center gap-3 min-w-0 pr-4 flex-1">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm truncate" title={test.name}>{test.name}</span>
                    <span className="text-xs text-muted-foreground">Lab Test</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-semibold text-sm">Rs. {finalPrice}</span>
                  <button
                    onClick={() => {
                      const newSet = new Set(selectedTestIds);
                      newSet.delete(test.id);
                      setSelectedTestIds(newSet);
                    }}
                    className="text-xs text-destructive hover:underline p-1 outline-none"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          {Array.from(selectedServiceIds).map(svcId => {
            const svc = extraServicesCatalog.find(s => s.id === svcId);
            if (!svc) return null;
            const finalPrice = customServicePrices[svc.id] !== undefined ? customServicePrices[svc.id] : svc.price;
            return (
              <div key={svc.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                <div className="flex items-center gap-3 min-w-0 pr-4 flex-1">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                    <FilePlus2 className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm truncate" title={svc.title}>{svc.title}</span>
                    <span className="text-xs text-muted-foreground">Extra Service</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-semibold text-sm">Rs. {finalPrice}</span>
                  <button
                    onClick={() => {
                      const newSet = new Set(selectedServiceIds);
                      newSet.delete(svc.id);
                      setSelectedServiceIds(newSet);
                    }}
                    className="text-xs text-destructive hover:underline p-1 outline-none"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <Button 
          className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700" 
          onClick={handleBook}
          disabled={(!selectedDocId && selectedTestIds.size === 0 && selectedServiceIds.size === 0) || !selectedDate}
          isLoading={isBooking}
          loadingText="Book Phone Token"
        >
          <Phone className="w-5 h-5 mr-2" />
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
                {todayBookings.filter(appt => {
                  const phone = appt.Patient?.phone || appt.patientPhone || "";
                  return phone.includes(bookingSearchQuery) || bookingSearchQuery === "";
                }).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center p-4">No bookings found.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {todayBookings
                      .filter(appt => {
                        const phone = appt.Patient?.phone || appt.patientPhone || "";
                        return phone.includes(bookingSearchQuery) || bookingSearchQuery === "";
                      })
                      .map((appt) => (
                        <div 
                          key={appt.id} 
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedBookingId === appt.id ? 'border-primary bg-primary/5' : 'bg-card hover:border-primary/50'}`}
                          onClick={() => setSelectedBookingId(appt.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">{appt.Patient?.fullName || appt.patientName || "Unknown Patient"}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {appt.Patient?.phone || appt.patientPhone || "No Phone"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-primary">Token #{appt.tokenNumber}</div>
                            </div>
                          </div>
                          
                          {/* List all items booked in this reference */}
                          {selectedBookingId === appt.id && (
                            <div className="mt-4 flex flex-col gap-2">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Selected Items</h4>
                              {appt.groupedTokens?.map((t: any) => {
                                if (t.department === "CONSULTATION") {
                                  return (
                                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                          <Stethoscope className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="font-medium text-sm">Dr. {t.User?.fullName || t.doctorName || "General"}</span>
                                          <span className="text-xs text-muted-foreground">Doctor Consultation</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                if (t.department === "LAB") {
                                  return (
                                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                                      <div className="flex items-center gap-3 min-w-0 pr-4 flex-1">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                          <FlaskConical className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-medium text-sm truncate">Lab Tests</span>
                                          <span className="text-xs text-muted-foreground">Lab Test</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                if (t.department === "EXTRA_SERVICE") {
                                  return (
                                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                                      <div className="flex items-center gap-3 min-w-0 pr-4 flex-1">
                                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                                          <FilePlus2 className="w-4 h-4 text-purple-500" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-medium text-sm truncate">Extra Services</span>
                                          <span className="text-xs text-muted-foreground">Extra Service</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                return null;
                              })}
                            </div>
                          )}
                          
                          {/* Compact view if not selected */}
                          {selectedBookingId !== appt.id && (
                            <div className="mt-3 pt-2 border-t flex flex-wrap gap-1">
                              {appt.groupedTokens?.map((t: any) => (
                                <span key={t.id} className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-medium">
                                  {t.department === "CONSULTATION" ? `Dr. ${t.User?.fullName || t.doctorName || "General"}` : 
                                   t.department === "EXTRA_SERVICE" ? "Extra Services" : 
                                   t.department === "LAB" ? "Lab Tests" : t.department}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex justify-end pt-2 border-t">
                <DialogClose render={
                  <Button 
                    disabled={!selectedBookingId}
                    onClick={async () => {
                      const selectedAppt = todayBookings.find(b => b.id === selectedBookingId);
                      if (selectedAppt) {
                        try {
                          const res = await apiFetch(`${API}/barcode/${selectedAppt.id}`);
                          if (res.ok) {
                            const data = await res.json();
                            if (data.type === "APPOINTMENT") {
                              sendAppointmentToPOS({
                                appointmentId: data.data.appointment.id,
                                tokenNumber: data.data.appointment.tokenNumber,
                                patientName: data.data.appointment.Patient?.fullName,
                                doctorName: data.data.appointment.User?.fullName,
                                fee: data.data.appointment.User?.consultationFee || 2500,
                                isUpfront: data.data.appointment.User?.feeType === "UPFRONT",
                                invoice: data.data.invoice,
                                allAppointments: data.data.allAppointments || []
                              });
                              toast.success("Sent to POS for checkout.");
                              return;
                            }
                          }
                        } catch (e) {
                           console.error(e);
                        }
                        // Fallback if barcode API fails
                        const docInfo = doctors.find(d => d.fullName === selectedAppt.doctorName);
                        sendAppointmentToPOS({
                          appointmentId: selectedAppt.id,
                          tokenNumber: selectedAppt.tokenNumber,
                          patientName: selectedAppt.patientName,
                          doctorName: selectedAppt.doctorName,
                          fee: docInfo?.consultationFee || 2500,
                          isUpfront: docInfo?.feeType === "UPFRONT",
                          allAppointments: selectedAppt.groupedTokens || []
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

      {/* Success Popup */}
      <Dialog open={successPopupOpen} onOpenChange={setSuccessPopupOpen}>
        <DialogContent className="sm:max-w-[425px] text-center">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">Booking Successful!</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-4">The phone booking has been successfully recorded.</p>
            <div className="bg-muted p-4 rounded-lg text-left">
              <div className="flex flex-col gap-2">
                {successTokens.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <span className="font-medium text-foreground">
                      {t.department === "CONSULTATION" ? `Dr. ${t.User?.fullName || t.doctorName || "General"}` : 
                       t.department === "EXTRA_SERVICE" ? "Extra Services" : 
                       t.department === "LAB" ? "Lab Tests" : t.department}
                    </span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                      Token #{t.tokenNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 italic">
              * Remember to checkout this booking in POS when the patient arrives.
            </p>
          </div>
          <div className="flex justify-center mt-2">
            <Button onClick={() => setSuccessPopupOpen(false)} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
