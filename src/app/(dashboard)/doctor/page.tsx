"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, FlaskConical, Users, ScanBarcode, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { Input } from "@/components/ui/input";

interface Metrics {
  doctorName: string;
  specialty: string;
  patientsToday: number;
  completedConsultations: number;
  pendingQueue: number;
  pendingPrescriptions: number;
  pendingLabRequests: number;
  upcomingPatients: { id?: string; queueNo: string; patientId: string; patientName: string; age: number; reason: string; status: string }[];
}

export default function DoctorOverview() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState("");
  const [searching, setSearching] = useState(false);

  const handleBarcodeSearch = async (code: string) => {
    const raw = code.trim();
    if (!raw) return;
    setSearching(true);

    try {
      // 1. Check local upcoming list first for instant response
      const localMatch = metrics?.upcomingPatients.find(
        (p) => p.queueNo.toLowerCase() === raw.toLowerCase() || p.patientId === raw
      );
      if (localMatch) {
        toast.success(`Patient ${localMatch.patientName} (Token #${localMatch.queueNo}) found!`);
        router.push(`/doctor/consultation/${localMatch.patientId}?visitId=${localMatch.id || ''}`);
        return;
      }

      // 2. Query unified barcode API
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/barcode/${encodeURIComponent(raw)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const { type, data } = await res.json();
        if (type === "APPOINTMENT") {
          const appt = data.appointment;
          const patientId = appt?.patientId || appt?.Patient?.id;
          const patientName = appt?.Patient?.fullName || "Patient";
          const tokenNo = appt?.tokenNumber || "N/A";
          if (patientId) {
            const activeRx = data.prescriptions?.find((p: any) => p.status !== "DISPENSED" && p.status !== "CANCELLED") 
                          || data.prescriptions?.[0];
            if (activeRx) {
              toast.success(`Found Token #${tokenNo}: ${patientName} (Prescription #${activeRx.id.slice(0, 8)}). Resuming for edit & review...`);
              router.push(`/doctor/consultation/${patientId}?editPrescriptionId=${activeRx.id}&visitId=${appt?.id || ''}`);
            } else {
              toast.success(`Found Token #${tokenNo}: ${patientName}. Opening consultation...`);
              router.push(`/doctor/consultation/${patientId}?visitId=${appt?.id || ''}`);
            }
            return;
          }
        } else if (type === "PRESCRIPTION") {
          const patientId = data.patientId;
          if (patientId) {
            toast.success(`Prescription #${data.id.slice(0, 8)} found. Opening for edit & review...`);
            router.push(`/doctor/consultation/${patientId}?editPrescriptionId=${data.id}`);
            return;
          }
        }
      }

      // 3. Fallback: try doctor's full token queue API directly
      const queueRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tokens/queue?doctorId=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (queueRes.ok) {
        const qData = await queueRes.json();
        const tokens: any[] = Array.isArray(qData) ? qData : (qData.data || []);
        const match = tokens.find((t: any) => 
          t.tokenNumber === raw || 
          t.id === raw || 
          t.bookingReference === raw ||
          (raw.length >= 8 && t.id?.startsWith(raw))
        );
        if (match) {
          const p = match.Patient || match.patient || {};
          const pId = p.id || match.patientId;
          if (pId) {
            toast.success(`Found Token #${match.tokenNumber}: ${p.fullName || "Patient"}. Opening consultation...`);
            router.push(`/doctor/consultation/${pId}?visitId=${match.id || ''}`);
            return;
          }
        }
      }

      toast.error(`No patient appointment found for token/barcode "${raw}".`);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to process token barcode.");
    } finally {
      setSearching(false);
    }
  };

  useBarcodeScanner((scanned) => {
    handleBarcodeSearch(scanned);
  });

  useEffect(() => {
    if (!user) return;
    
    // Fetch tokens for this doctor
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/tokens/queue?doctorId=${user.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((res: any) => { 
        const tokens: any[] = Array.isArray(res) ? res : (res.data || []);
        // Build metrics from real token data
        const upcoming = tokens
          .filter(t => {
            const s = (t.status || "").toLowerCase();
            return s !== "completed" && s !== "prescription_issued" && s !== "cancelled" && s !== "no_show";
          })
                    .map(t => {
            const p = t.Patient || t.patient || {};
            return {
              id: t.id,
              queueNo: t.tokenNumber,
              patientId: p.id || t.patientId,
              patientName: p.fullName || "Unknown",
             age: p.ageFallback || (p.dateOfBirth ? (new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()) : 0),
             reason: t.department || "General Consultation",
             status: t.status
            };
          });
          
        setMetrics({
          doctorName: user.fullName,
          specialty: "General", // Placeholder for now
          patientsToday: tokens.length,
          completedConsultations: tokens.filter(t => {
            const s = (t.status || "").toLowerCase();
            return s === "completed" || s === "prescription_issued";
          }).length,
          pendingQueue: upcoming.length,
          pendingPrescriptions: 0,
          pendingLabRequests: 0,
          upcomingPatients: upcoming
        });
        setLoading(false); 
      })
      .catch(err => {
         console.error(err);
         setLoading(false);
      });
  }, [user, token]);

  if (loading || !metrics) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome, {metrics.doctorName}</h2>
          <p className="text-muted-foreground mt-1">Here is your {metrics.specialty} launchpad for today.</p>
        </div>
        <div className="flex items-center gap-4 bg-muted/30 px-4 py-2 rounded-xl border border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Patients</p>
            <p className="text-xl font-bold text-primary">{metrics.patientsToday}</p>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Completed</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{metrics.completedConsultations}</p>
          </div>
        </div>
      </div>

      {/* Quick Token Barcode Scanner / Search Bar */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBarcodeSearch(tokenInput);
            }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="relative flex-1 w-full">
              <ScanBarcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
              <Input
                type="text"
                placeholder="Scan patient token barcode or enter token / appointment #..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="pl-11 h-12 text-base bg-background shadow-inner font-mono tracking-wide"
              />
            </div>
            <Button
              type="submit"
              disabled={searching || !tokenInput.trim()}
              className="h-12 px-6 w-full sm:w-auto font-semibold gap-2 shadow"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{searching ? "Searching..." : "Search Token"}</span>
            </Button>
          </form>
          <div className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground px-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Hardware Barcode Scanner Active — point scanner at patient token barcode anytime</span>
          </div>
        </CardContent>
      </Card>

      {/* App-like Action Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/doctor/queue" className="group block">
          <Card className="h-full border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Patient Queue</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {metrics.pendingQueue} patients waiting
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/doctor/prescriptions" className="group block">
          <Card className="h-full border-border bg-card hover:border-secondary/50 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary/10 text-secondary-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8 text-secondary-foreground/70" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Prescriptions</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {metrics.pendingPrescriptions} awaiting sign-off
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/doctor/lab-requests" className="group block">
          <Card className="h-full border-border bg-card hover:border-blue-500/30 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FlaskConical className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Lab Results</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {metrics.pendingLabRequests} pending results
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Simplified Upcoming patients */}
      <Card className="shadow-sm border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
          <div>
            <CardTitle className="text-lg">Next Up for Consultation</CardTitle>
            <CardDescription>Select a patient to begin clinical review</CardDescription>
          </div>
          <Link href="/doctor/queue">
            <Button variant="outline" size="sm">View Full List</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {metrics.upcomingPatients.map((p, idx) => (
              <div key={p.queueNo} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary font-mono">{p.queueNo}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground truncate">{p.patientName}</p>
                    <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 bg-muted rounded-full">Age {p.age}</span>
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs ml-auto border-none">
                      <Clock className="w-3 h-3 mr-1" /> Waiting
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{p.reason}</p>
                </div>
                <Link href={`/doctor/consultation/${p.patientId}?visitId=${p.id || ''}`}>
                  <Button className="bg-primary hover:bg-primary/90 text-white shrink-0 px-6">
                    Start
                  </Button>
                </Link>
              </div>
            ))}
            {metrics.upcomingPatients.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No patients currently waiting in queue.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
