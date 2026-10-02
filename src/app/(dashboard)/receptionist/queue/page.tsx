"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Printer, CheckCircle2, User, Stethoscope } from "lucide-react";

interface Doctor {
  id: string;
  fullName: string;
  specialty: string;
  consultationFee: number;
  feeType: string;
}

interface Patient {
  id: string;
  fullName: string;
  phone: string;
}

function CreateVisitFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientId = searchParams.get("patientId");

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [step, setStep] = useState<1 | 2>(1); // 1: Select Doc, 2: Token Created
  const [token, setToken] = useState("");
  const [visitId, setVisitId] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [docsRes, patRes] = await Promise.all([
          fetch("/api/receptionist/doctors"),
          patientId ? fetch(`/api/receptionist/patients/${patientId}`) : Promise.resolve(null)
        ]);

        if (docsRes.ok) {
          const json = await docsRes.json();
          if (json.success && json.data) {
            setDoctors(json.data);
          }
        }

        if (patRes && patRes.ok) {
          const json = await patRes.json();
          if (json.success && json.data) {
            setPatient(json.data);
          }
        }
      } catch (error) {
        toast.error("Failed to load data.");
      } finally {
        setPageLoading(false);
      }
    }
    loadData();
  }, [patientId]);

  if (!patientId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">No patient selected.</p>
        <Button onClick={() => router.push("/receptionist/patients")}>Go back to Patient Search</Button>
      </div>
    );
  }

  if (pageLoading) {
    return <div className="p-8 text-center animate-pulse">Loading...</div>;
  }

  const handleCreateVisit = async () => {
    if (!selectedDoctor || !patient) return;
    setLoading(true);
    try {
      const res = await fetch("/api/receptionist/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          doctorId: selectedDoctor.id,
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to create visit");

      setToken(json.data.tokenNumber);
      setVisitId(json.data.id);
      setStep(2);
      toast.success("Visit created successfully.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {step === 1 && (
        <>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Create Visit</h2>
            <p className="text-muted-foreground mt-1">Select a doctor to assign the patient to the OPD queue.</p>
          </div>

          <Card className="shadow-sm border-t-4 border-t-primary">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selected Patient</CardDescription>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{patient?.fullName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{patient?.phone} • <span className="font-mono">{patient?.id.slice(-8)}</span></p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
                <Stethoscope className="w-4 h-4" /> Select Doctor
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {doctors.map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => setSelectedDoctor(doc)}
                    className={`p-4 border dark:border-white/10 rounded-lg cursor-pointer transition-all ${
                      selectedDoctor?.id === doc.id 
                        ? "border-primary dark:border-primary bg-primary/5 ring-1 ring-primary" 
                        : "hover:border-primary/50 dark:hover:border-primary/50 bg-card text-card-foreground"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{doc.fullName}</h4>
                        <p className="text-xs text-muted-foreground">{doc.specialty || "General"}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-primary block">Rs. {doc.consultationFee?.toLocaleString() ?? "N/A"}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{doc.feeType}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <Button 
                  size="lg" 
                  onClick={handleCreateVisit} 
                  disabled={!selectedDoctor || loading}
                  className="bg-primary hover:bg-primary/90 text-white min-w-[200px]"
                >
                  {loading ? "Processing..." : "Generate Token"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {step === 2 && (
        <div className="max-w-md mx-auto pt-8 animate-in slide-in-from-bottom-4 duration-500">
          <Card className="shadow-lg border-2 border-primary/20 overflow-hidden">
            <div className="bg-primary/10 py-6 text-center border-b">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-primary">Visit Created</h2>
              <p className="text-sm text-primary/80 font-mono mt-1">{visitId}</p>
            </div>
            
            <CardContent className="pt-8 pb-8 text-center px-8">
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-1">Patient</p>
                <p className="font-semibold text-lg">{patient?.fullName}</p>
              </div>
              <div className="mb-8">
                <p className="text-sm text-muted-foreground mb-1">Assigned Doctor</p>
                <p className="font-semibold text-lg">{selectedDoctor?.fullName}</p>
              </div>

              <div className="border-t border-b dark:border-white/10 py-6 mb-8 bg-muted/30 dark:bg-slate-900/50 rounded-lg">
                <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-2">Queue Token</p>
                <p className="text-6xl font-black text-primary tracking-tight">{token}</p>
              </div>

              <div className="flex justify-between items-center text-sm border-t dark:border-white/10 pt-4 text-muted-foreground mb-8">
                <span>Doctor Fee ({selectedDoctor?.feeType})</span>
                <span className="font-bold text-foreground">Rs. {selectedDoctor?.consultationFee?.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-12" onClick={() => toast.success("Printing token...")}>
                  <Printer className="w-4 h-4 mr-2" /> Print Token
                </Button>
                <Button className="h-12 bg-primary text-white" onClick={() => router.push("/receptionist")}>
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}

export default function QueuePageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <CreateVisitFlow />
    </Suspense>
  );
}
