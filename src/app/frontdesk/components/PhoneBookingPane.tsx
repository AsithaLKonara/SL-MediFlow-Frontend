"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Calendar as CalendarIcon, User, Search, Loader2, PlusCircle, SendToBack, Send, UserRound, Stethoscope, FlaskConical, FilePlus2, CheckCircle2, XCircle, RefreshCw, CalendarDays, Filter, Clock } from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import { useRxToPOS } from "../hooks/useCartSync";
import { useAuth } from "@/components/providers/AuthProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EnhancedCalendar } from "@/app/frontdesk/arrivals/components/workspace/left-panel/EnhancedCalendar";
import { Badge } from "@/components/ui/badge";
import { CancelAppointmentModal } from "@/components/frontdesk/CancelAppointmentModal";

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
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isNewPatientForPhone, setIsNewPatientForPhone] = useState(false);
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);

  const [isBooking, setIsBooking] = useState(false);
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [phoneBookings, setPhoneBookings] = useState<any[]>([]);
  const [isPhoneBookingsLoading, setIsPhoneBookingsLoading] = useState(false);
  const [modalDateFilter, setModalDateFilter] = useState<"TODAY" | "TOMORROW" | "NEXT_7_DAYS" | "CUSTOM">("TODAY");
  const [modalCustomDate, setModalCustomDate] = useState<string>(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
  );
  const [modalDoctorFilter, setModalDoctorFilter] = useState<string>("ALL");
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [bookingSearchQuery, setBookingSearchQuery] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<any>(null);

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

  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const fetchDocTokens = useCallback(() => {
    if (!selectedDocId) return;
    const sessionParam = selectedSessionId ? `&sessionId=${selectedSessionId}` : '';
    apiFetch(`${API}/booking/availability?doctorId=${selectedDocId}&date=${selectedDate}${sessionParam}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setDocTokens(res.data.tokens || []);
          if (Array.isArray(res.data.sessions)) {
            setAvailableSessions(res.data.sessions);
            if (!selectedSessionId && res.data.activeSessionId) {
              setSelectedSessionId(res.data.activeSessionId);
            }
          }
        }
      })
      .catch(console.error);
  }, [selectedDocId, selectedDate, selectedSessionId, API, apiFetch]);

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
    setSelectedSessionId(null);
    setSelectedDocToken(null);
    if (!selectedDocId) {
      setDocTokens([]);
      setAvailableSessions([]);
      return;
    }
    fetchDocTokens();
  }, [selectedDocId, selectedDate]);

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

  const formatBookingDate = (dateStr: string) => {
    if (!dateStr) return { label: "N/A", full: "N/A", isToday: false, isTomorrow: false };
    const d = new Date(dateStr);
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
    const apptDateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
    
    const tomorrowD = new Date();
    tomorrowD.setDate(tomorrowD.getDate() + 1);
    const tomorrowStr = tomorrowD.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

    if (apptDateStr === todayStr) {
      return { 
        label: `Today (${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Colombo' })})`, 
        full: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Colombo' }),
        isToday: true, 
        isTomorrow: false 
      };
    } else if (apptDateStr === tomorrowStr) {
      return { 
        label: `Tomorrow (${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Colombo' })})`, 
        full: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Colombo' }),
        isToday: false, 
        isTomorrow: true 
      };
    } else {
      return { 
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Colombo' }), 
        full: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Colombo' }),
        isToday: false, 
        isTomorrow: false 
      };
    }
  };

  const fetchPhoneBookings = useCallback(async () => {
    setIsPhoneBookingsLoading(true);
    try {
      let queryParams = `bookingType=PHONE`;
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

      if (modalDateFilter === "TODAY") {
        queryParams += `&date=${todayStr}`;
      } else if (modalDateFilter === "TOMORROW") {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const tomStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
        queryParams += `&date=${tomStr}`;
      } else if (modalDateFilter === "NEXT_7_DAYS") {
        const dEnd = new Date();
        dEnd.setDate(dEnd.getDate() + 7);
        const endStr = dEnd.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
        queryParams += `&startDate=${todayStr}&endDate=${endStr}`;
      } else if (modalDateFilter === "CUSTOM" && modalCustomDate) {
        queryParams += `&date=${modalCustomDate}`;
      }

      if (modalDoctorFilter && modalDoctorFilter !== "ALL") {
        queryParams += `&doctorId=${modalDoctorFilter}`;
      }

      const res = await apiFetch(`${API}/booking/appointments?${queryParams}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const activePhone = data.data.filter((a: any) => 
          a.bookingType === "PHONE" && !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(a.status)
        );
        
        // Group appointments by bookingReference or (patientId + appointmentDate)
        const uniqueBookings: any[] = [];
        const seenKeys = new Set();
        for (const appt of activePhone) {
          const dateKey = appt.appointmentDate ? appt.appointmentDate.substring(0, 10) : '';
          const groupKey = appt.bookingReference || `${appt.Patient?.id || appt.patientPhone || appt.id}_${dateKey}`;
          if (!seenKeys.has(groupKey)) {
             const group = activePhone.filter((a: any) => {
               const aDateKey = a.appointmentDate ? a.appointmentDate.substring(0, 10) : '';
               const aKey = a.bookingReference || `${a.Patient?.id || a.patientPhone || a.id}_${aDateKey}`;
               return aKey === groupKey;
             });
             const primary = group.find((a: any) => a.department === "CONSULTATION") || group[0];
             primary.groupedTokens = group;
             uniqueBookings.push(primary);
             seenKeys.add(groupKey);
          }
        }
        setPhoneBookings(uniqueBookings);
        setTodayBookings(uniqueBookings);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPhoneBookingsLoading(false);
    }
  }, [API, apiFetch, modalDateFilter, modalCustomDate, modalDoctorFilter]);

  const fetchTodayBookings = fetchPhoneBookings;

  useEffect(() => {
    fetchPhoneBookings();
  }, [fetchPhoneBookings]);

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
    setSelectedPatientId(p.id);
    setIsNewPatientForPhone(false);
    setPatientName(p.fullName);
    setPatientPhone(p.phone);
    setPatientAge(p.ageFallback?.toString() || "");
    setSearchQuery(p.phone);
    setIsPatientSearchOpen(false);
    setPatientLookupResult({ found: true, message: `Patient selected: ${p.fullName}` });
  };

  const startNewPatientForPhone = (phoneNum: string) => {
    setSelectedPatientId(null);
    setIsNewPatientForPhone(true);
    setPatientPhone(phoneNum);
    setPatientName("");
    setPatientAge("");
    setIsPatientSearchOpen(false);
    setPatientLookupResult({ found: false, message: `Registering new person under ${phoneNum}` });
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
        patientId: selectedPatientId || undefined,
        isNewPatient: isNewPatientForPhone,
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
        sessionId: selectedSessionId || undefined,
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
        setSelectedPatientId(null);
        setIsNewPatientForPhone(false);
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
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-56 overflow-y-auto">
                {patientSearchResults.length > 0 ? (
                  <ul className="py-1 divide-y divide-border/50">
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                      Registered Patients for this Phone ({patientSearchResults.length}):
                    </div>
                    {patientSearchResults.map((p) => (
                      <li
                        key={p.id}
                        className="px-3 py-2.5 hover:bg-muted cursor-pointer text-sm flex items-center justify-between"
                        onMouseDown={(e) => { e.preventDefault(); selectPatient(p); }}
                      >
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {p.fullName}
                            {p.gender && <span className="text-[10px] uppercase font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{p.gender}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{p.phone} • {p.ageFallback ? `${p.ageFallback} yrs` : "No age"} {p.patientId ? `• MRN: ${p.patientId}` : ''}</div>
                        </div>
                        <span className="text-xs text-primary font-medium">Select</span>
                      </li>
                    ))}
                    <li
                      className="px-3 py-2.5 hover:bg-primary/10 cursor-pointer text-xs text-primary font-medium flex items-center gap-2 bg-background/50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startNewPatientForPhone(searchQuery);
                      }}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Register new person under {searchQuery}
                    </li>
                  </ul>
                ) : (
                  <div className="p-3 text-sm text-muted-foreground flex flex-col gap-2">
                    <div>No matches found.</div>
                    <button
                      type="button"
                      className="text-xs text-primary font-medium flex items-center gap-1.5 hover:underline text-left"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startNewPatientForPhone(searchQuery);
                      }}
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Quick register as new patient
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Family Member Status Badge */}
        {selectedPatientId && (
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/30 bg-primary/5 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-muted-foreground font-medium">Selected Patient:</span>
              <span className="font-semibold text-foreground">{patientName}</span>
              <span className="text-xs text-muted-foreground">({patientAge ? `${patientAge} yrs` : "No age"}, {patientPhone})</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPatientId(null);
                setIsNewPatientForPhone(false);
                setPatientLookupResult(null);
              }}
              className="text-xs text-primary hover:underline font-medium"
            >
              Change / Clear
            </button>
          </div>
        )}

        {/* New Person Registration Indicator */}
        {isNewPatientForPhone && (
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Registering New Family Member under {patientPhone}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsNewPatientForPhone(false);
                setPatientName("");
                setPatientAge("");
                setPatientPhone("");
                setSearchQuery("");
                setPatientLookupResult(null);
              }}
              className="text-xs text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          </div>
        )}

        {patientLookupResult && !selectedPatientId && !isNewPatientForPhone && (
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
              <DialogTrigger data-testid="tile-select-doctor-phone" className="flex flex-col items-center justify-center p-6 border rounded-xl bg-card hover:border-primary/50 transition-colors gap-3 group outline-none">
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
                        {/* Session Selector */}
                        {availableSessions.length > 0 && (
                          <div className="p-2 border-b bg-muted/40 flex flex-col gap-1.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Select Schedule / Session
                            </span>
                            <div className="flex flex-wrap gap-1.5" data-testid="phone-session-selector">
                              {availableSessions.map((s: any) => {
                                const isSessionActive = selectedSessionId === s.id;
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    data-testid={`phone-session-btn-${s.id}`}
                                    onClick={() => {
                                      setSelectedSessionId(s.id);
                                      setSelectedDocToken(null);
                                    }}
                                    className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-all flex items-center gap-1.5 ${
                                      isSessionActive
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                        : "bg-card text-foreground hover:bg-accent border-border"
                                    }`}
                                  >
                                    <Clock className="w-3 h-3" />
                                    <span>{s.sessionName || "Session"}:</span>
                                    <span className="opacity-80">{s.startTime} - {s.endTime}</span>
                                    {s.roomNumber && <span className="opacity-70 text-[10px] ml-0.5">• Rm {s.roomNumber}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="p-2 border-b bg-muted/50 font-medium text-xs text-muted-foreground flex justify-between items-center">
                          <span>Select Token</span>
                          {availableSessions.length > 0 && selectedSessionId && (
                            <span className="text-[10px] text-muted-foreground">
                              {availableSessions.find(s => s.id === selectedSessionId)?.sessionName || ''}
                            </span>
                          )}
                        </div>
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

      {/* Phone Bookings Modal */}
      <div className="mt-6">
        <Dialog open={isBookingsModalOpen} onOpenChange={(open) => {
          setIsBookingsModalOpen(open);
          if (!open) {
            setBookingSearchQuery("");
            setSelectedBookingId(null);
          }
        }}>
          <DialogTrigger 
            className="w-full h-12 border-dashed flex items-center justify-center bg-muted/30 hover:bg-muted/50 border rounded-md font-medium text-sm transition-colors"
            data-testid="btn-view-phone-bookings"
          >
            <Phone className="w-5 h-5 mr-2 text-primary" />
            View Phone Bookings
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-6">
            <DialogHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    Phone Bookings
                    <Badge variant="secondary" className="ml-2 font-normal">
                      {phoneBookings.filter(appt => {
                        if (!bookingSearchQuery.trim()) return true;
                        const q = bookingSearchQuery.toLowerCase().trim();
                        const phone = (appt.Patient?.phone || appt.patientPhone || "").toLowerCase();
                        const name = (appt.Patient?.fullName || appt.patientName || "").toLowerCase();
                        const token = (appt.tokenNumber || "").toString();
                        const ref = (appt.bookingReference || "").toLowerCase();
                        return phone.includes(q) || name.includes(q) || token.includes(q) || ref.includes(q);
                      }).length} Bookings
                    </Badge>
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage upcoming and today&apos;s telephone token reservations
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchPhoneBookings} 
                  disabled={isPhoneBookingsLoading}
                  className="gap-1.5 h-8 text-xs"
                  data-testid="btn-refresh-phone-bookings"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPhoneBookingsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </DialogHeader>

            {/* Filter Controls Bar */}
            <div className="flex flex-col gap-3 py-3 border-b bg-muted/20 -mx-6 px-6">
              {/* Date Presets Row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
                  <CalendarDays className="w-3.5 h-3.5" /> Date:
                </span>
                <div className="flex rounded-md bg-muted p-1 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setModalDateFilter("TODAY")}
                    className={`px-3 py-1 rounded font-medium transition-all ${
                      modalDateFilter === "TODAY"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="filter-date-today"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalDateFilter("TOMORROW")}
                    className={`px-3 py-1 rounded font-medium transition-all ${
                      modalDateFilter === "TOMORROW"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="filter-date-tomorrow"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalDateFilter("NEXT_7_DAYS")}
                    className={`px-3 py-1 rounded font-medium transition-all ${
                      modalDateFilter === "NEXT_7_DAYS"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="filter-date-next-week"
                  >
                    Next 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalDateFilter("CUSTOM")}
                    className={`px-3 py-1 rounded font-medium transition-all ${
                      modalDateFilter === "CUSTOM"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="filter-date-custom"
                  >
                    Custom Date
                  </button>
                </div>

                {modalDateFilter === "CUSTOM" && (
                  <Input
                    type="date"
                    value={modalCustomDate}
                    onChange={(e) => setModalCustomDate(e.target.value)}
                    className="h-8 text-xs w-40"
                    data-testid="input-filter-custom-date"
                  />
                )}
              </div>

              {/* Doctor and Search Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Doctor Filter Dropdown */}
                <div className="relative">
                  <select
                    value={modalDoctorFilter}
                    onChange={(e) => setModalDoctorFilter(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    data-testid="select-filter-doctor"
                  >
                    <option value="ALL">All Doctors</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.fullName} ({d.specialty || "General"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or token #..."
                    className="pl-8 h-9 text-xs"
                    value={bookingSearchQuery}
                    onChange={(e) => setBookingSearchQuery(e.target.value)}
                    data-testid="input-filter-search"
                  />
                </div>
              </div>
            </div>

            {/* Bookings List Area */}
            <ScrollArea className="flex-1 h-[360px] pr-2 mt-2">
              {isPhoneBookingsLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">Loading phone bookings...</span>
                </div>
              ) : phoneBookings.filter(appt => {
                if (!bookingSearchQuery.trim()) return true;
                const q = bookingSearchQuery.toLowerCase().trim();
                const phone = (appt.Patient?.phone || appt.patientPhone || "").toLowerCase();
                const name = (appt.Patient?.fullName || appt.patientName || "").toLowerCase();
                const token = (appt.tokenNumber || "").toString();
                const ref = (appt.bookingReference || "").toLowerCase();
                return phone.includes(q) || name.includes(q) || token.includes(q) || ref.includes(q);
              }).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
                  <Phone className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">No bookings found</p>
                  <p className="text-xs text-muted-foreground text-center">
                    Try selecting a different date range or doctor filter.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 py-1">
                  {phoneBookings
                    .filter(appt => {
                      if (!bookingSearchQuery.trim()) return true;
                      const q = bookingSearchQuery.toLowerCase().trim();
                      const phone = (appt.Patient?.phone || appt.patientPhone || "").toLowerCase();
                      const name = (appt.Patient?.fullName || appt.patientName || "").toLowerCase();
                      const token = (appt.tokenNumber || "").toString();
                      const ref = (appt.bookingReference || "").toLowerCase();
                      return phone.includes(q) || name.includes(q) || token.includes(q) || ref.includes(q);
                    })
                    .map((appt) => {
                      const dateInfo = formatBookingDate(appt.appointmentDate);
                      const isSelected = selectedBookingId === appt.id;
                      const consultAppt = appt.groupedTokens?.find((t: any) => t.department === "CONSULTATION") || appt;
                      const docName = consultAppt.User?.fullName || consultAppt.doctorName;
                      const sessionName = consultAppt.Session?.sessionName || (consultAppt.Session?.startTime ? `${consultAppt.Session.startTime} - ${consultAppt.Session.endTime}` : null);

                      return (
                        <div 
                          key={appt.id} 
                          className={`p-3.5 border rounded-lg cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-primary ring-1 ring-primary/40 bg-primary/5' 
                              : 'bg-card hover:border-primary/40'
                          }`}
                          onClick={() => setSelectedBookingId(isSelected ? null : appt.id)}
                          data-testid={`booking-card-${appt.id}`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm truncate">
                                  {appt.Patient?.fullName || appt.patientName || "Unknown Patient"}
                                </span>
                                {appt.Patient?.age && (
                                  <span className="text-[11px] text-muted-foreground">
                                    ({appt.Patient.age} yrs)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3" />
                                  {appt.Patient?.phone || appt.patientPhone || "No Phone"}
                                </span>
                                {appt.bookingReference && (
                                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                                    Ref: {appt.bookingReference}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <div className="flex items-center gap-1.5">
                                <Badge 
                                  variant="outline" 
                                  className={`text-[11px] font-medium flex items-center gap-1 px-2 py-0.5 ${
                                    dateInfo.isToday 
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800" 
                                      : dateInfo.isTomorrow
                                      ? "bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-800"
                                      : "bg-purple-500/10 text-purple-600 border-purple-300 dark:border-purple-800"
                                  }`}
                                >
                                  <CalendarDays className="w-3 h-3" />
                                  {dateInfo.label}
                                </Badge>
                                <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-md">
                                  Token #{appt.tokenNumber}
                                </span>
                              </div>
                              {docName && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Stethoscope className="w-3 h-3 text-primary" />
                                  Dr. {docName} {sessionName ? `(${sessionName})` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* List all items booked in this reference */}
                          {isSelected && (
                            <div className="mt-4 flex flex-col gap-2 pt-2 border-t">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                Booked Items for this Visit
                              </h4>
                              {appt.groupedTokens?.map((t: any) => {
                                if (t.department === "CONSULTATION") {
                                  const docInfo = doctors.find(d => d.id === t.doctorId || d.fullName === t.User?.fullName);
                                  const isUpfront = t.User?.feeType === "UPFRONT" || docInfo?.feeType === "UPFRONT";
                                  return (
                                    <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card/60">
                                      <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                          <Stethoscope className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="font-medium text-xs">Dr. {t.User?.fullName || t.doctorName || "General"}</span>
                                          <span className="text-[11px] text-muted-foreground">Doctor Consultation</span>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className={`text-[10px] ${isUpfront ? "bg-amber-500/10 text-amber-600 border-amber-300" : "bg-blue-500/10 text-blue-600 border-blue-300"}`}>
                                        {isUpfront ? "Upfront Pay" : "Post Pay"}
                                      </Badge>
                                    </div>
                                  );
                                }
                                
                                if (t.department === "LAB") {
                                  return (
                                    <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card/60">
                                      <div className="flex items-center gap-3 min-w-0 pr-4 flex-1">
                                        <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                          <FlaskConical className="w-3.5 h-3.5 text-blue-500" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-medium text-xs truncate">Lab Tests</span>
                                          <span className="text-[11px] text-muted-foreground">Laboratory</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                if (t.department === "EXTRA_SERVICE") {
                                  return (
                                    <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card/60">
                                      <div className="flex items-center gap-3 min-w-0 pr-4 flex-1">
                                        <div className="w-7 h-7 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                                          <FilePlus2 className="w-3.5 h-3.5 text-purple-500" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-medium text-xs truncate">Extra Services</span>
                                          <span className="text-[11px] text-muted-foreground">Service Addon</span>
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
                          {!isSelected && (
                            <div className="mt-2.5 pt-2 border-t flex flex-wrap gap-1">
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
                      );
                    })}
                </div>
              )}
            </ScrollArea>

            <div className="flex justify-between items-center pt-3 border-t gap-2 mt-2">
              <Button 
                variant="destructive"
                size="sm"
                disabled={!selectedBookingId}
                data-testid="btn-cancel-phone-booking"
                onClick={() => {
                  const selectedAppt = phoneBookings.find(b => b.id === selectedBookingId);
                  if (selectedAppt) {
                    setAppointmentToCancel({
                      id: selectedAppt.id,
                      tokenNumber: selectedAppt.tokenNumber,
                      patientName: selectedAppt.Patient?.fullName || selectedAppt.patientName,
                      doctorName: selectedAppt.User?.fullName || selectedAppt.doctorName
                    });
                    setIsCancelModalOpen(true);
                  }
                }}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Cancel Booking
              </Button>

              <DialogClose render={
                <Button 
                  disabled={!selectedBookingId}
                  data-testid="btn-send-pos-phone-booking"
                  onClick={async () => {
                    const selectedAppt = phoneBookings.find(b => b.id === selectedBookingId);
                    if (selectedAppt) {
                      try {
                        const res = await apiFetch(`${API}/barcode/${selectedAppt.id}`);
                        if (res.ok) {
                          const data = await res.json();
                          if (data.type === "APPOINTMENT") {
                            const consultAppt = data.data.allAppointments?.find((a: any) => a.department === "CONSULTATION") || data.data.appointment;
                            const docInfo = doctors.find(d => d.id === consultAppt?.doctorId || d.fullName === consultAppt?.User?.fullName);
                            const isUpfront = consultAppt?.User?.feeType === "UPFRONT" || docInfo?.feeType === "UPFRONT" || false;
                            sendAppointmentToPOS({
                              appointmentId: data.data.appointment.id,
                              tokenNumber: data.data.appointment.tokenNumber,
                              patientName: data.data.appointment.Patient?.fullName || selectedAppt.Patient?.fullName,
                              doctorName: consultAppt?.User?.fullName || data.data.appointment.User?.fullName,
                              fee: consultAppt?.User?.consultationFee || data.data.appointment.User?.consultationFee || docInfo?.consultationFee || 2500,
                              isUpfront: isUpfront,
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
                      const docConsultAppt = selectedAppt.groupedTokens?.find((a: any) => a.department === "CONSULTATION") || selectedAppt;
                      const docName = docConsultAppt.User?.fullName || docConsultAppt.doctorName;
                      const docInfo = doctors.find(d => d.fullName === docName || d.id === docConsultAppt.doctorId);
                      const isUpfront = docConsultAppt.User?.feeType === "UPFRONT" || docInfo?.feeType === "UPFRONT" || false;
                      sendAppointmentToPOS({
                        appointmentId: selectedAppt.id,
                        tokenNumber: selectedAppt.tokenNumber,
                        patientName: selectedAppt.Patient?.fullName || selectedAppt.patientName,
                        doctorName: docName,
                        fee: docConsultAppt.User?.consultationFee || docInfo?.consultationFee || 2500,
                        isUpfront: isUpfront,
                        allAppointments: selectedAppt.groupedTokens || []
                      });
                      toast.success("Sent to POS for checkout.");
                    }
                  }}
                  className="flex-1 max-w-[200px]"
                />
              }>
                <Send className="w-4 h-4 mr-2" /> Send to POS
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <CancelAppointmentModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setAppointmentToCancel(null);
        }}
        appointment={appointmentToCancel}
        onSuccess={() => {
          setSelectedBookingId(null);
          fetchTodayBookings();
          if (selectedDocId) fetchDocTokens();
        }}
      />

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
