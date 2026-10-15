"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ScanBarcode, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface QueueEntry {
  id: string;
  queueNo: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  reason: string;
  priority: string;
  status: string;
  waitingSince: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  WAITING:         { label: "Waiting",         className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  IN_CONSULTATION: { label: "In Consultation", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  COMPLETED:       { label: "Completed",       className: "bg-green-500/10 text-green-600 dark:text-green-400" },
};

import { useAuth } from "@/components/providers/AuthProvider";

export default function DoctorQueuePage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const handleBarcodeSearch = async (code: string) => {
    const raw = code.trim();
    if (!raw) return;
    setSearching(true);

    try {
      // 1. Check local queue
      const match = queue.find(
        (q) =>
          q.queueNo.toLowerCase() === raw.toLowerCase() ||
          q.patientId === raw ||
          q.id === raw ||
          (raw.length >= 8 && q.id.startsWith(raw))
      );
      if (match) {
        toast.success(`Found Token #${match.queueNo}: ${match.patientName}. Opening consultation...`);
        router.push(`/doctor/consultation/${match.patientId}`);
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
              router.push(`/doctor/consultation/${patientId}?editPrescriptionId=${activeRx.id}`);
            } else {
              toast.success(`Found Token #${tokenNo}: ${patientName}. Opening consultation...`);
              router.push(`/doctor/consultation/${patientId}`);
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

      toast.error(`No patient appointment found for barcode "${raw}".`);
    } catch (e) {
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
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/tokens/queue?doctorId=${user.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => r.json()).then((d) => {
      const tokens = Array.isArray(d) ? d : (d.data || []);
      const activeQueue = tokens
        .filter((q: any) => {
          const s = (q.status || "").toUpperCase();
          return s !== "COMPLETED" && s !== "PRESCRIPTION_ISSUED" && s !== "CANCELLED" && s !== "NO_SHOW";
        })
        .map((t: any) => {
          const p = t.Patient || t.patient || {};
          return {
             id: t.id,
             queueNo: t.tokenNumber,
             patientId: p.id || t.patientId,
             patientName: p.fullName || "Unknown",
             age: p.ageFallback || (p.dateOfBirth ? (new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()) : 0),
             gender: p.gender || "UNKNOWN",
             reason: t.department || "Consultation",
             priority: "NORMAL",
             status: (t.status === "BOOKED" ? "WAITING" : (t.status === "IN_PROGRESS" ? "IN_CONSULTATION" : t.status)),
             waitingSince: t.createdAt
          };
        });
      setQueue(activeQueue);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, token]);

  const waitingCount = queue.filter((q) => q.status === "WAITING").length;

  const filteredQueue = queue.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      entry.queueNo.toLowerCase().includes(q) ||
      entry.patientName.toLowerCase().includes(q) ||
      entry.patientId.toLowerCase().includes(q) ||
      entry.reason.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">My Patient Queue</h2>
          <p className="text-muted-foreground mt-1">
            {waitingCount} patient{waitingCount !== 1 ? "s" : ""} waiting for your consultation today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Barcode Scanner Active</span>
        </div>
      </div>

      {/* Barcode / Token Search Bar */}
      <Card className="border-primary/20 bg-card shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBarcodeSearch(searchQuery);
            }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="relative flex-1 w-full">
              <ScanBarcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <Input
                type="text"
                placeholder="Scan patient token barcode or search by name / token #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 font-mono text-sm"
              />
            </div>
            <Button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="h-10 px-5 w-full sm:w-auto font-medium gap-2 shrink-0"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{searching ? "Searching..." : "Open Consultation"}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Today's Assigned Patients</CardTitle>
          <CardDescription>Click "Start Consultation" or scan a patient token to open clinical review.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Queue #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Age / Gender</TableHead>
                    <TableHead>Chief Complaint</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Waiting Since</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQueue.map((entry) => {
                    const sc = statusConfig[entry.status] ?? { label: entry.status, className: "bg-muted/50 text-foreground/80" };
                    return (
                      <TableRow key={entry.id} className={entry.status === "COMPLETED" ? "opacity-50" : ""}>
                        <TableCell className="font-mono font-bold text-primary">{entry.queueNo}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-[#3A3435] dark:text-gray-100">{entry.patientName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{entry.patientId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{entry.age} / {entry.gender === "MALE" ? "M" : "F"}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{entry.reason}</TableCell>
                        <TableCell>
                          {entry.priority === "URGENT" ? (
                            <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 gap-1">
                              <AlertTriangle className="w-3 h-3" /> Urgent
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-muted/50 text-muted-foreground">Normal</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(entry.waitingSince).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={sc.className}>{sc.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.status !== "COMPLETED" ? (
                            <Link href={`/doctor/consultation/${entry.patientId}`}>
                              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
                                Start Consultation
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/doctor/consultation/${entry.patientId}`}>
                              <Button size="sm" variant="outline">View Record</Button>
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
