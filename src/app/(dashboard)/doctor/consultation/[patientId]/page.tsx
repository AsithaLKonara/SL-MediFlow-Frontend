"use client";

import { useEffect, useState, use } from "react";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, Plus, Trash2, CheckCircle2, Save, FileText, Activity, User, Beaker, FlaskConical, FilePen } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/dashboard/SidebarProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  name: string;
  dob: string;
  age: number;
  gender: string;
  contact: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  medicalHistory: MedicalHistory[];
  labResults: LabResult[];
}

const LAB_TESTS = [
  "Full Blood Count (FBC)",
  "HbA1c",
  "Lipid Profile",
  "Urine Full Report (UFR)",
  "Liver Function Test (LFT)",
  "Renal Function Test (RFT)",
  "Thyroid Profile",
  "ECG",
  "Chest X-Ray",
  "Blood Glucose (Fasting)",
  "CRP",
  "Dengue Antigen",
];

const MOCK_MEDICINES = [
  { name: "Amlodipine 5mg", dosage: "5mg", base: "Amlodipine" },
  { name: "Amlodipine 10mg", dosage: "10mg", base: "Amlodipine" },
  { name: "Metformin 500mg", dosage: "500mg", base: "Metformin" },
  { name: "Metformin 850mg", dosage: "850mg", base: "Metformin" },
  { name: "Atorvastatin 20mg", dosage: "20mg", base: "Atorvastatin" },
  { name: "Atorvastatin 40mg", dosage: "40mg", base: "Atorvastatin" },
  { name: "Paracetamol 500mg", dosage: "500mg", base: "Paracetamol" },
  { name: "Amoxicillin 250mg", dosage: "250mg", base: "Amoxicillin" },
  { name: "Amoxicillin 500mg", dosage: "500mg", base: "Amoxicillin" },
  { name: "Losartan 50mg", dosage: "50mg", base: "Losartan" },
];

export default function ConsultationPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = use(params);
  const { isCollapsed } = useSidebar();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitCompleted, setVisitCompleted] = useState(false);

  // Prescription state
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [drugs, setDrugs] = useState([{ drug: "", dosage: "", timesPerDay: "", tabletsPerTime: "", duration: "", instructions: "", timing: "" }]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [activeDrugSearch, setActiveDrugSearch] = useState<number | null>(null);

  // Lab request state
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [labNotes, setLabNotes] = useState("");

  useEffect(() => {
    fetch(`/api/doctor/patients/${patientId}`)
      .then((r) => r.json())
      .then((d) => { setPatient(d); setLoading(false); });
  }, [patientId]);

  const addDrugRow = () =>
    setDrugs((prev) => [...prev, { drug: "", dosage: "", timesPerDay: "", tabletsPerTime: "", duration: "", instructions: "", timing: "" }]);

  const removeDrugRow = (idx: number) =>
    setDrugs((prev) => prev.filter((_, i) => i !== idx));

  const updateDrug = (idx: number, field: string, value: string) => {
    setDrugs((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  const selectDrug = (idx: number, medicine: typeof MOCK_MEDICINES[0]) => {
    setDrugs((prev) => prev.map((d, i) => {
      if (i === idx) {
        return { ...d, drug: medicine.name, dosage: medicine.dosage };
      }
      return d;
    }));
    setActiveDrugSearch(null);
  };

  const toggleTest = (test: string) =>
    setSelectedTests((prev) =>
      prev.includes(test) ? prev.filter((t) => t !== test) : [...prev, test]
    );

  const handleSaveDraft = () => {
    setSavingDraft(true);
    setTimeout(() => {
      setSavingDraft(false);
      toast.success("Draft saved successfully.");
    }, 500);
  };

  const handleCompleteConsultation = () => {
    if (!diagnosis.trim()) { toast.error("Diagnosis is required to complete consultation."); return; }
    
    setVisitCompleted(true);
    toast.success("Consultation completed and securely saved.");
    
    if (drugs.some(d => d.drug.trim())) {
      toast.success("Prescription forwarded to Pharmacy.");
    }
    if (selectedTests.length > 0) {
      toast.success("Lab orders forwarded to Laboratory.");
    }

    setTimeout(() => {
      window.location.href = "/doctor/queue";
    }, 1500);
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
      <div className="bg-white border rounded-lg shadow-sm px-6 py-4 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link href="/doctor/queue">
              <Button variant="outline" size="icon" className="rounded-full shrink-0 h-10 w-10">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xl uppercase shrink-0 border">
              {patient.name?.charAt(0) || "P"}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">{patient.name || "Unknown Patient"}</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1.5 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Active Consultation
                </span>
              </div>
              <div className="text-sm text-slate-500 mt-1 flex items-center gap-3 divide-x divide-slate-300">
                <span className="font-mono font-medium">{patient.id}</span>
                <span className="pl-3">{patient.age || "--"} yrs · {patient.gender || "--"}</span>
                <span className="pl-3 font-semibold text-red-600">{patient.bloodGroup || "Unknown"}</span>
              </div>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-slate-500">Visit #04</p>
            <p className="font-medium text-slate-900">Started 10:42 AM</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: PATIENT CONTEXT                              */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* CRITICAL ALERTS */}
          {(patient.allergies?.length > 0 || patient.chronicConditions?.length > 0) && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Critical Alerts
              </h3>
              
              {patient.allergies?.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md">
                  <p className="text-[10px] uppercase font-bold text-red-700 tracking-wider mb-1">Allergies</p>
                  <p className="text-sm font-semibold text-red-900">{patient.allergies.join(", ")}</p>
                </div>
              )}

              {patient.chronicConditions?.length > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-md">
                  <p className="text-[10px] uppercase font-bold text-amber-700 tracking-wider mb-1">Conditions</p>
                  <p className="text-sm font-semibold text-amber-900">{patient.chronicConditions.join(", ")}</p>
                </div>
              )}
            </div>
          )}

          {/* DEMOGRAPHICS */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Details
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <dt className="text-slate-500">DOB</dt>
                <dd className="font-medium text-slate-900">{formatSafeDate(patient.dob)}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <dt className="text-slate-500">Contact</dt>
                <dd className="font-medium text-slate-900">{patient.contact}</dd>
              </div>
            </dl>
          </div>

          {/* LAB ORDERS */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5" /> Laboratory Orders
            </h3>
            
            <div className="flex flex-col gap-2">
              {LAB_TESTS.map((test) => {
                const isSelected = selectedTests.includes(test);
                return (
                  <label
                    key={test}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-all",
                      isSelected ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                    )}>
                      {isSelected && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    <span className={cn("text-xs font-medium", isSelected ? "text-blue-900" : "text-slate-700")}>
                      {test}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

        </div>


        {/* ========================================================= */}
        {/* RIGHT COLUMN: CLINICAL WORKSPACE                          */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* DIAGNOSIS */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" /> Assessment / Diagnosis
            </h2>
            <Input
              placeholder="Enter primary diagnosis or chief complaint..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="text-lg py-6 bg-slate-50 border-slate-200 focus-visible:ring-primary/20"
            />
          </div>

          {/* PRESCRIPTION BUILDER */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Beaker className="w-4 h-4 text-slate-400" /> Medications
              </h2>
              <Button type="button" variant="outline" size="sm" onClick={addDrugRow} className="h-8">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Medication
              </Button>
            </div>

            <div className="space-y-4">
              {drugs.map((drug, idx) => (
                <div key={idx} className="relative bg-slate-50 border border-slate-200 rounded-lg p-4 group">
                  <div className="absolute -left-3 -top-3 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                    {idx + 1}
                  </div>
                  
                  <div className="space-y-4 ml-1">
                    <div className="flex gap-4">
                      <div className="flex-1 relative">
                        <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5">Medication Name</label>
                        <Input
                          placeholder="Search or enter drug name (e.g. Amlodipine)"
                          value={drug.drug}
                          onChange={(e) => {
                            updateDrug(idx, "drug", e.target.value);
                            setActiveDrugSearch(idx);
                          }}
                          onFocus={() => setActiveDrugSearch(idx)}
                          onBlur={() => setTimeout(() => setActiveDrugSearch(null), 200)}
                          className="font-medium bg-white border-slate-200"
                        />
                        {activeDrugSearch === idx && drug.drug.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {MOCK_MEDICINES.filter((m) => m.name.toLowerCase().includes(drug.drug.toLowerCase())).length > 0 ? (
                              MOCK_MEDICINES.filter((m) => m.name.toLowerCase().includes(drug.drug.toLowerCase())).map((m, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 focus:bg-slate-50 focus:outline-none flex justify-between"
                                  onClick={() => selectDrug(idx, m)}
                                >
                                  <span className="font-medium text-slate-900">{m.base}</span>
                                  <span className="text-slate-500">{m.dosage}</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-slate-500">No matches found.</div>
                            )}
                          </div>
                        )}
                      </div>
                      {drugs.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-6 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeDrugRow(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5">Dosage</label>
                        <Input
                          placeholder="e.g. 5mg"
                          value={drug.dosage}
                          onChange={(e) => updateDrug(idx, "dosage", e.target.value)}
                          className="bg-white border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5">Times Per Day</label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g. 2"
                          value={drug.timesPerDay}
                          onChange={(e) => updateDrug(idx, "timesPerDay", e.target.value)}
                          className="bg-white border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5">Tablets Per Time</label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g. 1"
                          value={drug.tabletsPerTime}
                          onChange={(e) => updateDrug(idx, "tabletsPerTime", e.target.value)}
                          className="bg-white border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5">Duration</label>
                        <Input
                          placeholder="e.g. 30 days"
                          value={drug.duration}
                          onChange={(e) => updateDrug(idx, "duration", e.target.value)}
                          className="bg-white border-slate-200"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                      <div className="flex-1">
                        <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5">Patient Instructions</label>
                        <Input
                          placeholder="e.g. Take with plenty of water"
                          value={drug.instructions}
                          onChange={(e) => updateDrug(idx, "instructions", e.target.value)}
                          className="bg-white border-slate-200 text-sm italic"
                        />
                      </div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <button
                          type="button"
                          onClick={() => updateDrug(idx, "timing", drug.timing === "before" ? "" : "before")}
                          className={cn(
                            "px-3 py-2 rounded-md text-xs font-medium border transition-colors",
                            drug.timing === "before" ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          Before Eat
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDrug(idx, "timing", drug.timing === "after" ? "" : "after")}
                          className={cn(
                            "px-3 py-2 rounded-md text-xs font-medium border transition-colors",
                            drug.timing === "after" ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          After Eat
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>



          {/* CLINICAL NOTES */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
              <FilePen className="w-4 h-4 text-slate-400" /> Private Clinical Notes
            </h2>
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
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
      <div className={cn("fixed bottom-0 right-0 border-t bg-white/95 backdrop-blur-sm z-40 p-4 transition-all duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]", leftMargin)}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-sm font-medium text-slate-600">Consultation in progress...</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={savingDraft || visitCompleted}
              className="bg-white min-w-[120px]"
            >
              {savingDraft ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Draft</>}
            </Button>
            <Button 
              size="lg" 
              onClick={handleCompleteConsultation}
              disabled={visitCompleted}
              className="bg-slate-900 hover:bg-slate-800 text-white min-w-[220px]"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {visitCompleted ? "Completed" : "Complete Consultation"}
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
