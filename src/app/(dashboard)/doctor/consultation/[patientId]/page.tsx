"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, Plus, Trash2, FlaskConical, FilePen, History, CheckCircle2 } from "lucide-react";
import Link from "next/link";

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
  "Full Blood Count",
  "HbA1c",
  "Lipid Profile",
  "Urine Full Report",
  "Liver Function Test",
  "Renal Function Test",
  "Thyroid Profile",
  "ECG",
  "Chest X-Ray",
  "Blood Glucose (Fasting)",
];

export default function ConsultationPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = use(params);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitCompleted, setVisitCompleted] = useState(false);

  // Prescription state
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [drugs, setDrugs] = useState([{ drug: "", dosage: "", frequency: "", duration: "" }]);
  const [prescribing, setPrescribing] = useState(false);

  // Lab request state
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [labNotes, setLabNotes] = useState("");
  const [requestingLab, setRequestingLab] = useState(false);

  useEffect(() => {
    fetch(`/api/doctor/patients/${patientId}`)
      .then((r) => r.json())
      .then((d) => { setPatient(d); setLoading(false); });
  }, [patientId]);

  const addDrugRow = () =>
    setDrugs((prev) => [...prev, { drug: "", dosage: "", frequency: "", duration: "" }]);

  const removeDrugRow = (idx: number) =>
    setDrugs((prev) => prev.filter((_, i) => i !== idx));

  const updateDrug = (idx: number, field: string, value: string) =>
    setDrugs((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));

  const toggleTest = (test: string) =>
    setSelectedTests((prev) =>
      prev.includes(test) ? prev.filter((t) => t !== test) : [...prev, test]
    );

  const handlePrescribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) { toast.error("Please enter a diagnosis."); return; }
    if (drugs.some((d) => !d.drug.trim())) { toast.error("Please fill in all drug names."); return; }
    setPrescribing(true);
    setTimeout(() => {
      setPrescribing(false);
      toast.success(`Prescription issued for ${patient?.name}. Sent to Pharmacy.`);
      setDiagnosis("");
      setNotes("");
      setDrugs([{ drug: "", dosage: "", frequency: "", duration: "" }]);
    }, 800);
  };

  const handleLabRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTests.length === 0) { toast.error("Please select at least one test."); return; }
    setRequestingLab(true);
    setTimeout(() => {
      setRequestingLab(false);
      toast.success(`${selectedTests.length} lab test(s) requested for ${patient?.name}. Sent to Lab.`);
      setSelectedTests([]);
      setLabNotes("");
    }, 800);
  };

  const handleCompleteConsultation = () => {
    setVisitCompleted(true);
    toast.success("Consultation completed. Visit updated.");
    setTimeout(() => {
      window.location.href = "/doctor/queue";
    }, 1000);
  };

  if (loading || !patient) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/doctor/queue">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Queue
          </Button>
        </Link>
        <div className="h-6 w-px bg-border" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#3A3435]">Consultation — {patient.name}</h2>
          <p className="text-muted-foreground text-sm">Patient ID: <span className="font-mono font-medium">{patient.id}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Patient Info + History */}
        <div className="xl:col-span-1 space-y-4">
          {/* Demographics */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Patient Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground text-xs">Age / Gender</p>
                  <p className="font-medium">{patient.age} / {patient.gender}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Blood Group</p>
                  <p className="font-semibold text-primary">{patient.bloodGroup}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">DOB</p>
                  <p className="font-medium">{new Date(patient.dob).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Contact</p>
                  <p className="font-medium">{patient.contact}</p>
                </div>
              </div>

              {patient.allergies.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-500" /> Allergies
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {patient.allergies.map((a) => (
                      <Badge key={a} variant="secondary" className="bg-red-100 text-red-700 text-xs">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {patient.chronicConditions.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground mb-1.5">Chronic Conditions</p>
                  <div className="flex flex-wrap gap-1">
                    {patient.chronicConditions.map((c) => (
                      <Badge key={c} variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medical History */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" /> Medical History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.medicalHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No previous records.</p>
              ) : (
                <div className="space-y-3">
                  {patient.medicalHistory.map((h, i) => (
                    <div key={i} className="border-l-2 border-primary/30 pl-3 py-1">
                      <p className="text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString()} · {h.doctor}</p>
                      <p className="font-medium text-sm mt-0.5">{h.diagnosis}</p>
                      {h.prescription.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">💊 {h.prescription.join(", ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lab Results */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="w-4 h-4" /> Lab Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.labResults.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No lab results on record.</p>
              ) : (
                <div className="space-y-2">
                  {patient.labResults.map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{r.test}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{r.result}</p>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">{r.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Consultation Actions */}
        <div className="xl:col-span-2">
          <Tabs defaultValue="prescription">
            <TabsList className="mb-4">
              <TabsTrigger value="prescription" className="flex items-center gap-2">
                <FilePen className="w-4 h-4" /> Write Prescription
              </TabsTrigger>
              <TabsTrigger value="lab" className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4" /> Request Lab Tests
              </TabsTrigger>
            </TabsList>

            {/* PRESCRIPTION TAB */}
            <TabsContent value="prescription">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Digital Prescription</CardTitle>
                  <CardDescription>This will be sent directly to the Pharmacy system upon submission.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePrescribe} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Diagnosis *</label>
                      <Input
                        placeholder="e.g., Hypertensive urgency"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Medications *</label>
                        <Button type="button" variant="outline" size="sm" onClick={addDrugRow}>
                          <Plus className="w-4 h-4 mr-1" /> Add Drug
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
                          <span>Drug Name</span><span>Dosage</span><span>Frequency</span><span>Duration</span><span />
                        </div>
                        {drugs.map((drug, idx) => (
                          <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center">
                            <Input
                              placeholder="e.g., Amlodipine"
                              value={drug.drug}
                              onChange={(e) => updateDrug(idx, "drug", e.target.value)}
                            />
                            <Input
                              placeholder="5mg"
                              value={drug.dosage}
                              onChange={(e) => updateDrug(idx, "dosage", e.target.value)}
                            />
                            <Input
                              placeholder="Once daily"
                              value={drug.frequency}
                              onChange={(e) => updateDrug(idx, "frequency", e.target.value)}
                            />
                            <Input
                              placeholder="30 days"
                              value={drug.duration}
                              onChange={(e) => updateDrug(idx, "duration", e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeDrugRow(idx)}
                              disabled={drugs.length === 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Clinical Notes (Optional)</label>
                      <textarea
                        className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        placeholder="Additional instructions, follow-up date, dietary advice..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <Button type="submit" disabled={prescribing} className="bg-primary hover:bg-primary/90 text-white">
                      {prescribing ? "Issuing Prescription..." : "Issue Prescription & Send to Pharmacy"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* LAB REQUEST TAB */}
            <TabsContent value="lab">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Lab Test Request</CardTitle>
                  <CardDescription>Selected tests will be forwarded to the Laboratory immediately.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLabRequest} className="space-y-5">
                    <div>
                      <label className="text-sm font-medium block mb-3">Select Tests</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {LAB_TESTS.map((test) => {
                          const selected = selectedTests.includes(test);
                          return (
                            <button
                              key={test}
                              type="button"
                              onClick={() => toggleTest(test)}
                              className={`text-left px-3 py-2.5 rounded-md border text-sm font-medium transition-colors ${
                                selected
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "border-input bg-background text-foreground hover:bg-muted"
                              }`}
                            >
                              {selected && <span className="mr-1">✓</span>}
                              {test}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedTests.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <p className="text-sm font-medium w-full">Selected ({selectedTests.length}):</p>
                        {selectedTests.map((t) => (
                          <Badge key={t} variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Clinical Indication / Notes</label>
                      <textarea
                        className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        placeholder="Reason for requesting these tests..."
                        value={labNotes}
                        onChange={(e) => setLabNotes(e.target.value)}
                      />
                    </div>

                    <Button type="submit" disabled={requestingLab} className="bg-primary hover:bg-primary/90 text-white">
                      {requestingLab ? "Sending to Lab..." : "Send Lab Request"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-8 pt-6 border-t flex justify-end">
            <Button 
              size="lg" 
              onClick={handleCompleteConsultation}
              disabled={visitCompleted}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[200px]"
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
