"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Ticket, Phone, Search, PlusCircle, FileText, CheckCircle, Loader2, FlaskConical, RefreshCw, UserRound, Stethoscope, FilePlus2, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EnhancedCalendar } from "@/app/frontdesk/arrivals/components/workspace/left-panel/EnhancedCalendar";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { TokenReceipt } from "./PrintTemplates/TokenReceipt";
import { BillReceipt } from "./PrintTemplates/BillReceipt";
import { PrescriptionReceipt } from "./PrintTemplates/PrescriptionReceipt";
import { PhoneBookingPane } from "./PhoneBookingPane";
import { ExternalLabRequestModal } from "./ExternalLabRequestModal";
import { RxHistoryModal } from "./RxHistoryModal";
import { useRxToPOS, CartItem } from "../hooks/useCartSync";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

interface Doctor {
  id: string;
  fullName: string;
  specialty?: string;
  roomNumber?: string;
  feeType?: string;
  consultationFee?: number;
  expectedStartTime?: string;
  isArrived?: boolean;
  arrivedAt?: string;
}

interface LabTest {
  id: string;
  name: string;
  code: string;
  price: number;
}

interface PrescriptionItem {
  id: string;
  medicineId: string | null;
  drugName: string;
  dispenseQty: number | null;
  medicine?: {
    id: string;
    name: string;
    stockBatches?: { unitPrice: number; currentQuantity?: number }[];
  };
}

interface Prescription {
  id: string;
  patientName: string;
  doctorName: string;
  createdAt: string;
  status: string;
  items: PrescriptionItem[];
  labRequests?: { id: string; tests: string[] }[];
  visitId?: string;
  patientId?: string;
  bookingReference?: string | null;
  doctor?: any;
  consultationPaid?: boolean;
}

interface GeneratedToken {
  id: string;
  queueNumber: string;
  doctorName: string;
  department: string;
  date: string;
  patientName: string;
  patientId?: string;
  tests?: string[];
  visitId?: string;
  invoiceId?: string;
  roomNumber?: string;
  invoice?: any;
}

export function TokenPane() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"reception" | "phone-booking" | "prescriptions">("reception");
  
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

  const { sendToPOS, sendTokenToPOS, onRxStatusUpdate } = useRxToPOS();
  const [searchQuery, setSearchQuery] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientLookupResult, setPatientLookupResult] = useState<{ found: boolean; message: string } | null>(null);

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isNewPatientForPhone, setIsNewPatientForPhone] = useState(false);

  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [labCatalog, setLabCatalog] = useState<LabTest[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [customLabPrices, setCustomLabPrices] = useState<Record<string, number>>({});

  const [extraServicesCatalog, setExtraServicesCatalog] = useState<any[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [customServicePrices, setCustomServicePrices] = useState<Record<string, number>>({});

  const [selectedDocToken, setSelectedDocToken] = useState<number | null>(null);
  const [docTokens, setDocTokens] = useState<any[]>([]);
  const [selectedLabToken, setSelectedLabToken] = useState<number | null>(null);
  const [labTokens, setLabTokens] = useState<any[]>([]);
  const [selectedServiceToken, setSelectedServiceToken] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
  );
  const [serviceTokens, setServiceTokens] = useState<any[]>([]);

  const [pendingPrescriptions, setPendingPrescriptions] = useState<Prescription[]>([]);
  const [rxLoading, setRxLoading] = useState(false);
  /** ID of the prescription currently locked in the POS */
  const [inPosPrescriptionId, setInPosPrescriptionId] = useState<string | null>(null);
  const [selectedRxForPrint, setSelectedRxForPrint] = useState<Prescription | null>(null);

  const handlePrintClick = (rx: Prescription) => {
    setSelectedRxForPrint(rx);
    setTimeout(() => {
      handlePrintPrescription();
    }, 150); // slight delay for React to render the ref
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<GeneratedToken | null>(null);

  const tokenPrintRef = useRef<HTMLDivElement>(null);
  const billPrintRef = useRef<HTMLDivElement>(null);

  const socketRef = useRef<Socket | null>(null);
  const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : "http://localhost:5000";

  
  
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

  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const fetchDayAppointments = useCallback(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    apiFetch(`${apiUrl}/booking/appointments?date=${selectedDate}`)
      .then(r => r.json())
      .then(res => { if (res.success) setDayAppointments(res.data); })
      .catch(console.error);
  }, [selectedDate, apiFetch]);

  useEffect(() => {
    fetchDayAppointments();
  }, [fetchDayAppointments]);

  
  const handleMarkArrived = async (id: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await apiFetch(`${apiUrl}/booking/${id}/arrive`, { method: "PATCH" });
      const result = await res.json();
      if (result.success) {
        toast.success("Patient marked as arrived.");
        fetchDayAppointments();
        if (selectedDocId) fetchDocTokens();
        if (selectedTestIds.size > 0) fetchLabTokens();
        if (selectedServiceIds.size > 0) fetchServiceTokens();
      } else {
        toast.error(result.error || "Failed");
      }
    } catch (e) { toast.error("Error"); }
  };

  const fetchDocTokens = useCallback(() => {
    if (!selectedDocId) return;
    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/availability?doctorId=${selectedDocId}&date=${selectedDate}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setDocTokens(res.data.tokens || []);
      })
      .catch(console.error);
  }, [selectedDocId, selectedDate, apiFetch]);

  const fetchLabTokens = useCallback(() => {
    if (selectedTestIds.size === 0) return;
    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/department-availability?department=LAB&date=${selectedDate}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setLabTokens(res.data.tokens || []);
      })
      .catch(console.error);
  }, [selectedTestIds.size, selectedDate, apiFetch]);

  const fetchServiceTokens = useCallback(() => {
    if (selectedServiceIds.size === 0) return;
    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/department-availability?department=EXTRA_SERVICE&date=${selectedDate}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setServiceTokens(res.data.tokens || []);
      })
      .catch(console.error);
  }, [selectedServiceIds.size, selectedDate, apiFetch]);

  const fetchPendingPrescriptions = useCallback(async (): Promise<Prescription[]> => {
    console.log("[TokenPane] fetchPendingPrescriptions running, hasToken:", !!token);
    if (!token) return [];
    setRxLoading(true);
    try {
      console.log("[TokenPane] calling /prescriptions/pending...");
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/pending`);
      console.log("[TokenPane] /prescriptions/pending status:", res.status);
      if (!res.ok) throw new Error("Failed to fetch prescriptions: " + res.status);
      const data: Prescription[] = await res.json();
      console.log("[TokenPane] /prescriptions/pending returned:", data.length, "items");
      setPendingPrescriptions(data);
      return data;
    } catch (e) {
      console.error("[TokenPane] fetchPendingPrescriptions error:", e);
      toast.error("Failed to load pending prescriptions.");
      return [];
    } finally {
      setRxLoading(false);
    }
  }, [token, apiFetch]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    
    const refreshAll = () => {
      if (selectedDocId) fetchDocTokens();
      if (selectedTestIds.size > 0) fetchLabTokens();
      if (selectedServiceIds.size > 0) fetchServiceTokens();
    };

    socketRef.current.on("connect", refreshAll);
    socketRef.current.on("TOKEN_STATUS_UPDATED", refreshAll);
    socketRef.current.on("prescription_created", fetchPendingPrescriptions);
    socketRef.current.on("prescription_status_updated", fetchPendingPrescriptions);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [selectedDocId, selectedTestIds.size, selectedServiceIds.size, fetchDocTokens, fetchLabTokens, fetchServiceTokens, fetchPendingPrescriptions]);

  const resetForm = () => {
    setSelectedPatientId(null);
    setIsNewPatientForPhone(false);
    setPatientName("");
    setPatientPhone("");
    setPatientAge("");
    setSelectedDocId(null);
    setSelectedTestIds(new Set());
    setCustomLabPrices({});
    setSelectedServiceIds(new Set());
    setCustomServicePrices({});
    setGeneratedToken(null);
    setSearchQuery("");
    setPatientLookupResult(null);
    setPatientSearchResults([]);
    setIsPatientSearchOpen(false);
    setSelectedDocToken(null);
    setSelectedLabToken(null);
    setSelectedServiceToken(null);
    setDocTokens([]);
    setLabTokens([]);
    setServiceTokens([]);
  };

  const handlePrintToken = useReactToPrint({
    contentRef: tokenPrintRef,
    onAfterPrint: resetForm
  });

  const handlePrintBill = useReactToPrint({
    contentRef: billPrintRef,
    onAfterPrint: resetForm
  });

  const prescriptionPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintPrescription = useReactToPrint({ contentRef: prescriptionPrintRef });



  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/doctors`).then(r => {
        if (!r.ok) throw new Error("Failed to fetch doctors");
        return r.json();
      }),
      apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/catalog`).then(r => {
        if (!r.ok) throw new Error("Failed to fetch lab catalog");
        return r.json();
      }),
      apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services`).then(r => {
        if (!r.ok) throw new Error("Failed to fetch extra services");
        return r.json();
      })
    ]).then(([docRes, labRes, svcRes]) => {
      if (docRes.success) setDoctors(docRes.data);
      if (Array.isArray(labRes)) setLabCatalog(labRes);
      if (Array.isArray(svcRes)) setExtraServicesCatalog(svcRes);
    }).catch((e) => {
      console.error(e);
    });

    // Load prescriptions on mount
    fetchPendingPrescriptions();
  }, [token, apiFetch, fetchPendingPrescriptions]);



  // Listen for status updates from POSPane (via BroadcastChannel)
  useEffect(() => {
    return onRxStatusUpdate((update) => {
      if (update.status === "IN_PROGRESS") {
        setInPosPrescriptionId(update.rxId);
      } else if (update.status === "DISPENSED") {
        // Remove from list and clear lock
        setPendingPrescriptions((prev) => prev.filter((rx) => rx.id !== update.rxId));
        setInPosPrescriptionId(null);
        toast.success("Prescription dispensed & payment complete.");
      } else if (update.status === "PENDING") {
        // Checkout cancelled — unlock
        setInPosPrescriptionId(null);
        toast.info("Checkout cancelled — prescription returned to pending.");
      }
    });
  }, [onRxStatusUpdate]);

  useEffect(() => {
    if (!selectedDocId) {
      setDocTokens([]);
      setSelectedDocToken(null);
      return;
    }
    fetchDocTokens();
  }, [selectedDocId, fetchDocTokens]);

  useEffect(() => {
    if (selectedTestIds.size === 0) {
      setLabTokens([]);
      setSelectedLabToken(null);
      return;
    }
    fetchLabTokens();
  }, [selectedTestIds.size, fetchLabTokens]);

  useEffect(() => {
    if (selectedServiceIds.size === 0) {
      setServiceTokens([]);
      setSelectedServiceToken(null);
      return;
    }
    fetchServiceTokens();
  }, [selectedServiceIds.size, fetchServiceTokens]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        setPatientPhone(searchQuery); // auto-sync with phone
        apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/patients?q=${searchQuery}`)
          .then(r => r.json())
          .then(data => {
            if (data.success && data.data.length > 0) {
              setPatientSearchResults(data.data);
              setIsPatientSearchOpen(true);
              setPatientLookupResult({ found: true, message: `${data.data.length} match(es) found.` });
            } else {
              setPatientSearchResults([]);
              setIsPatientSearchOpen(true);
              setPatientLookupResult({ found: false, message: "No match found. Use quick register." });
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

  const selectPatient = (patient: any) => {
    setSelectedPatientId(patient.id);
    setIsNewPatientForPhone(false);
    setSearchQuery(patient.phone);
    setPatientPhone(patient.phone);
    setPatientName(patient.fullName);
    setPatientAge(patient.ageFallback ? patient.ageFallback.toString() : "");
    setIsPatientSearchOpen(false);
    setPatientLookupResult({ found: true, message: `Selected: ${patient.fullName}` });
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

  const handleGenerateToken = async () => {
    if (!selectedDocId && selectedTestIds.size === 0 && selectedServiceIds.size === 0) {
      toast.error("Please select a doctor, lab test, or extra service.");
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

    const selectedDoc = doctors.find(d => d.id === selectedDocId);
    let expectedTotal = 0;
    let isUpfront = false;
    let doctorFee = 0;

    if (selectedDoc) {
      if (selectedDoc.feeType === "UPFRONT") {
        doctorFee = selectedDoc.consultationFee || 2500;
        expectedTotal += doctorFee;
        isUpfront = true;
      }
    }

    const tests = Array.from(selectedTestIds).map(testId => {
      const test = labCatalog.find(t => t.id === testId);
      const price = customLabPrices[testId] !== undefined ? customLabPrices[testId] : (test?.price || 0);
      expectedTotal += price;
      return { id: testId, name: test?.name || "Lab Test", price };
    });

    const services = Array.from(selectedServiceIds).map(svcId => {
      const svc = extraServicesCatalog.find(s => s.id === svcId);
      const price = customServicePrices[svcId] !== undefined ? customServicePrices[svcId] : (svc?.price || 0);
      expectedTotal += price;
      return { id: svcId, name: svc?.title || "Extra Service", price };
    });

    sendTokenToPOS({
      patientId: selectedPatientId || undefined,
      isNewPatient: isNewPatientForPhone,
      patientName: patientName || "Walk-in Patient",
      patientPhone,
      ageFallback: patientAge ? parseInt(patientAge, 10) : undefined,
      doctorId: selectedDocId,
      doctorName: selectedDoc?.fullName,
      doctorFee,
      doctorTokenNumber: selectedDocToken || undefined,
      isUpfront,
      tests,
      testIds: Array.from(selectedTestIds),
      customLabPrices,
      labTokenNumber: selectedLabToken || undefined,
      services,
      serviceIds: Array.from(selectedServiceIds),
      customServicePrices,
      serviceTokenNumber: selectedServiceToken || undefined,
      expectedTotal,
      date: selectedDate
    });

    toast.success("Token sent to POS for Checkout.");
    resetForm();
  };

  const handleSendToPOS = useCallback((rx: Prescription) => {
    if (inPosPrescriptionId) {
      toast.error("A prescription is already in the POS. Complete checkout first.");
      return;
    }

    const cartItems: CartItem[] = rx.items
      .filter((item) => item.medicineId && item.medicine)
      .map((item) => ({
        id: item.medicine!.id,
        name: item.medicine!.name,
        qty: item.dispenseQty || 1,
        price: item.medicine!.stockBatches?.[0]?.unitPrice ?? 0,
      }));

    if (cartItems.length === 0) {
      toast.info("No medicines found in this prescription. Sending to POS for post-pay fee checkout if applicable.");
    }

    // Optimistically lock UI immediately (POSPane will also broadcast IN_PROGRESS back)
    setInPosPrescriptionId(rx.id);
    sendToPOS(cartItems, rx.id, (rx as any).doctor, (rx as any).consultationPaid, rx.visitId, rx.patientId);
    toast.success(`${cartItems.length} medicine(s) sent to POS — complete checkout to dispense.`);
  }, [inPosPrescriptionId, sendToPOS]);

  const triggerRxSendToPOSByBarcode = useCallback(async (barcode: string) => {
    const cleanBarcode = barcode.trim();
    console.log("[TokenPane] triggerRxSendToPOSByBarcode called with:", cleanBarcode);
    if (cleanBarcode.length < 6) return;

    // Immediately switch to Prescriptions tab so frontdesk sees the Rx workspace activate
    setActiveTab("prescriptions");

    // 1. Instant fast-path: Check if matching prescription is ALREADY in local state!
    let matchedRx = pendingPrescriptions.find(rx => 
      rx.id === cleanBarcode ||
      rx.id.toLowerCase().startsWith(cleanBarcode.toLowerCase()) ||
      rx.bookingReference === cleanBarcode ||
      rx.visitId === cleanBarcode
    );

    if (matchedRx) {
      console.log("[TokenPane] Instant in-memory match found:", matchedRx.id, matchedRx.patientName);
      if (inPosPrescriptionId === matchedRx.id) {
        toast.info(`Prescription for ${matchedRx.patientName} is already active in POS.`);
        return;
      }
      handleSendToPOS(matchedRx);
      return;
    }

    // 2. Fast single-record backend lookup if not yet loaded in local state
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/barcode/${cleanBarcode}`);
      if (res.ok) {
        const json = await res.json();
        const barcodeType = json.type;
        const barcodeData = json.data;

        // If not an appointment, prescription, or visit barcode, let other components handle
        if (barcodeType && barcodeType !== "APPOINTMENT" && barcodeType !== "PRESCRIPTION") {
          console.log("[TokenPane] barcodeType not appointment or prescription:", barcodeType);
          return;
        }

        if (barcodeType === "APPOINTMENT" && barcodeData?.prescriptions?.length > 0) {
          const apptIds = new Set([
            barcodeData.appointment?.id,
            ...(barcodeData.allAppointments || []).map((a: any) => a.id)
          ].filter(Boolean));

          const rxFromApi = barcodeData.prescriptions.find((p: any) => 
            p.id === cleanBarcode ||
            (p.visitId && apptIds.has(p.visitId)) ||
            p.bookingReference === cleanBarcode
          ) || barcodeData.prescriptions[0];

          const synthesizedRx: Prescription = {
            id: rxFromApi.id,
            patientName: barcodeData.patient?.fullName || "Patient",
            doctorName: barcodeData.doctor?.fullName || "Doctor",
            createdAt: rxFromApi.createdAt || new Date().toISOString(),
            status: rxFromApi.status || "PENDING",
            items: (rxFromApi.items || []).map((i: any) => ({
              id: i.id,
              drugName: i.medicine?.name || i.medicineName || "Medicine",
              dispenseQty: i.dispenseQty || 1,
              dosage: i.dosage,
              frequency: i.frequency,
              duration: i.duration,
              medicineId: i.medicineId,
              medicine: i.medicine
            })),
            visitId: rxFromApi.visitId || barcodeData.appointment?.id,
            patientId: rxFromApi.patientId || barcodeData.patient?.id,
            bookingReference: barcodeData.masterBarcode || cleanBarcode,
            doctor: barcodeData.doctor,
            consultationPaid: barcodeData.consultationPaid
          };

          // Also inject into local list so the card displays in Rx list immediately
          setPendingPrescriptions(prev => {
            if (prev.some(p => p.id === synthesizedRx.id)) {
              return prev.map(p => p.id === synthesizedRx.id ? { ...p, ...synthesizedRx } : p);
            }
            return [synthesizedRx, ...prev];
          });

          if (inPosPrescriptionId === synthesizedRx.id) {
            toast.info(`Prescription for ${synthesizedRx.patientName} is already active in POS.`);
            return;
          }

          handleSendToPOS(synthesizedRx);
          return;
        } else if (barcodeType === "PRESCRIPTION" && barcodeData) {
          const synthesizedRx: Prescription = {
            id: barcodeData.id,
            patientName: barcodeData.patient?.fullName || barcodeData.Patient?.fullName || "Patient",
            doctorName: barcodeData.doctor?.fullName || barcodeData.doctorName || "Doctor",
            createdAt: barcodeData.createdAt || new Date().toISOString(),
            status: barcodeData.status || "PENDING",
            items: (barcodeData.items || []).map((i: any) => ({
              id: i.id,
              drugName: i.medicine?.name || i.drugName || "Medicine",
              dispenseQty: i.dispenseQty || 1,
              dosage: i.dosage,
              frequency: i.frequency,
              duration: i.duration,
              medicineId: i.medicineId,
              medicine: i.medicine
            })),
            visitId: barcodeData.visitId,
            patientId: barcodeData.patientId,
            bookingReference: barcodeData.bookingReference || cleanBarcode,
            doctor: barcodeData.doctor,
            consultationPaid: barcodeData.consultationPaid
          };

          setPendingPrescriptions(prev => {
            if (prev.some(p => p.id === synthesizedRx.id)) return prev;
            return [synthesizedRx, ...prev];
          });

          if (inPosPrescriptionId === synthesizedRx.id) {
            toast.info(`Prescription for ${synthesizedRx.patientName} is already active in POS.`);
            return;
          }

          handleSendToPOS(synthesizedRx);
          return;
        }

        toast.info(`Visit ${cleanBarcode} scanned — no pending prescriptions to send.`);
        return;
      }
    } catch (e) {
      console.warn("Backend barcode lookup failed, continuing with full refresh:", e);
    }

    // 3. Fallback: refresh all pending prescriptions
    fetchPendingPrescriptions().then((fresh) => {
      const rx = fresh.find(r => r.bookingReference === cleanBarcode || r.visitId === cleanBarcode || r.id === cleanBarcode);
      if (rx && inPosPrescriptionId !== rx.id) {
        handleSendToPOS(rx);
      }
    });
  }, [pendingPrescriptions, inPosPrescriptionId, handleSendToPOS, apiFetch, fetchPendingPrescriptions]);

  // Barcode scanner: scanning a token/master barcode triggers Rx auto-send to POS
  useBarcodeScanner(triggerRxSendToPOSByBarcode);

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 relative">
      <div className="hidden">
        {generatedToken && !generatedToken.invoice && (
          <TokenReceipt
            ref={tokenPrintRef}
            tokenId={generatedToken.id}
            tokenNumber={generatedToken.queueNumber}
            doctorName={generatedToken.doctorName}
            patientName={generatedToken.patientName}
            date={new Date().toLocaleDateString()}
            roomNumber={generatedToken.roomNumber}
          />
        )}
        {generatedToken && generatedToken.invoice && (
          <BillReceipt
            ref={billPrintRef}
            queueNumber={generatedToken.queueNumber}
            doctorName={generatedToken.doctorName}
            roomNumber={generatedToken.roomNumber}
            patientName={generatedToken.patientName}
            date={new Date().toISOString()}
            invoice={generatedToken.invoice}
          />
        )}
        {selectedRxForPrint && (
          <PrescriptionReceipt
            ref={prescriptionPrintRef}
            prescriptionId={selectedRxForPrint.id}
            patientName={selectedRxForPrint.patientName}
            patientAge="N/A"
            patientPhone="N/A"
            doctorName={selectedRxForPrint.doctorName}
            date={new Date(selectedRxForPrint.createdAt).toLocaleDateString()}
            medicines={selectedRxForPrint.items.map(item => ({
              name: item.drugName,
              dosage: item.dispenseQty ? `Dispense: ${item.dispenseQty}` : 'As prescribed'
            }))}
          />
        )}
      </div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "reception" | "phone-booking" | "prescriptions")} className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-3 mb-4 bg-background border border-border !h-[48px] p-1">
          <TabsTrigger value="reception" data-testid="tab-walk-in" className="!h-full text-base data-[state=active]:bg-secondary data-[state=active]:text-primary-foreground">
            <Users className="w-5 h-5 mr-2 hidden sm:block" />
            Walk-in
          </TabsTrigger>
          <TabsTrigger value="phone-booking" data-testid="tab-booking" className="!h-full text-base data-[state=active]:bg-secondary data-[state=active]:text-primary-foreground">
            <Phone className="w-5 h-5 mr-2 hidden sm:block" />
            Booking
          </TabsTrigger>
          <TabsTrigger value="prescriptions" data-testid="tab-rx" className="!h-full text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-5 h-5 mr-2 hidden sm:block" />
            Rx
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reception" className="flex-1 flex flex-col gap-4 mt-0 data-[state=inactive]:hidden">
          {/* Patient Search / Registration */}
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
                    resetForm();
                  }}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}

            {patientLookupResult && !selectedPatientId && !isNewPatientForPhone && (
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

          {/* Doctor Selection & Token Generation */}
          <div className="flex-1 bg-background border border-border rounded-lg flex flex-col overflow-hidden">
            <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
              <h3 className="font-medium text-muted-foreground text-sm">Issue Token</h3>

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
                                <span className="text-xs uppercase tracking-wider">{doc.feeType === 'UPFRONT' ? 'Upfront Pay' : 'Post Pay'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs text-muted-foreground">Room</span>
                              <span className="font-medium">{doc.roomNumber || "N/A"}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {doc.isArrived ? (
                                <>
                                  <div className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-semibold">Arrived</div>
                                  {doc.arrivedAt && <span className="text-[10px] text-muted-foreground">at {new Date(doc.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                </>
                              ) : (
                                <>
                                  <div className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-semibold">Scheduled</div>
                                  {doc.expectedStartTime && <span className="text-[10px] text-muted-foreground">for {doc.expectedStartTime}</span>}
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    {(selectedDocId) && (
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
                              if ((e.target as HTMLElement).tagName === 'INPUT') return;
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
                    {(selectedTestIds.size > 0) && (
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
                              if ((e.target as HTMLElement).tagName === 'INPUT') return;
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
                              <div className="text-xs opacity-70 mt-0.5">{svc.barcode}</div>
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
                    {selectedServiceIds.size > 0 && (                      <div className="mt-2 p-4 border-t border-border bg-card flex flex-col gap-3 shrink-0 h-[350px]">
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
            </div>

            <div className="p-4 border-t border-border bg-background mt-auto">
              <Button
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm"
                onClick={handleGenerateToken}
                disabled={!selectedDocId && selectedTestIds.size === 0 && selectedServiceIds.size === 0}
              >
                <Ticket className="w-5 h-5 mr-2" />
                Send to POS Checkout
              </Button>
            </div>
          </div>
        </TabsContent>



        <TabsContent value="phone-booking" className="flex-1 flex flex-col gap-4 mt-0 data-[state=inactive]:hidden">
          <PhoneBookingPane />
        </TabsContent>

        <TabsContent value="prescriptions" className="flex-1 flex flex-col gap-4 mt-0 data-[state=inactive]:hidden">
          <div className="flex-1 bg-background border border-border rounded-lg flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-card flex justify-between items-center">
              <h3 className="font-medium">Pending Prescriptions</h3>
              <div className="flex items-center gap-2">
                <RxHistoryModal />
                {pendingPrescriptions.length > 0 && (
                  <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-1 rounded-full">
                    {pendingPrescriptions.length} New
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={fetchPendingPrescriptions}
                  disabled={rxLoading}
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${rxLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {rxLoading && (
                  <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading prescriptions...</span>
                  </div>
                )}
                {!rxLoading && pendingPrescriptions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                    <FileText className="w-8 h-8 opacity-30" />
                    <p className="text-sm">No pending prescriptions</p>
                  </div>
                )}
                {pendingPrescriptions.map((rx) => {
                  const isInPos = inPosPrescriptionId === rx.id;
                  const isLocked = inPosPrescriptionId !== null && !isInPos;

                  return (
                    <div
                      key={rx.id}
                      data-testid={`rx-card-${rx.id}`}
                      className={`p-4 border rounded-lg flex flex-col gap-3 transition-colors ${isInPos
                        ? "border-primary/50 bg-primary/5"
                        : isLocked
                          ? "border-border bg-card opacity-50"
                          : "border-border bg-card"
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-primary text-sm">
                              RX-{rx.id.slice(-6).toUpperCase()}
                            </h4>
                            {rx.bookingReference && (
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                #{rx.bookingReference}
                              </span>
                            )}
                            {isInPos && (
                              <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full animate-pulse">
                                IN POS
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium">{rx.patientName}</p>
                          <p className="text-xs text-muted-foreground">from {rx.doctorName}</p>
                          {rx.items.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {rx.items.length} medicine(s):{" "}
                              {rx.items.slice(0, 2).map((i) => i.drugName).join(", ")}
                              {rx.items.length > 2 ? "..." : ""}
                            </p>
                          )}
                          {rx.labRequests && rx.labRequests.length > 0 && (
                            <p className="text-xs text-blue-500/80 mt-1">
                              {rx.labRequests.reduce((acc, lr) => acc + lr.tests.length, 0)} lab test(s):{" "}
                              {rx.labRequests.flatMap(lr => lr.tests).slice(0, 2).join(", ")}
                              {rx.labRequests.flatMap(lr => lr.tests).length > 2 ? "..." : ""}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(rx.createdAt).toLocaleTimeString("en-LK", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-border flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => handlePrintClick(rx)}
                        >
                          Print Rx
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-primary hover:bg-primary/90"
                          onClick={() => handleSendToPOS(rx)}
                          disabled={isLocked || isInPos}
                          data-testid={`send-rx-to-pos-${rx.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {isInPos ? "Active in POS" : "Send to POS"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
