"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Microscope, Clock, Search, ArrowRight, ScanBarcode } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { ConsolidatedLabManifestModal, ConsolidatedLabManifest, ConsolidatedTestItem } from "@/components/lab/ConsolidatedLabManifestModal";

interface TestItem {
  id?: string;
  name: string;
  unit: string;
  referenceRange: string;
  roomNumber?: string;
  result: string | null;
  status: string;
}

interface LabRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  doctor: string;
  clinicalIndication: string;
  tests: TestItem[];
  priority: string;
  status: string;
  requestedAt: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING:     { label: "Pending",                 className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  SAVED:       { label: "Saved (Not Published)",   className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  IN_PROGRESS: { label: "In Progress",             className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  COMPLETED:   { label: "Published",               className: "bg-green-500/10 text-green-600 dark:text-green-400" },
};

export default function LabTechRequestsPage() {
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenSearch, setTokenSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [manifest, setManifest] = useState<ConsolidatedLabManifest | null>(null);
  const [isManifestOpen, setIsManifestOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>("ALL");
  const { token } = useAuth();
  const router = useRouter();

  const performTokenSearch = async (query: string) => {
    const code = query.trim();
    if (!code) return;
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    setSearching(true);
    try {
      // 1. Fast direct lab request & token resolver (<15ms)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/requests/token/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      // 1. Check direct lab requests by token/barcode
      if (data.success && data.data?.LabRequests && data.data.LabRequests.length > 0) {
        const d = data.data;
        const tests: ConsolidatedTestItem[] = [];
        (d.LabRequests || []).forEach((lr: any) => {
          const isDoctor = !!lr.doctorId;
          (lr.items || []).forEach((item: any) => {
            tests.push({
              requestId: lr.id,
              testId: item.LabTest?.id || item.labTestId,
              testName: item.LabTest?.name || "Lab Test",
              category: item.LabTest?.category,
              roomNumber: item.LabTest?.room?.roomNumber || undefined,
              status: lr.status,
              source: isDoctor ? "Doctor" : "Frontdesk",
              requestedAt: lr.requestedAt,
              price: item.price
            });
          });
        });

        setManifest({
          masterBarcode: d.bookingReference || code,
          patient: {
            name: d.Patient?.fullName || "Walk-in Patient",
            age: d.Patient?.ageFallback,
            gender: d.Patient?.gender,
            phone: d.Patient?.phone
          },
          tokens: {
            lab: d.tokens?.lab || d.tokenNumber,
            consultation: d.tokens?.consultation || null
          },
          room: "LAB",
          tests
        });
        setIsManifestOpen(true);
        toast.success(`Loaded visit manifest for ${d.Patient?.fullName || "Patient"}.`);
        return;
      }

      // 2. Check universal barcode resolver
      const barcodeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/barcode/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });

      if (barcodeRes.ok) {
        const { type, data: bData, masterBarcode } = await barcodeRes.json();
        if (type === "LAB_REQUEST") {
          const lr = bData;
          const tests: ConsolidatedTestItem[] = (lr.items || []).map((item: any) => ({
            requestId: lr.id,
            testId: item.LabTest?.id || item.labTestId,
            testName: item.LabTest?.name || "Lab Test",
            category: item.LabTest?.category,
            roomNumber: item.LabTest?.room?.roomNumber || undefined,
            status: lr.status,
            source: lr.doctorId ? "Doctor" : "Frontdesk",
            requestedAt: lr.requestedAt,
            price: item.price
          }));

          setManifest({
            masterBarcode: code,
            patient: {
              name: lr.Patient?.fullName || "Walk-in Patient",
              age: lr.Patient?.ageFallback,
              gender: lr.Patient?.gender,
              phone: lr.Patient?.phone
            },
            tokens: { lab: "LAB", consultation: null },
            room: "LAB",
            tests
          });
          setIsManifestOpen(true);
          toast.success(`Lab request found.`);
          return;
        }

        if (type === "APPOINTMENT") {
          const lrs = bData.labRequests || bData.appointment?.LabRequests || [];
          if (lrs.length > 0) {
            const tests: ConsolidatedTestItem[] = [];
            lrs.forEach((lr: any) => {
              const isDoctor = !!lr.doctorId;
              (lr.items || []).forEach((item: any) => {
                tests.push({
                  requestId: lr.id,
                  testId: item.LabTest?.id || item.labTestId,
                  testName: item.LabTest?.name || "Lab Test",
                  category: item.LabTest?.category,
                  roomNumber: item.LabTest?.room?.roomNumber || undefined,
                  status: lr.status,
                  source: isDoctor ? "Doctor" : "Frontdesk",
                  requestedAt: lr.requestedAt,
                  price: item.price
                });
              });
            });

            setManifest({
              masterBarcode: masterBarcode || bData.masterBarcode || code,
              patient: {
                name: bData.patient?.fullName || bData.appointment?.Patient?.fullName || "Walk-in Patient",
                age: bData.patient?.ageFallback || bData.appointment?.Patient?.ageFallback,
                gender: bData.patient?.gender || bData.appointment?.Patient?.gender,
                phone: bData.patient?.phone || bData.appointment?.Patient?.phone
              },
              tokens: {
                lab: bData.tokens?.lab || null,
                consultation: bData.tokens?.consultation || null
              },
              room: bData.rooms?.lab || "LAB",
              tests
            });
            setIsManifestOpen(true);
            toast.success(`Visit manifest loaded: ${tests.length} tests found.`);
            return;
          } else {
            toast.info(`Visit ${bData.masterBarcode || code} has no lab tests requested.`);
            return;
          }
        }
      }

      toast.error(`No pending lab requests found for barcode/token "${code}".`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to search token or barcode.");
    } finally {
      setSearching(false);
    }
  };

  // Barcode scanner: scanning auto-searches without touching keyboard
  useBarcodeScanner((barcode) => {
    performTokenSearch(barcode);
  });

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/requests`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to load requests");
        return r.json();
      })
      .then((data: any[]) => {
        const mapped = data.map(req => ({
          id: req.id,
          patientId: req.patientId,
          patientName: req.Patient?.fullName || `Patient ${req.patientId.slice(0, 4)}`,
          patientAge: req.Patient?.ageFallback || (req.Patient?.dateOfBirth ? (new Date().getFullYear() - new Date(req.Patient.dateOfBirth).getFullYear()) : 0),
          doctor: req.Visit?.User?.fullName || "External Doctor",
          clinicalIndication: req.Visit?.clinicalNotes || "Routine Checkup",
          tests: (req.items || []).map((item: any) => ({
            id: item.LabTest?.id,
            name: item.LabTest?.name,
            unit: item.LabTest?.unit || "",
            referenceRange: item.LabTest?.referenceRange || "",
            roomNumber: item.LabTest?.room?.roomNumber || "",
            result: null,
            status: req.status
          })),
          priority: req.priority || "ROUTINE",
          status: req.status,
          requestedAt: req.requestedAt
        }));
        setRequests(mapped);
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to fetch requests", e);
        setLoading(false);
      });
  }, []);

  const filteredRequests = useMemo(() => {
    if (selectedRoom === "ALL") return requests;
    return requests.filter(r =>
      r.tests.some((t: any) => (t.roomNumber || "").toUpperCase().includes(selectedRoom.toUpperCase()))
    );
  }, [requests, selectedRoom]);

  const active = filteredRequests.filter(r => r.status === "PENDING" || r.status === "SAVED" || r.status === "IN_PROGRESS");
  const published = filteredRequests.filter(r => r.status === "COMPLETED");

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  const RequestCard = ({ req }: { req: LabRequest }) => {
    const sc = statusConfig[req.status] ?? { label: req.status, className: "bg-muted/50 text-foreground/80" };
    return (
      <div className={`rounded-lg border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow ${req.priority === "URGENT" ? "border-red-500/20 bg-red-500/10/20" : ""}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold uppercase tracking-wider text-xs text-muted-foreground">{req.id.split('-')[0]}</span>
              {req.priority === "URGENT" && (
                <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 gap-1 animate-pulse text-xs">
                  <AlertTriangle className="w-3 h-3" /> URGENT
                </Badge>
              )}
              <Badge variant="secondary" className={`${sc.className} text-xs`}>{sc.label}</Badge>
            </div>
            <p className="font-semibold text-foreground mt-1">{req.patientName} <span className="text-muted-foreground font-normal text-sm">· Age {req.patientAge}</span></p>
            <p className="text-sm text-muted-foreground mt-1">Requested by <span className="font-medium text-foreground">{req.doctor}</span></p>
            <p className="text-xs text-muted-foreground mt-0.5 italic">"{req.clinicalIndication}"</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" />{new Date(req.requestedAt).toLocaleTimeString()}
            </p>
            {req.status !== "COMPLETED" && (
              <div className="flex flex-col gap-2 mt-2 items-end">
                <div className="flex gap-2">
                  <Link href={`/labtech/results/${req.id}`}>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
                      {req.status === "PENDING" ? "Create Report" : "Edit Results"}
                    </Button>
                  </Link>
                  {req.status === "PENDING" && (
                    <Link href={`/labtech/results/${req.id}`}>
                      <Button size="sm" variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200">
                        Upload PDF
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tests list */}
        <div className="border-t pt-3 flex flex-wrap gap-2">
          {req.tests.map((t, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs bg-muted/50 rounded-md px-2 py-1">
              <Microscope className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{t.name}</span>
              {t.roomNumber && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {t.roomNumber}
                </span>
              )}
              {t.result && <span className="text-primary font-semibold">→ {t.result}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">Lab Test Requests</h2>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <p className="text-muted-foreground text-sm">
              {active.length} active · {published.length} published today
            </p>
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border">
              {(["ALL", "LAB-A", "LAB-B"] as const).map(rm => (
                <button
                  key={rm}
                  type="button"
                  onClick={() => setSelectedRoom(rm)}
                  className={`px-2.5 py-0.5 rounded-md text-xs font-bold transition-all ${
                    selectedRoom === rm
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {rm === "ALL" ? "All Labs" : rm === "LAB-A" ? "Lab Room A" : "Lab Room B"}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Barcode/Token Search */}
        <form onSubmit={(e) => { e.preventDefault(); performTokenSearch(tokenSearch); }} className="flex items-center gap-2 max-w-md w-full bg-card p-2 rounded-lg border shadow-sm">
          <ScanBarcode className="w-5 h-5 text-primary ml-2 shrink-0" />
          <Input
            value={tokenSearch}
            onChange={(e) => setTokenSearch(e.target.value)}
            placeholder="Scan barcode or type token #..."
            className="border-0 bg-transparent focus-visible:ring-0 shadow-none flex-1 text-sm font-mono"
          />
          <Button type="submit" disabled={!tokenSearch.trim()} isLoading={searching}>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </form>
      </div>

      {active.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Active Requests ({active.length})</CardTitle>
            <CardDescription>Click "Start Processing" or "Enter Results" to open the results entry form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sort urgent first */}
            {[...active].sort((a, b) => (a.priority === "URGENT" ? -1 : 1)).map(req => (
              <RequestCard key={req.id} req={req} />
            ))}
          </CardContent>
        </Card>
      )}

      {published.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Published Reports ({published.length})</CardTitle>
            <CardDescription>Reports that have been finalized and sent back to the requesting doctor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {published.map(req => <RequestCard key={req.id} req={req} />)}
          </CardContent>
        </Card>
      )}

      <ConsolidatedLabManifestModal
        isOpen={isManifestOpen}
        onClose={() => setIsManifestOpen(false)}
        manifest={manifest}
      />
    </div>
  );
}
