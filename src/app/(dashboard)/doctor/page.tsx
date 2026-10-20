"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, FlaskConical, Users, ScanBarcode, Search, Loader2, DollarSign, Receipt, CheckCircle, ActivitySquare, FilePlus2 } from "lucide-react";
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
  const [extraServicesOrders, setExtraServicesOrders] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<{
    todayDoctorShare: number;
    todayRevenue: number;
    todayCommission: number;
    todayPatientsCount: number;
    todaySheetStatus: string;
    commissionRate: number;
    patientItems: any[];
  } | null>(null);

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
        const todayColombo = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
        
        // Isolate tokens strictly for today
        const todayTokens = tokens.filter(t => {
          if (!t.appointmentDate) return true;
          const aptDateStr = new Date(t.appointmentDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
          return aptDateStr === todayColombo;
        });

        // Build metrics from today's token data only
        const upcoming = todayTokens
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
          specialty: "General",
          patientsToday: todayTokens.length,
          completedConsultations: todayTokens.filter(t => {
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

    // Fetch doctor's earnings summary from fund office
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/fund-office/doctor-summary?doctorId=${user.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setEarnings(data.data);
        }
      })
      .catch((err) => console.error("Error loading doctor earnings:", err));

    // Fetch doctor's extra service orders
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((res: any) => {
        const orders = Array.isArray(res) ? res : (res.orders || res.data || []);
        const myOrders = orders.filter((o: any) => !o.doctorId || o.doctorId === user.id);
        setExtraServicesOrders(myOrders);
      })
      .catch((err) => console.error("Error loading extra service orders:", err));
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
          <div className="w-px h-8 bg-border"></div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">My Share Today</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              LKR {(earnings?.todayDoctorShare || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <Link href="/extra-services" className="group block">
          <Card className="h-full border-border bg-card hover:border-purple-500/30 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ActivitySquare className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Extra Services</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {extraServicesOrders.filter(o => o.status === "PENDING").length} pending procedures
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Today's Doctor Share & Earnings Summary */}
      <Card className="shadow-sm border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 via-card to-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Today's Consultation Earnings & Doctor Share
                {earnings?.todaySheetStatus && (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    {earnings.todaySheetStatus}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Calculated from completed patient consultations, clinic fees, and hospital commission.
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Net Doctor Share Today</span>
            <span className="text-2xl font-black text-emerald-600">
              LKR {(earnings?.todayDoctorShare || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-muted/40 p-3 rounded-lg border">
            <div>
              <span className="text-muted-foreground block">Total Patients Consulted</span>
              <span className="text-base font-bold text-foreground">
                {earnings?.todayPatientsCount ?? metrics.completedConsultations} Patients
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Gross Consultation Revenue</span>
              <span className="text-base font-bold text-foreground">
                LKR {(earnings?.todayRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">
                Hospital Commission ({earnings?.commissionRate || 20}%)
              </span>
              <span className="text-base font-bold text-rose-600">
                - LKR {(earnings?.todayCommission || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {earnings?.patientItems && earnings.patientItems.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Completed Patient Consultations ({earnings.patientItems.length})
              </p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2 px-3 text-left">#</th>
                      <th className="py-2 px-3 text-left">Patient Name</th>
                      <th className="py-2 px-3 text-left">Token #</th>
                      <th className="py-2 px-3 text-right">Consultation Fee</th>
                      <th className="py-2 px-3 text-right">Hospital Share</th>
                      <th className="py-2 px-3 text-right font-bold text-emerald-700">Doctor Share</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {earnings.patientItems.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-muted/30">
                        <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-foreground">{item.patientName}</td>
                        <td className="py-2 px-3 font-mono text-muted-foreground">{item.tokenNumber || "-"}</td>
                        <td className="py-2 px-3 text-right">LKR {item.consultationFee.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-rose-600">LKR {item.hospitalShare.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">
                          LKR {item.doctorShare.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            Completed
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2">
              No consultations completed yet today. As soon as you complete a patient in consultation, their fee and your doctor share will appear here instantly.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Extra Services & Procedures Ordered by Doctor */}
      <Card className="shadow-sm border-purple-500/20 bg-gradient-to-r from-purple-500/5 via-card to-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <ActivitySquare className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Extra Services & Procedures</CardTitle>
              <CardDescription>
                Track status of procedures and medical certificates ordered for your patients
              </CardDescription>
            </div>
          </div>
          <Link href="/extra-services">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
              <FilePlus2 className="w-3.5 h-3.5" />
              Open Workstation
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {extraServicesOrders.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No extra services or procedures ordered yet today. When you order ECG, dressing, or certificates during consultation, they will appear here.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {extraServicesOrders.slice(0, 5).map((order) => {
                const isDone = order.status === "COMPLETED";
                const serviceTitle = order.service?.title || (order.certificateType ? `Certificate (${order.certificateType})` : "Clinical Service");
                const reportsCount = order.reportFiles?.length || 0;
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                        {order.orderNumber.slice(-4)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-xs text-foreground truncate">{order.patient?.fullName || "Patient"}</p>
                          <Badge variant="outline" className="text-[10px] font-medium py-0">
                            {serviceTitle}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Order #{order.orderNumber} • LKR {order.finalPrice?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {isDone ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] gap-1 font-bold">
                          <CheckCircle className="w-3 h-3" />
                          COMPLETED
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] gap-1 font-bold">
                          <Clock className="w-3 h-3" />
                          PENDING
                        </Badge>
                      )}
                      {reportsCount > 0 && (
                        <Link href="/extra-services" className="text-xs text-purple-600 hover:underline flex items-center gap-1 font-medium">
                          <FileText className="w-3.5 h-3.5" />
                          Report ({reportsCount})
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
