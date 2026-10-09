"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
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
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/tokens/queue?doctorId=${user.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => r.json()).then((d) => {
      const tokens = Array.isArray(d) ? d : (d.data || []);
      const activeQueue = tokens
        .filter((q: any) => {
          const s = (q.status || "").toUpperCase();
          return s !== "COMPLETED" && s !== "PRESCRIPTION_ISSUED" && s !== "CANCELLED";
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">My Patient Queue</h2>
        <p className="text-muted-foreground mt-1">
          {waitingCount} patient{waitingCount !== 1 ? "s" : ""} waiting for your consultation today.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Today's Assigned Patients</CardTitle>
          <CardDescription>Click "Start Consultation" to open the full clinical view for a patient.</CardDescription>
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
                  {queue.map((entry) => {
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
