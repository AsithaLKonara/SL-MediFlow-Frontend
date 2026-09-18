"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Ticket, Phone, Search, PlusCircle, FileText, CheckCircle, Loader2, FlaskConical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { TokenReceipt } from "./PrintTemplates/TokenReceipt";
import { PrescriptionReceipt } from "./PrintTemplates/PrescriptionReceipt";
import { PhoneBookingPane } from "./PhoneBookingPane";
import { ArrivalsPane } from "./ArrivalsPane";
import { ExternalLabRequestModal } from "./ExternalLabRequestModal";

interface Doctor {
  id: string;
  fullName: string;
}

export function TokenPane() {
  const [searchQuery, setSearchQuery] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientLookupResult, setPatientLookupResult] = useState<{found: boolean; message: string} | null>(null);
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isLabSelected, setIsLabSelected] = useState(false);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<any>(null);
  
  const tokenPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintToken = useReactToPrint({ 
    contentRef: tokenPrintRef,
    onAfterPrint: () => {
      // Reset form AFTER print completes, not before
      setPatientName("");
      setPatientPhone("");
      setPatientAge("");
      setSelectedDocId(null);
      setIsLabSelected(false);
      setGeneratedToken(null);
      setSearchQuery("");
      setPatientLookupResult(null);
    }
  });

  const prescriptionPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintPrescription = useReactToPrint({ contentRef: prescriptionPrintRef });

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/booking/doctors`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setDoctors(res.data);
      })
      .catch(console.error);
  }, []);

  const handleSearchPatient = async () => {
    if (!searchQuery || searchQuery.length < 7) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/reception/patients?q=${searchQuery}`);
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
    if (!selectedDocId && !isLabSelected) {
      toast.error("Please select a doctor or the External Lab first.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const selectedDoc = doctors.find(d => d.id === selectedDocId);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/reception/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patientName || "Walk-in Patient",
          patientPhone,
          ageFallback: patientAge ? parseInt(patientAge, 10) : undefined,
          doctorId: isLabSelected ? null : selectedDocId,
          doctorName: isLabSelected ? "Laboratory" : selectedDoc?.fullName,
          department: isLabSelected ? "LAB" : "CONSULTATION"
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success("Token generated successfully! SMS sent if phone provided.");
        setGeneratedToken(result.data);
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
          <div className="flex-1 bg-background border border-border rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
            <h3 className="font-medium text-muted-foreground text-sm">Issue Token</h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setIsLabModalOpen(true); }}
                className={`p-3 border rounded-lg bg-card hover:border-secondary text-left transition-colors flex flex-col gap-1 border-border`}
              >
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">External Lab Request</span>
                </div>
                <span className="text-xs text-muted-foreground">Select multiple tests directly</span>
              </button>

              {doctors.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDocId(doc.id); setIsLabSelected(false); }}
                  className={`p-3 border rounded-lg bg-card hover:border-secondary text-left transition-colors flex flex-col gap-1 ${
                    selectedDocId === doc.id ? "border-primary ring-1 ring-primary" : "border-border"
                  }`}
                >
                  <span className="font-medium text-sm">{doc.fullName}</span>
                  <span className="text-xs text-muted-foreground">Consultation</span>
                </button>
              ))}
            </div>

            <div className="mt-auto pt-4 border-t border-border">
              <Button 
                className="w-full h-12 text-lg bg-secondary hover:bg-secondary/90" 
                onClick={handleGenerateToken}
                disabled={isGenerating || (!selectedDocId && !isLabSelected)}
              >
                {isGenerating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Ticket className="w-5 h-5 mr-2" />}
                {isGenerating ? "Processing..." : "Register & Generate Token"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <ExternalLabRequestModal isOpen={isLabModalOpen} onClose={() => setIsLabModalOpen(false)} />

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
              <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-1 rounded-full">2 New</span>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {[
                  { id: "RX-1001", patient: "Nimal Perera", doctor: "Dr. Silva", time: "2 min ago", status: "PENDING" },
                  { id: "RX-1002", patient: "Saman Kumara", doctor: "Dr. Fernando", time: "15 min ago", status: "PENDING" },
                ].map((rx) => (
                  <div key={rx.id} className="p-4 border border-border rounded-lg bg-card flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-primary">{rx.id}</h4>
                        <p className="text-sm font-medium">{rx.patient}</p>
                        <p className="text-xs text-muted-foreground">from {rx.doctor}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{rx.time}</span>
                    </div>

                    <div className="pt-3 border-t border-border flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 border-primary/30 text-primary hover:bg-primary/10" onClick={() => handlePrintPrescription()}>
                        Print Rx
                      </Button>
                      <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Send to POS
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
