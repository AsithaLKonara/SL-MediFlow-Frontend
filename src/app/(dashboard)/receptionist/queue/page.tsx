"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface QueueEntry {
  id: string;
  queueNo: string;
  patientId: string;
  patientName: string;
  assignedDoctor: string | null;
  registeredAt: string;
  status: string;
  priority: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  available: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  WAITING:         { label: "Waiting",         className: "bg-yellow-100 text-yellow-700" },
  IN_CONSULTATION: { label: "In Consultation", className: "bg-blue-100 text-blue-700" },
  COMPLETED:       { label: "Completed",       className: "bg-green-100 text-green-700" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  NORMAL: { label: "Normal", className: "bg-slate-100 text-slate-600" },
  URGENT: { label: "Urgent", className: "bg-red-100 text-red-700 animate-pulse" },
};

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/receptionist/queue").then((r) => r.json()),
      fetch("/api/receptionist/doctors").then((r) => r.json()),
    ]).then(([qData, dData]) => {
      setQueue(qData.data);
      setDoctors(dData.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const assignDoctor = (entryId: string, doctor: Doctor) => {
    setQueue((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, assignedDoctor: doctor.name } : e
      )
    );
    toast.success(`${doctor.name} assigned successfully.`);
  };

  const updateStatus = (entryId: string, status: string, label: string) => {
    setQueue((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, status } : e))
    );
    toast.success(`Queue entry marked as ${label}.`);
  };

  const availableDoctors = doctors.filter((d) => d.available);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">OPD Queue Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage the live outpatient queue — assign doctors and track consultation status.
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh Queue
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        {Object.values(statusConfig).map((s) => (
          <Badge key={s.label} variant="secondary" className={s.className}>{s.label}</Badge>
        ))}
        {Object.values(priorityConfig).map((p) => (
          <Badge key={p.label} variant="secondary" className={p.className}>{p.label}</Badge>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Active Queue</CardTitle>
          <CardDescription>
            {queue.filter((q) => q.status !== "COMPLETED").length} patients waiting or in consultation
          </CardDescription>
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
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned Doctor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((entry) => {
                    const sc = statusConfig[entry.status] ?? { label: entry.status, className: "bg-slate-100 text-slate-700" };
                    const pc = priorityConfig[entry.priority] ?? { label: entry.priority, className: "bg-slate-100 text-slate-600" };
                    return (
                      <TableRow key={entry.id} className={entry.status === "COMPLETED" ? "opacity-50" : ""}>
                        <TableCell className="font-mono font-bold text-primary">{entry.queueNo}</TableCell>
                        <TableCell className="font-medium text-[#3A3435]">{entry.patientName}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{entry.patientId}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={pc.className}>{pc.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {entry.assignedDoctor ? (
                            <span className="font-medium">{entry.assignedDoctor}</span>
                          ) : (
                            <span className="italic text-red-500 text-sm">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={sc.className}>{sc.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(entry.registeredAt).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="outline-none">
                              <div className="inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                                Actions
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Assign Doctor
                              </div>
                              {availableDoctors.map((doc) => (
                                <DropdownMenuItem
                                  key={doc.id}
                                  onClick={() => assignDoctor(entry.id, doc)}
                                  disabled={entry.assignedDoctor === doc.name}
                                >
                                  <div>
                                    <p className="font-medium">{doc.name}</p>
                                    <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Update Status
                              </div>
                              <DropdownMenuItem
                                onClick={() => updateStatus(entry.id, "IN_CONSULTATION", "In Consultation")}
                                disabled={entry.status === "IN_CONSULTATION"}
                              >
                                Mark as In Consultation
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus(entry.id, "COMPLETED", "Completed")}
                                disabled={entry.status === "COMPLETED"}
                              >
                                Mark as Completed
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
