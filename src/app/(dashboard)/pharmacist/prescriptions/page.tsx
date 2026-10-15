"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, PackageCheck, Banknote } from "lucide-react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

interface Drug {
  id: string;
  name: string;
  prescribedQty: number;
  dispenseQty: number;
  unitPrice: number;
}

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctor: string;
  visitId: string;
  drugs: Drug[];
  status: string;
}

export default function PharmacyDashboardPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRx, setActiveRx] = useState<Prescription | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const processBarcode = async (code: string) => {
    if (!code) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/barcode/${code}`);
      if (res.ok) {
        const { type, data } = await res.json();
        
        if (type === "PRESCRIPTION") {
          setActiveRx(data);
          setSearchQuery("");
          return;
        } else if (type === "APPOINTMENT" && data.prescriptions && data.prescriptions.length > 0) {
          // If a token barcode is scanned, load its prescription
          const rx = data.prescriptions[0];
          setActiveRx(rx);
          setSearchQuery("");
          return;
        }
      }
      
      // Fallback to local search
      const match = prescriptions.find(p => 
        p.id.toLowerCase() === code.toLowerCase() || 
        p.patientName.toLowerCase().includes(code.toLowerCase()) ||
        p.visitId === code
      );
      if (match) {
        setActiveRx(match);
        setSearchQuery("");
      } else {
        toast.error("Prescription not found.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error searching prescription.");
    }
  };

  useBarcodeScanner((barcode) => {
    processBarcode(barcode);
  });

  useEffect(() => {
    fetchPrescriptions();

    const socketUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace('/api', '');
    const socket = io(socketUrl);

    socket.on("connect", () => {
      console.log("Pharmacist connected to websocket");
    });

    socket.on("prescription_created", (newRx: Prescription) => {
      setPrescriptions((prev) => [newRx, ...prev]);
      toast.info(`New prescription arrived for ${newRx.patientName}`, {
        duration: 8000,
        action: { label: "View", onClick: () => setActiveRx(newRx) }
      });
      // Play a small audio chime if desired:
      // new Audio("/chime.mp3").play().catch(()=>null);
    });

    socket.on("prescription_updated", () => {
      fetchPrescriptions();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/pending`);
      if (res.ok) {
        const data = await res.json();
        // Map backend PrescriptionItem to Drug interface expected by UI
        const mapped = data.map((p: any) => ({
          ...p,
          drugs: p.items.map((i: any) => ({
            id: i.id,
            medicineId: i.medicineId,
            name: i.drugName,
            prescribedQty: i.dispenseQty || (parseInt(i.duration) * (parseInt(i.frequency) || 1)) || 10,
            dispenseQty: i.dispenseQty || (parseInt(i.duration) * (parseInt(i.frequency) || 1)) || 10,
            unitPrice: i.medicine?.stockBatches?.[0]?.unitPrice || 0
          }))
        }));
        setPrescriptions(mapped);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch prescriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(searchQuery);
  };

  const updateDispenseQty = (drugId: string, val: string) => {
    if (!activeRx) return;
    const num = parseInt(val) || 0;
    setActiveRx({
      ...activeRx,
      drugs: activeRx.drugs.map(d => d.id === drugId ? { ...d, dispenseQty: num } : d)
    });
  };

  const handleDispense = async () => {
    if (!activeRx) return;
    setSubmitting(true);
    
    try {
      const payload = {
        dispensedItems: activeRx.drugs.map(d => ({
          itemId: d.id,
          dispenseQty: d.dispenseQty
        }))
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${activeRx.id}/dispense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Prescription dispensed & bill updated!");
        setPrescriptions(prev => prev.filter(p => p.id !== activeRx.id));
        setActiveRx(null);
      } else {
        toast.error("Failed to update prescription");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (activeRx) {
    const total = activeRx.drugs.reduce((sum, d) => sum + (d.dispenseQty * d.unitPrice), 0);
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setActiveRx(null)}>Back to Dashboard</Button>
          <h2 className="text-2xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">Prescription {activeRx.id}</h2>
        </div>

        <Card className="shadow-sm border-t-4 border-t-primary">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Patient</p>
                <p className="font-semibold">{activeRx.patientName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Doctor</p>
                <p className="font-semibold">{activeRx.doctor}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Visit</p>
                <p className="font-mono text-primary font-medium">{activeRx.visitId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">{activeRx.status}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-md border mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="p-3">Medicine</th>
                    <th className="p-3 text-center">Prescribed</th>
                    <th className="p-3 text-center">Dispense</th>
                    <th className="p-3 text-right">Total (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeRx.drugs.map((drug) => (
                    <tr key={drug.id}>
                      <td className="p-3 font-medium">{drug.name}</td>
                      <td className="p-3 text-center font-semibold text-muted-foreground">{drug.prescribedQty}</td>
                      <td className="p-3">
                        <div className="flex justify-center">
                          <Input 
                            type="number" 
                            className="w-20 text-center font-bold" 
                            value={drug.dispenseQty}
                            onChange={(e) => updateDispenseQty(drug.id, e.target.value)}
                          />
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium">
                        {(drug.dispenseQty * drug.unitPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                <p>Note: Modifying dispense quantity automatically recalculates the pharmacy charge.</p>
              </div>
              <div className="text-right w-full sm:w-auto">
                <p className="text-sm text-muted-foreground mb-1">Pharmacy Charge</p>
                <p className="text-3xl font-bold text-primary mb-4">Rs. {total.toFixed(2)}</p>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" size="lg">Hold</Button>
                  <Button size="lg" className="bg-primary text-white" onClick={handleDispense} isLoading={submitting} loadingText="Dispense Medicines">
                    <PackageCheck className="w-5 h-5 mr-2" />
                    Dispense Medicines
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">Pharmacy Dashboard</h2>
        <p className="text-muted-foreground mt-1">Scan prescriptions and dispense medications.</p>
      </div>

      <Card className="shadow-md border-t-4 border-t-primary">
        <CardContent className="pt-8 pb-8">
          <form onSubmit={handleSearch} className="max-w-xl mx-auto relative text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Scan Prescription</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Barcode or RX Number..."
                className="pl-14 h-16 text-xl border-primary/30 focus-visible:ring-primary shadow-sm rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" className="mt-6 w-full sm:w-auto h-12 px-8 text-base bg-primary text-white rounded-lg">
              Open Prescription
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-bold text-lg mb-4 text-[#3A3435] dark:text-gray-100">Pending Prescriptions</h3>
        {loading ? (
          <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : (
          <div className="space-y-3">
            {prescriptions.filter(p => p.status === "PENDING").map(rx => (
              <div key={rx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card text-card-foreground shadow-sm hover:border-primary/50 transition-all">
                <div className="mb-4 sm:mb-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono font-bold text-primary">{rx.id}</span>
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">{rx.status}</Badge>
                  </div>
                  <p className="font-semibold text-[#3A3435] dark:text-gray-100">{rx.patientName}</p>
                  <p className="text-sm text-muted-foreground">By {rx.doctor} · Visit {rx.visitId}</p>
                </div>
                <Button onClick={() => setActiveRx(rx)} className="bg-primary text-white w-full sm:w-auto">
                  Open
                </Button>
              </div>
            ))}
            {prescriptions.filter(p => p.status === "PENDING").length === 0 && (
              <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                No pending prescriptions.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
