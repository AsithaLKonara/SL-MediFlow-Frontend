"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Ticket, Phone, Search, PlusCircle, FileText, CheckCircle, Loader2, FlaskConical, RefreshCw, UserRound, Stethoscope, FilePlus2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { TokenReceipt } from "./PrintTemplates/TokenReceipt";
import { BillReceipt } from "./PrintTemplates/BillReceipt";
import { PrescriptionReceipt } from "./PrintTemplates/PrescriptionReceipt";
import { PhoneBookingPane } from "./PhoneBookingPane";
import { ExternalLabRequestModal } from "./ExternalLabRequestModal";
import { useRxToPOS, CartItem } from "../hooks/useCartSync";

interface Doctor {
  id: string;
  fullName: string;
  specialty?: string;
  roomNumber?: string;
  feeType?: string;
  consultationFee?: number;
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
  const { sendToPOS, sendTokenToPOS, onRxStatusUpdate } = useRxToPOS();
  const [searchQuery, setSearchQuery] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientLookupResult, setPatientLookupResult] = useState<{found: boolean; message: string} | null>(null);
  
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
  
  const resetForm = () => {
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

  const fetchPendingPrescriptions = useCallback(async () => {
    setRxLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/pending`);
      if (!res.ok) throw new Error("Failed to fetch prescriptions");
      const data: Prescription[] = await res.json();
      setPendingPrescriptions(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load pending prescriptions.");
    } finally {
      setRxLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/doctors`).then(r => {
        if (!r.ok) throw new Error("Failed to fetch doctors");
        return r.json();
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/catalog`).then(r => {
        if (!r.ok) throw new Error("Failed to fetch lab catalog");
        return r.json();
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services`).then(r => {
        if (!r.ok) throw new Error("Failed to fetch extra services");
        return r.json();
      })
    ]).then(([docRes, labRes, svcRes]) => {
      if (docRes.success) setDoctors(docRes.data);
      if (Array.isArray(labRes)) setLabCatalog(labRes);
      if (Array.isArray(svcRes)) setExtraServicesCatalog(svcRes);
    }).catch((e) => {
      console.error(e);
      toast.error("Failed to load initial data. Server might be offline.");
    });

    // Load prescriptions on mount
    fetchPendingPrescriptions();
  }, [fetchPendingPrescriptions]);

  // Listen for status updates from POSPane (via BroadcastChannel)
  useEffect(() => {
    onRxStatusUpdate((update) => {
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
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        setPatientPhone(searchQuery); // auto-sync with phone
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/patients?q=${searchQuery}`)
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
    setSearchQuery(patient.phone);
    setPatientPhone(patient.phone);
    setPatientName(patient.fullName);
    setPatientAge(patient.ageFallback ? patient.ageFallback.toString() : "");
    setIsPatientSearchOpen(false);
    setPatientLookupResult({ found: true, message: `Selected: ${patient.fullName}` });
  };

  const handleGenerateToken = async () => {
    if (!selectedDocId && selectedTestIds.size === 0 && selectedServiceIds.size === 0) {
      toast.error("Please select a doctor, lab test, or extra service.");
      return;
    }
    
    const selectedDoc = doctors.find(d => d.id === selectedDocId);
    let expectedTotal = 0;
    let isUpfront = false;

    if (selectedDoc) {
      const isNonOPD = selectedDoc.specialty && selectedDoc.specialty !== "General" && selectedDoc.specialty.toUpperCase() !== "OPD";
      if (isNonOPD && selectedDoc.feeType === "UPFRONT") {
        expectedTotal += (selectedDoc.consultationFee || 2500);
        isUpfront = true;
      }
    }

    Array.from(selectedTestIds).forEach(testId => {
      const test = labCatalog.find(t => t.id === testId);
      if (test) {
        expectedTotal += customLabPrices[test.id] !== undefined ? customLabPrices[test.id] : test.price;
      }
    });

    Array.from(selectedServiceIds).forEach(svcId => {
      const svc = extraServicesCatalog.find(s => s.id === svcId);
      if (svc) {
        expectedTotal += customServicePrices[svc.id] !== undefined ? customServicePrices[svc.id] : svc.price;
      }
    });

    sendTokenToPOS({
      patientName: patientName || "Walk-in Patient",
      patientPhone,
      ageFallback: patientAge ? parseInt(patientAge, 10) : undefined,
      doctorId: selectedDocId,
      doctorName: selectedDoc?.fullName,
      testIds: Array.from(selectedTestIds),
      customLabPrices,
      serviceIds: Array.from(selectedServiceIds),
      customServicePrices,
      expectedTotal,
      isUpfront
    });
    
    toast.success("Token sent to POS for Checkout.");
    resetForm();
  };

  const handleSendToPOS = (rx: Prescription) => {
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
      toast.warning("No medicines with stock info found in this prescription. Prices may not be available yet.");
      return;
    }

    // Optimistically lock UI immediately (POSPane will also broadcast IN_PROGRESS back)
    setInPosPrescriptionId(rx.id);
    sendToPOS(cartItems, rx.id);
    toast.success(`${cartItems.length} medicine(s) sent to POS — complete checkout to dispense.`);
  };

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
      <Tabs defaultValue="reception" className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-3 mb-4 bg-background border border-border h-12 p-1">
          <TabsTrigger value="reception" className="h-full data-[state=active]:bg-secondary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4 mr-2 hidden sm:block" />
            Walk-in
          </TabsTrigger>
          <TabsTrigger value="phone-booking" className="h-full data-[state=active]:bg-secondary data-[state=active]:text-primary-foreground">
            <Phone className="w-4 h-4 mr-2 hidden sm:block" />
            Booking
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4 mr-2 hidden sm:block" />
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
                          className={`w-full p-4 border rounded-lg transition-colors flex items-center justify-between gap-4 outline-none text-left ${
                            selectedDocId === doc.id ? "border-primary ring-1 ring-primary bg-primary/5" : "bg-card border-border hover:border-secondary"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedDocId === doc.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                              <UserRound className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-base">{doc.fullName}</span>
                              <span className="text-sm text-muted-foreground">{doc.specialty || "Consultation"}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs text-muted-foreground">Room</span>
                              <span className="font-medium">{doc.roomNumber || "N/A"}</span>
                            </div>
                            {(doc as any).isArrived ? (
                              <div className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-semibold">Arrived</div>
                            ) : (
                              <div className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-semibold">Scheduled</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
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
                                  setCustomLabPrices(prev => ({...prev, [test.id]: test.price}));
                                }
                              }
                              setSelectedTestIds(newSet);
                            }}
                            className={`flex justify-between items-center p-4 rounded-lg border text-left transition-colors cursor-pointer outline-none ${
                              isSelected
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
                                    onChange={(e) => setCustomLabPrices(prev => ({...prev, [test.id]: Number(e.target.value)}))}
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
                                  setCustomServicePrices(prev => ({...prev, [svc.id]: svc.price}));
                                }
                              }
                              setSelectedServiceIds(newSet);
                            }}
                            className={`flex justify-between items-center p-4 rounded-lg border text-left transition-colors cursor-pointer outline-none ${
                              isSelected
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
                                    onChange={(e) => setCustomServicePrices(prev => ({...prev, [svc.id]: Number(e.target.value)}))}
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
                variant="secondary"
                className="w-full h-12 text-lg hover:bg-secondary/90 bg-primary/10 text-primary border border-primary/20 hover:border-primary/50" 
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
                      className={`p-4 border rounded-lg flex flex-col gap-3 transition-colors ${
                        isInPos
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
