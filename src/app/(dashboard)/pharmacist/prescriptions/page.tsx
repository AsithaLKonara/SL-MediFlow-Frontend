"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

interface Drug {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  qty: number;
}

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctor: string;
  drugs: Drug[];
  status: string;
  issuedAt: string;
}

export default function PharmacistPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fulfilling, setFulfilling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pharmacist/prescriptions").then(r => r.json()).then(d => {
      setPrescriptions(d.data);
      setLoading(false);
    });
  }, []);

  const handleFulfill = (rx: Prescription) => {
    setFulfilling(rx.id);
    setTimeout(() => {
      setPrescriptions(prev => prev.map(p => p.id === rx.id ? { ...p, status: "FULFILLED" } : p));
      setFulfilling(null);
      toast.success(`Prescription ${rx.id} fulfilled. Bill generated for ${rx.patientName}.`);
    }, 900);
  };

  const pending = prescriptions.filter(p => p.status === "PENDING");
  const fulfilled = prescriptions.filter(p => p.status === "FULFILLED");

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  const RxCard = ({ rx }: { rx: Prescription }) => (
    <div className={`rounded-lg border shadow-sm overflow-hidden transition-all ${rx.status === "FULFILLED" ? "opacity-60" : ""}`}>
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(expanded === rx.id ? null : rx.id)}
      >
        <div className={`p-2 rounded-full ${rx.status === "PENDING" ? "bg-yellow-100" : "bg-green-100"}`}>
          <CheckCircle2 className={`w-4 h-4 ${rx.status === "PENDING" ? "text-yellow-600" : "text-green-600"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">{rx.id}</span>
            <span className="font-semibold text-[#3A3435]">{rx.patientName}</span>
            <Badge variant="secondary" className={rx.status === "PENDING" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>
              {rx.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">By {rx.doctor} · {new Date(rx.issuedAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rx.status === "PENDING" && (
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={fulfilling === rx.id}
              onClick={(e) => { e.stopPropagation(); handleFulfill(rx); }}
            >
              {fulfilling === rx.id ? "Fulfilling..." : "Fulfill & Bill"}
            </Button>
          )}
          {expanded === rx.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded === rx.id && (
        <div className="border-t bg-muted/10 p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="pb-2 pr-4">Drug</th>
                  <th className="pb-2 pr-4">Dosage</th>
                  <th className="pb-2 pr-4">Frequency</th>
                  <th className="pb-2 pr-4">Duration</th>
                  <th className="pb-2">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rx.drugs.map((drug, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 font-medium">{drug.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{drug.dosage}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{drug.frequency}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{drug.duration}</td>
                    <td className="py-2 font-semibold">{drug.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Incoming Prescriptions</h2>
        <p className="text-muted-foreground mt-1">
          {pending.length} prescription{pending.length !== 1 ? "s" : ""} pending · {fulfilled.length} fulfilled today
        </p>
      </div>

      {pending.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse inline-block" />
              Pending ({pending.length})
            </CardTitle>
            <CardDescription>Click "Fulfill & Bill" to dispense and auto-generate a pharmacy bill.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map(rx => <RxCard key={rx.id} rx={rx} />)}
          </CardContent>
        </Card>
      )}

      {fulfilled.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Fulfilled ({fulfilled.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fulfilled.map(rx => <RxCard key={rx.id} rx={rx} />)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
