"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Ticket, Phone, Search, PlusCircle, FileText, CheckCircle, Loader2, FlaskConical, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { TokenReceipt } from "./PrintTemplates/TokenReceipt";
import { PrescriptionReceipt } from "./PrintTemplates/PrescriptionReceipt";
import { PhoneBookingPane } from "./PhoneBookingPane";
import { ArrivalsPane } from "./ArrivalsPane";
import { ExternalLabRequestModal } from "./ExternalLabRequestModal";
import { useRxToPOS, CartItem } from "../hooks/useCartSync";

interface Doctor {
  id: string;
  fullName: string;
  specialty?: string;
  roomNumber?: string;
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
}

export function TokenPane() {
  const { sendToPOS, onRxStatusUpdate } = useRxToPOS();
  const [searchQuery, setSearchQuery] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientLookupResult, setPatientLookupResult] = useState<{found: boolean; message: string} | null>(null);
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [labCatalog, setLabCatalog] = useState<LabTest[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [pendingPrescriptions, setPendingPrescriptions] = useState<Prescription[]>([]);
  const [rxLoading, setRxLoading] = useState(false);
  /** ID of the prescription currently locked in the POS */
  const [inPosPrescriptionId, setInPosPrescriptionId] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<GeneratedToken | null>(null);
  
  const tokenPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintToken = useReactToPrint({ 
    contentRef: tokenPrintRef,
    onAfterPrint: () => {
      // Reset form AFTER print completes, not before
      setPatientName("");
      setPatientPhone("");
      setPatientAge("");
      setSelectedDocId(null);
      setSelectedTestIds(new Set());
      setGeneratedToken(null);
      setSearchQuery("");
      setPatientLookupResult(null);
    }
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
      })
    ]).then(([docRes, labRes]) => {
      if (docRes.success) setDoctors(docRes.data);
      if (Array.isArray(labRes)) setLabCatalog(labRes);
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

  const handleSearchPatient = async () => {
    if (!searchQuery || searchQuery.length < 7) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/patients?q=${searchQuery}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const found = data.data[0];
        setPatientName(found.fullName);
        setPatientPhone(found.phone);
        setPatientLookupResult({ found: true, message: `Patient found: ${found.fullName}` });
      } else {
        setPatientLookupResult({ found: false, message: "No patient found. Fill in details to register new patient." });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateToken = async () => {
    if (!selectedDocId && selectedTestIds.size === 0) {
      toast.error("Please select a doctor or at least one lab test.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const selectedDoc = doctors.find(d => d.id === selectedDocId);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patientName || "Walk-in Patient",
          patientPhone,
          ageFallback: patientAge ? parseInt(patientAge, 10) : undefined,
          doctorId: selectedDocId,
          doctorName: selectedDoc?.fullName,
          testIds: Array.from(selectedTestIds)
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success("Token generated successfully! SMS sent if phone provided.");
        setGeneratedToken({
          ...result.data,
          roomNumber: selectedDoc?.roomNumber || undefined
        });
        // Print receipt - form reset now happens in onAfterPrint callback
        setTimeout(() => handlePrintToken(), 300);
      } else {
        toast.error(result.error || "Failed to generate token.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error connecting to server.");
    } finally {
      setIsGenerating(false);
    }
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
        qty: item.dispenseQty ?? 1,
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
        {generatedToken && (
          <TokenReceipt 
            ref={tokenPrintRef} 
            tokenNumber={generatedToken.queueNumber} 
            doctorName={generatedToken.doctorName} 
            patientName={generatedToken.patientName} 
            date={new Date().toLocaleDateString()} 
            roomNumber={generatedToken.roomNumber}
          />
        )}
        <PrescriptionReceipt 
          ref={prescriptionPrintRef}
          patientName="Nimal Perera"
          patientAge="45"
          patientPhone="0771234567"
          doctorName="Dr. Silva"
          date={new Date().toLocaleDateString()}
          medicines={[
            { name: "Paracetamol 500mg", dosage: "2 pills after meals" },
            { name: "Amoxicillin 250mg", dosage: "1 pill before meals" }
          ]}
        />
      </div>
      <Tabs defaultValue="reception" className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-4 mb-4 bg-background border border-border h-12 p-1">
          <TabsTrigger value="reception" className="h-full data-[state=active]:bg-secondary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4 mr-2 hidden sm:block" />
            Walk-in
          </TabsTrigger>
          <TabsTrigger value="phone-booking" className="h-full data-[state=active]:bg-secondary data-[state=active]:text-primary-foreground">
            <Phone className="w-4 h-4 mr-2 hidden sm:block" />
            Booking
          </TabsTrigger>
          <TabsTrigger value="arrivals" className="h-full data-[state=active]:bg-secondary data-[state=active]:text-primary-foreground">
            <CheckCircle className="w-4 h-4 mr-2 hidden sm:block" />
            Arrivals
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
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by phone number..."
                  className="pl-9 bg-card border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={handleSearchPatient}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchPatient()}
                />
              </div>
              <Button variant="secondary" className="bg-muted hover:bg-neutral-700" onClick={handleSearchPatient}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
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

              <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Select Doctor</h4>
                <div className="grid grid-cols-2 gap-2">
                  {doctors.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-3 border rounded-lg bg-card transition-colors flex flex-col gap-2 ${
                        selectedDocId === doc.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-secondary"
                      }`}
                    >
                      <button
                        onClick={() => setSelectedDocId(doc.id === selectedDocId ? null : doc.id)}
                        className="text-left flex flex-col gap-1 w-full"
                      >
                        <span className="font-medium text-sm">{doc.fullName}</span>
                        <span className="text-xs text-muted-foreground">{doc.specialty || "Consultation"}</span>
                      </button>
                      <div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-border text-xs text-muted-foreground">
                        <span>Room: {doc.roomNumber || "N/A"}</span>
                        {/* We don't have isArrived exposed yet in the interface but it comes from backend */}
                        {(doc as any).isArrived && (
                          <span className="text-green-500 font-medium">Arrived</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Lab Tests</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2">
                  {labCatalog.map((test) => (
                    <button
                      key={test.id}
                      onClick={() => {
                        const newSet = new Set(selectedTestIds);
                        if (newSet.has(test.id)) newSet.delete(test.id);
                        else newSet.add(test.id);
                        setSelectedTestIds(newSet);
                      }}
                      className={`flex justify-between items-center p-3 rounded-lg border text-left transition-colors ${
                        selectedTestIds.has(test.id)
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-card border-border hover:border-primary/50"
                      }`}
                    >
                      <div>
                        <div className="font-medium text-sm">{test.name}</div>
                        <div className="text-xs opacity-70">{test.code}</div>
                      </div>
                      <div className="font-semibold text-sm">Rs. {test.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            </div>

            <div className="p-4 border-t border-border bg-background mt-auto">
              <Button 
                className="w-full h-12 text-lg bg-secondary hover:bg-secondary/90" 
                onClick={handleGenerateToken}
                disabled={isGenerating || (!selectedDocId && selectedTestIds.size === 0)}
              >
                {isGenerating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Ticket className="w-5 h-5 mr-2" />}
                {isGenerating ? "Processing..." : "Register & Generate Token"}
              </Button>
            </div>
          </div>
        </TabsContent>



        <TabsContent value="phone-booking" className="flex-1 flex flex-col gap-4 mt-0 data-[state=inactive]:hidden">
          <PhoneBookingPane />
        </TabsContent>

        <TabsContent value="arrivals" className="flex-1 flex flex-col gap-4 mt-0 data-[state=inactive]:hidden">
          <ArrivalsPane />
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
                          onClick={() => handlePrintPrescription()}
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
