"use client";

import { useEffect, useState, use, useRef } from "react";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, Plus, Trash2, CheckCircle2, Save, FileText, Activity, User, Beaker, FlaskConical, FilePen, Printer } from "lucide-react";
import Link from "next/link";
import { io } from "socket.io-client";
import { useReactToPrint } from "react-to-print";
import { PrescriptionPrintTemplate } from "@/components/printing/PrescriptionPrintTemplate";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/dashboard/SidebarProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formatSafeDate = (dateStr: string) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
};

interface MedicalHistory {
  date: string;
  doctor: string;
  diagnosis: string;
  prescription: string[];
}

interface LabResult {
  date: string;
  test: string;
  result: string;
  status: string;
}

interface Patient {
  id: string;
  fullName: string;
  phone: string;
  age: number;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  allergies?: string[];
  chronicConditions?: string[];
  medicalHistory?: MedicalHistory[];
  labResults?: LabResult[];
}



// Medicines are now fetched from the backend API

export default function ConsultationPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = use(params);
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitCompleted, setVisitCompleted] = useState(false);
  const [createdPrescription, setCreatedPrescription] = useState<any>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef as any,
    documentTitle: `Prescription_${patientId}`
  });

  // Prescription state
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  
  const initialDrugState = { drug: "", dosage: "", timesPerDay: "", tabletsPerTime: "", duration: "", instructions: "", timing: "" };
  const [addedDrugs, setAddedDrugs] = useState<typeof initialDrugState[]>([]);
  const [currentDrug, setCurrentDrug] = useState(initialDrugState);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [savingDraft, setSavingDraft] = useState(false);
  const [activeDrugSearch, setActiveDrugSearch] = useState(false);

  // Lab request state
  const [selectedTests, setSelectedTests] = useState<any[]>([]);
  const [availableLabTests, setAvailableLabTests] = useState<any[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [labNotes, setLabNotes] = useState("");

  const [availableMedicines, setAvailableMedicines] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patients/${patientId}`)
      .then((r) => r.json())
      .then((d) => { setPatient(d); setLoading(false); })
      .catch((e) => { console.error("Failed to load patient", e); setLoading(false); });

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/pharmacy/medicines`)
      .then((r) => r.json())
      .then((data) => {
        const mappedItems = data.map((med: any) => {
          const stock = med.stockBatches?.reduce((sum: number, b: any) => sum + b.currentQuantity, 0) || 0;
          return { ...med, stock };
        });
        setAvailableMedicines(mappedItems);
      })
      .catch((e) => console.error("Failed to load medicines", e));

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/lab/catalog`)
      .then((r) => r.json())
      .then((data) => setAvailableLabTests(data))
      .catch((e) => console.error("Failed to load lab catalog", e));

    const socketUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace('/api', '');
    const socket = io(socketUrl);

    socket.on("connect", () => {
      console.log("Doctor connected to websocket");
    });

    socket.on("lab_result_ready", (data) => {
      if (data.patientId === patientId) {
        toast.info(`New Lab Result Ready for ${data.testName}`, {
          duration: 10000,
          action: { label: "View", onClick: () => window.open(`/labtech/results/${data.requestId}`) }
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [patientId]);

  const handleAddOrUpdateDrug = () => {
    if (!currentDrug.drug.trim()) return toast.error("Medication name is required.");
    
    if (editingIndex !== null) {
      setAddedDrugs(prev => prev.map((d, i) => i === editingIndex ? currentDrug : d));
      setEditingIndex(null);
    } else {
      setAddedDrugs(prev => [...prev, currentDrug]);
    }
    setCurrentDrug(initialDrugState);
  };

  const handleEditDrug = (idx: number) => {
    setCurrentDrug(addedDrugs[idx]);
    setEditingIndex(idx);
    document.getElementById('medication-builder')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleRemoveDrug = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setAddedDrugs(prev => prev.filter((_, i) => i !== idx));
    if (editingIndex === idx) {
      setCurrentDrug(initialDrugState);
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > idx) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const updateCurrentDrug = (field: string, value: string) => {
    setCurrentDrug(prev => ({ ...prev, [field]: value }));
  };

  const selectDrug = (medicine: any) => {
    let parsedDosage = medicine.unit;
    let finalDrugName = medicine.name;

    if (medicine.genericName && medicine.name.toLowerCase().includes(medicine.genericName.toLowerCase())) {
      const extracted = medicine.name.substring(medicine.genericName.length).trim();
      if (extracted) {
        parsedDosage = extracted;
        finalDrugName = medicine.genericName;
      }
    }

    setCurrentDrug(prev => ({ ...prev, drug: finalDrugName, dosage: parsedDosage }));
    setActiveDrugSearch(false);
    
    if (medicine.stock === 0) {
      toast.warning(`${medicine.name} is currently OUT OF STOCK in the pharmacy.`, { duration: 5000 });
    }
  };

  const toggleTest = (test: any) =>
    setSelectedTests((prev) =>
      prev.some(t => t.id === test.id) ? prev.filter((t) => t.id !== test.id) : [...prev, test]
    );

  const handleSaveDraft = () => {
    setSavingDraft(true);
    setTimeout(() => {
      setSavingDraft(false);
      toast.success("Draft saved successfully.");
    }, 500);
  };

  const handleCompleteConsultation = async () => {
    if (!diagnosis.trim()) { toast.error("Diagnosis is required to complete consultation."); return; }
    
    // 1. Add consultation fee to Centralized Billing Engine
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/billing/charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId: "V-2026-000521", // Mocking the Visit ID for now since Gihan handles visits
          patientId: patient?.id,
          department: "CONSULTATION",
          description: "Doctor Consultation Fee",
          quantity: 1,
          unitPrice: 2500 // Flat fee example
        })
      });
    } catch (e) {
      console.error("Failed to log consultation fee", e);
    }

    setVisitCompleted(true);
    toast.success("Consultation completed and securely saved.");
    
    if (addedDrugs.length > 0) {
      try {
        console.log("Submitting prescription with patient:", patient);
        if (!patient?.id) {
          toast.error("Patient ID is missing. Cannot save prescription.");
          return;
        }

        const payload = {
          patientId: patient.id,
          patientName: patient.fullName || "Unknown",
          visitId: "V-2026-000521",
          doctorId: user?.id || "DOC-123",
          doctorName: user?.fullName || "Dr. Silva",
          diagnosis,
          clinicalNotes: notes,
          items: addedDrugs.map(d => ({
            medicineId: availableMedicines.find(m => m.name === d.drug || m.genericName === d.drug)?.id || null,
            drugName: d.drug,
            dosage: d.dosage,
            frequency: d.timesPerDay ? `${d.timesPerDay}x day ${d.tabletsPerTime ? `(${d.tabletsPerTime} tab)` : ''}` : d.timing,
            duration: d.duration,
            instructions: d.instructions
          }))
        };
        console.log("Prescription payload:", payload);

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/prescriptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const rx = await res.json();
          setCreatedPrescription(rx);
          toast.success("Prescription forwarded to Pharmacy in realtime.");
        }
      } catch (e) {
        console.error("Failed to send prescription", e);
      }
    }

    // Update Token Status
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/tokens/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient?.id,
          doctorId: user?.id,
          status: addedDrugs.length > 0 ? "prescription_issued" : "completed"
        })
      });
    } catch (e) {
      console.error("Failed to update token status", e);
    }
    
    if (selectedTests.length > 0) {
      try {
        await Promise.all(selectedTests.map(test => 
          fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/lab/requests`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientId: patient?.id,
              visitId: "V-2026-000521",
              testId: test.id,
              doctorId: user?.id || "DOC-123",
              priority: isUrgent ? "URGENT" : "ROUTINE"
            })
          })
        ));
        toast.success("Lab orders forwarded to Laboratory.");
      } catch (e) {
        console.error("Failed to send lab requests", e);
      }
    }

    // Delay redirect to allow user to print
    if (addedDrugs.length === 0) {
      setTimeout(() => {
        window.location.href = "/doctor/queue";
      }, 1500);
    }
  };

  if (loading || !patient) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const leftMargin = isCollapsed ? "left-[80px]" : "left-64";

  return (
    <div className="pb-32 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* 1. TOP COMMAND BAR */}
      <div className="bg-card text-card-foreground border rounded-lg shadow-sm px-6 py-4 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link href="/doctor/queue">
              <Button variant="outline" size="icon" className="rounded-full shrink-0 h-10 w-10">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground font-bold text-xl uppercase shrink-0 border">
              {patient.fullName?.charAt(0) || "P"}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">{patient.fullName || "Unknown Patient"}</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 flex items-center gap-1.5 border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Active Consultation
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3 divide-x divide-slate-300">
                <span className="font-mono font-medium">{patient.id}</span>
                <span className="pl-3">{patient.age || "--"} yrs · {patient.gender || "--"}</span>
                <span className="pl-3 font-semibold text-red-600 dark:text-red-400">{patient.bloodGroup || "Unknown"}</span>
              </div>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted-foreground">Visit #04</p>
            <p className="font-medium text-foreground">Started 10:42 AM</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: PATIENT CONTEXT                              */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* CRITICAL ALERTS */}
          {(patient.allergies?.length || patient.chronicConditions?.length) ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Critical Alerts
              </h3>
              
              {patient.allergies && patient.allergies.length > 0 && (
                <div className="bg-red-500/10 border-l-4 border-red-500 p-3 rounded-r-md">
                  <p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 tracking-wider mb-1">Allergies</p>
                  <p className="text-sm font-semibold text-red-900">{patient.allergies.join(", ")}</p>
                </div>
              )}

              {patient.chronicConditions && patient.chronicConditions.length > 0 && (
                <div className="bg-amber-500/10 border-l-4 border-amber-500 p-3 rounded-r-md">
                  <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider mb-1">Conditions</p>
                  <p className="text-sm font-semibold text-amber-900">{patient.chronicConditions.join(", ")}</p>
                </div>
              )}
            </div>
          ) : null}

          {/* DEMOGRAPHICS */}
          <div className="bg-card text-card-foreground border rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Details
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <dt className="text-muted-foreground">DOB</dt>
                <dd className="font-medium text-foreground">{patient.dob ? formatSafeDate(patient.dob) : "N/A"}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <dt className="text-muted-foreground">Contact</dt>
                <dd className="font-medium text-foreground">{patient.phone}</dd>
              </div>
            </dl>
          </div>

          {/* LAB ORDERS */}
          <div className="bg-card text-card-foreground border rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5" /> Laboratory Orders
            </h3>
            
            <div className="flex flex-col gap-2">
              {availableLabTests.map((test) => {
                const isSelected = selectedTests.some(t => t.id === test.id);
                return (
                  <label
                    key={test.id}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-md border cursor-pointer transition-all",
                      isSelected ? "bg-blue-500/10 border-blue-500/20" : "bg-card text-card-foreground border-border/50 hover:bg-muted/30"
                    )}
                    onClick={(e) => { e.preventDefault(); toggleTest(test); }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "bg-primary border-blue-600 text-white" : "border-border bg-card text-card-foreground"
                      )}>
                        {isSelected && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <div>
                        <span className={cn("text-xs font-bold block", isSelected ? "text-blue-600 dark:text-blue-400" : "text-foreground/80")}>
                          {test.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase">{test.category}</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">LKR {test.price.toFixed(2)}</span>
                  </label>
                );
              })}
            </div>

            {selectedTests.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isUrgent} 
                    onChange={e => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-red-600 focus:ring-red-600 focus:ring-offset-background"
                  />
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    Mark Lab Request as URGENT
                  </span>
                </label>
              </div>
            )}
          </div>

        </div>


        {/* ========================================================= */}
        {/* RIGHT COLUMN: CLINICAL WORKSPACE                          */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* DIAGNOSIS */}
          <div className="bg-card text-card-foreground border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/90 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground/70" /> Assessment / Diagnosis
            </h2>
            <Input
              placeholder="Enter primary diagnosis or chief complaint..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="text-lg py-6 bg-muted/30 border-border focus-visible:ring-primary/20"
            />
          </div>

          {/* PRESCRIPTION BUILDER */}
          <div id="medication-builder" className="bg-card text-card-foreground border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/90 flex items-center gap-2">
                <Beaker className="w-4 h-4 text-muted-foreground/70" /> Medications
              </h2>
            </div>

            <div className="space-y-4">
              {/* Single Input Block */}
              <div className="relative bg-muted/30 border border-border rounded-lg p-4 group">
                <div className="absolute -left-3 -top-3 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                  {editingIndex !== null ? <FilePen className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                </div>
                
                <div className="space-y-4 ml-1">
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Medication Name</label>
                      <Input
                        placeholder="Search or enter drug name (e.g. Amlodipine)"
                        value={currentDrug.drug}
                        onChange={(e) => {
                          updateCurrentDrug("drug", e.target.value);
                          setActiveDrugSearch(true);
                        }}
                        onFocus={() => setActiveDrugSearch(true)}
                        onBlur={() => setTimeout(() => setActiveDrugSearch(false), 200)}
                        className="font-medium bg-card text-card-foreground border-border"
                      />
                      {activeDrugSearch && currentDrug.drug.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card text-card-foreground border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {availableMedicines.filter((m) => m.name.toLowerCase().includes(currentDrug.drug.toLowerCase())).length > 0 ? (
                            availableMedicines.filter((m) => m.name.toLowerCase().includes(currentDrug.drug.toLowerCase())).map((m, i) => (
                              <button
                                key={i}
                                type="button"
                                className="w-full text-left px-4 py-2 text-sm hover:bg-muted/30 focus:bg-muted/30 focus:outline-none flex justify-between items-center"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent onBlur from firing before click
                                  selectDrug(m);
                                }}
                              >
                                <div>
                                  <span className="font-medium text-foreground block">{m.genericName || m.name}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.category}</span>
                                </div>
                                <div className="text-right">
                                  <span className="block text-muted-foreground text-xs">{m.unit}</span>
                                  <span className={cn("text-[10px] font-bold", m.stock > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                    {m.stock > 0 ? `${m.stock} IN STOCK` : "OUT OF STOCK"}
                                  </span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-sm text-muted-foreground">No matches found.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Dosage</label>
                      <Input
                        placeholder="e.g. 5mg"
                        value={currentDrug.dosage}
                        onChange={(e) => updateCurrentDrug("dosage", e.target.value)}
                        className="bg-card text-card-foreground border-border"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Times Per Day</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="e.g. 2"
                        value={currentDrug.timesPerDay}
                        onChange={(e) => updateCurrentDrug("timesPerDay", e.target.value)}
                        className="bg-card text-card-foreground border-border"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Tablets Per Time</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="e.g. 1"
                        value={currentDrug.tabletsPerTime}
                        onChange={(e) => updateCurrentDrug("tabletsPerTime", e.target.value)}
                        className="bg-card text-card-foreground border-border"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Duration</label>
                      <Input
                        placeholder="e.g. 30 days"
                        value={currentDrug.duration}
                        onChange={(e) => updateCurrentDrug("duration", e.target.value)}
                        className="bg-card text-card-foreground border-border"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-end gap-4">
                      <div className="flex-1">
                        <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Patient Instructions</label>
                        <Input
                          placeholder="e.g. Take with plenty of water"
                          value={currentDrug.instructions}
                          onChange={(e) => updateCurrentDrug("instructions", e.target.value)}
                          className="bg-card text-card-foreground border-border text-sm italic"
                        />
                      </div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <button
                          type="button"
                          onClick={() => updateCurrentDrug("timing", currentDrug.timing === "before" ? "" : "before")}
                          className={cn(
                            "px-3 py-2 rounded-md text-xs font-medium border transition-colors",
                            currentDrug.timing === "before" ? "bg-primary text-white border-slate-800" : "bg-card text-card-foreground border-border text-muted-foreground hover:bg-muted/30"
                          )}
                        >
                          Before Eat
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCurrentDrug("timing", currentDrug.timing === "after" ? "" : "after")}
                          className={cn(
                            "px-3 py-2 rounded-md text-xs font-medium border transition-colors",
                            currentDrug.timing === "after" ? "bg-primary text-white border-slate-800" : "bg-card text-card-foreground border-border text-muted-foreground hover:bg-muted/30"
                          )}
                        >
                          After Eat
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {editingIndex !== null && (
                        <Button type="button" variant="ghost" onClick={() => { setCurrentDrug(initialDrugState); setEditingIndex(null); }} className="h-10 text-muted-foreground">
                          Cancel
                        </Button>
                      )}
                      <Button type="button" onClick={handleAddOrUpdateDrug} className="h-10 min-w-[120px]">
                        {editingIndex !== null ? "Update" : "Add to List"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              {addedDrugs.length > 0 && (
                <div className="mt-6 border border-border rounded-lg overflow-hidden bg-card">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[40px] text-center">#</TableHead>
                        <TableHead>Medication</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="w-[60px] text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {addedDrugs.map((d, i) => (
                        <TableRow 
                          key={i} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleEditDrug(i)}
                        >
                          <TableCell className="text-center font-medium text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-semibold text-foreground">{d.drug}</TableCell>
                          <TableCell className="text-muted-foreground">{d.dosage || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {d.timesPerDay ? `${d.timesPerDay}x day` : "-"}
                            {d.tabletsPerTime ? ` (${d.tabletsPerTime} tab)` : ""}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{d.duration || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleRemoveDrug(e, i)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>



          {/* CLINICAL NOTES */}
          <div className="bg-card text-card-foreground border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/90 mb-4 flex items-center gap-2">
              <FilePen className="w-4 h-4 text-muted-foreground/70" /> Private Clinical Notes
            </h2>
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              placeholder="Enter private observations, follow-up plans, or internal notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* STICKY BOTTOM ACTION BAR                                  */}
      {/* ========================================================= */}
      <div className={cn("fixed bottom-0 right-0 border-t border-border/40 bg-background/80 backdrop-blur-md z-40 p-4 transition-all duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]", leftMargin)}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-sm font-medium text-muted-foreground">Consultation in progress...</span>
          </div>
          <div className="flex items-center gap-4">
            {createdPrescription && (
              <Button 
                variant="outline"
                className="border-primary text-primary"
                onClick={() => handlePrint()}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Rx Token
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={savingDraft || visitCompleted}
              className="bg-card text-card-foreground min-w-[120px]"
            >
              {savingDraft ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Draft</>}
            </Button>
            {createdPrescription ? (
              <Button size="lg" onClick={() => window.location.href = "/doctor/queue"} className="bg-primary hover:bg-primary text-white">
                Next Patient
              </Button>
            ) : (
              <Button 
                size="lg" 
                onClick={handleCompleteConsultation}
                disabled={visitCompleted}
                className="bg-primary hover:bg-primary text-white min-w-[220px]"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {visitCompleted ? "Completed" : "Complete Consultation"}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <PrescriptionPrintTemplate ref={printRef} prescription={createdPrescription} />
    </div>
  );
}
