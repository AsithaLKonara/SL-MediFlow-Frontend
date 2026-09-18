"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Ticket, Phone, Search, PlusCircle, FileText, CheckCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReactToPrint } from "react-to-print";
import { TokenReceipt } from "./PrintTemplates/TokenReceipt";
import { PrescriptionReceipt } from "./PrintTemplates/PrescriptionReceipt";

interface Doctor {
  id: string;
  fullName: string;
  email: string;
}

interface PatientData {
  id?: string;
  fullName: string;
  age: string;
  phone: string;
}

export function TokenPane({ onSendToPOS }: { onSendToPOS?: (rx: any) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [patient, setPatient] = useState<PatientData>({ fullName: "", age: "", phone: "" });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingPrescriptions, setPendingPrescriptions] = useState<any[]>([]);
  
  // Data for the printed receipt
  const [receiptData, setReceiptData] = useState<{
    tokenNumber: string;
    doctorName: string;
    patientName: string;
    date: string;
  }>({
    tokenNumber: "",
    doctorName: "",
    patientName: "",
    date: "",
  });

  const tokenPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintToken = useReactToPrint({ 
    contentRef: tokenPrintRef,
    onAfterPrint: () => {
      // Clear form after print
      setPatient({ fullName: "", age: "", phone: "" });
      setSearchQuery("");
      setSelectedDoctorId(null);
    }
  });

  const prescriptionPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintPrescription = useReactToPrint({ contentRef: prescriptionPrintRef });

  useEffect(() => {
    fetch("http://localhost:5000/api/users?role=DOCTOR")
      .then(res => res.json())
      .then(data => setDoctors(data))
      .catch(err => console.error("Failed to fetch doctors", err));
      
    fetchPendingPrescriptions();
  }, []);

  const fetchPendingPrescriptions = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/prescriptions/pending`)
      .then(res => res.json())
      .then(data => setPendingPrescriptions(data))
      .catch(err => console.error("Failed to fetch pending prescriptions", err));
  };

  const handleSearchPatient = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`http://localhost:5000/api/patients/search?phone=${searchQuery}`);
      if (res.ok) {
        const data = await res.json();
        setPatient({
          id: data.id,
          fullName: data.fullName,
          phone: data.phone,
          age: data.age?.toString() || ""
        });
      } else {
        // Patient not found, auto fill phone for new registration
        setPatient(prev => ({ ...prev, phone: searchQuery, fullName: "", age: "", id: undefined }));
        alert("Patient not found. Please register as new.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!patient.fullName || !patient.phone) {
      alert("Please provide patient name and phone number.");
      return;
    }
    if (!selectedDoctorId) {
      alert("Please select a doctor.");
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Create or Update Patient
      const patientRes = await fetch("http://localhost:5000/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: patient.fullName,
          phone: patient.phone,
          age: patient.age
        })
      });
      
      if (!patientRes.ok) throw new Error("Failed to register patient");
      const patientData = await patientRes.json();

      // 2. Generate Token
      const tokenRes = await fetch("http://localhost:5000/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patientData.id,
          doctorId: selectedDoctorId
        })
      });

      if (!tokenRes.ok) throw new Error("Failed to generate token");
      const tokenData = await tokenRes.json();

      // 3. Populate Receipt Data
      setReceiptData({
        tokenNumber: tokenData.tokenNumber,
        doctorName: tokenData.doctor.fullName,
        patientName: patientData.fullName,
        date: new Date().toLocaleDateString()
      });

      // 4. Print Token (using setTimeout to ensure state updates before printing)
      setTimeout(() => {
        handlePrintToken();
      }, 100);

    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 relative">
      <div className="hidden">
        <TokenReceipt 
          ref={tokenPrintRef} 
          tokenNumber={receiptData.tokenNumber} 
          doctorName={receiptData.doctorName} 
          patientName={receiptData.patientName} 
          date={receiptData.date} 
        />
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
        <TabsList className="grid w-full grid-cols-2 mb-4 bg-background border border-border">
          <TabsTrigger value="reception" className="data-[state=active]:bg-secondary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4 mr-2" />
            Tokens & Registration
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4 mr-2" />
            Prescriptions
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
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchPatient()}
                />
              </div>
              <Button variant="secondary" className="bg-muted hover:bg-neutral-700" onClick={handleSearchPatient} disabled={isSearching}>
                {isSearching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Search
              </Button>
            </div>

            {/* Quick Registration Form */}
            <div className="pt-2 border-t border-border mt-2 space-y-4">
              <h3 className="font-medium text-muted-foreground text-sm flex items-center gap-2">
                <PlusCircle className="w-4 h-4" /> Quick Register
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Full Name</label>
                  <Input 
                    placeholder="John Doe" 
                    className="bg-card border-border" 
                    value={patient.fullName}
                    onChange={(e) => setPatient({...patient, fullName: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Age</label>
                  <Input 
                    type="number" 
                    placeholder="45" 
                    className="bg-card border-border" 
                    value={patient.age}
                    onChange={(e) => setPatient({...patient, age: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <Input 
                    placeholder="077..." 
                    className="bg-card border-border" 
                    value={patient.phone}
                    onChange={(e) => setPatient({...patient, phone: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Doctor Selection & Token Generation */}
          <div className="flex-1 bg-background border border-border rounded-lg p-4 flex flex-col gap-4">
            <h3 className="font-medium text-muted-foreground text-sm">Issue Token (Select Doctor)</h3>

            <div className="grid grid-cols-2 gap-2">
              {doctors.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoctorId(doc.id)}
                  className={`p-3 border rounded-lg text-left transition-colors flex items-start gap-2 ${
                    selectedDoctorId === doc.id 
                      ? "border-primary bg-primary/10" 
                      : "border-border bg-card hover:border-secondary"
                  }`}
                >
                  <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border ${selectedDoctorId === doc.id ? "border-primary flex items-center justify-center" : "border-muted-foreground"}`}>
                    {selectedDoctorId === doc.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm">{doc.fullName}</span>
                    <span className="text-xs text-muted-foreground">Doctor</span>
                  </div>
                </button>
              ))}
              {doctors.length === 0 && (
                <div className="col-span-2 text-sm text-muted-foreground p-4 text-center">
                  No doctors available. Ensure you have seeded doctors in the database.
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-border">
              <Button 
                className="w-full h-12 text-lg bg-secondary hover:bg-secondary/90" 
                onClick={handleGenerateToken}
                disabled={isGenerating || !selectedDoctorId || !patient.fullName || !patient.phone}
              >
                {isGenerating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Ticket className="w-5 h-5 mr-2" />}
                Register & Generate Token
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="prescriptions" className="flex-1 flex flex-col gap-4 mt-0 data-[state=inactive]:hidden">
          <div className="flex-1 bg-background border border-border rounded-lg flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-card flex justify-between items-center">
              <h3 className="font-medium">Pending Prescriptions</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchPendingPrescriptions}>Refresh</Button>
                {pendingPrescriptions.length > 0 && <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-1 rounded-full">{pendingPrescriptions.length} New</span>}
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {pendingPrescriptions.map((rx) => {
                  const minutesAgo = Math.floor((new Date().getTime() - new Date(rx.updatedAt).getTime()) / 60000);
                  const timeText = minutesAgo < 1 ? "Just now" : `${minutesAgo} min ago`;
                  return (
                    <div key={rx.id} className="p-4 border border-border rounded-lg bg-card flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-primary">{rx.id}</h4>
                          <p className="text-sm font-medium">{rx.patientName}</p>
                          <p className="text-xs text-muted-foreground">from {rx.doctorName}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{timeText}</span>
                      </div>

                      <div className="pt-3 border-t border-border flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 border-primary/30 text-primary hover:bg-primary/10" onClick={() => handlePrintPrescription()}>
                          Print Rx
                        </Button>
                        <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90" onClick={() => onSendToPOS && onSendToPOS(rx)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Send to POS
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {pendingPrescriptions.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground text-sm">
                    No pending prescriptions at this time.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
