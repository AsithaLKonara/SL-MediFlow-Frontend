"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardList, Stethoscope, CalendarCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface QueueItem {
  queueNo: string;
  patientName: string;
  doctor: string;
  status: string;
}

interface Metrics {
  registeredToday: number;
  currentQueueSize: number;
  availableDoctors: number;
  pendingAppointments: number;
  nextInQueue: QueueItem[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  IN_CONSULTATION: { label: "In Consultation", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  WAITING: { label: "Waiting", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  COMPLETED: { label: "Completed", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
};

export default function ReceptionistOverview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Arrival Modal State
  const [isArrivalModalOpen, setIsArrivalModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, docsRes] = await Promise.all([
        fetch("/api/receptionist/metrics"),
        fetch("/api/receptionist/doctors/today")
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }
      
      if (docsRes.ok) {
        const docData = await docsRes.json();
        if (docData.success) {
          setDoctors(docData.data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleMarkArrived = async () => {
    if (!selectedDoctorId || !roomNumber) {
      toast.error("Room number is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/receptionist/doctors/${selectedDoctorId}/arrive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomNumber })
      });

      if (res.ok) {
        toast.success("Doctor marked as arrived");
        setIsArrivalModalOpen(false);
        setRoomNumber("");
        fetchDashboardData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to mark arrived");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Receptionist Overview</h2>
        <p className="text-muted-foreground mt-2">
          Today's patient intake and OPD status at a glance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Registered Today</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.registeredToday}</div>
            <p className="text-xs text-muted-foreground mt-1">New patient registrations</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Queue</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.currentQueueSize}</div>
            <p className="text-xs text-muted-foreground mt-1">Patients in OPD queue</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Doctors</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.availableDoctors}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready to consult</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Appointments</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">Require follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Mini queue snapshot */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Live Queue Snapshot</CardTitle>
          <CardDescription>Next 5 patients in the OPD queue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Queue #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Assigned Doctor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.nextInQueue.map((item) => {
                  const sc = statusConfig[item.status] ?? { label: item.status, className: "bg-muted/50 text-foreground/80" };
                  return (
                    <TableRow key={item.queueNo}>
                      <TableCell className="font-mono font-semibold text-primary">{item.queueNo}</TableCell>
                      <TableCell className="font-medium text-[#3A3435]">{item.patientName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.doctor === "Unassigned" ? (
                          <span className="italic text-red-500">Unassigned</span>
                        ) : (
                          item.doctor
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={sc.className}>
                          {sc.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Doctor Arrivals Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Doctor Arrivals (Today)</CardTitle>
          <CardDescription>Mark doctors as arrived and assign rooms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No doctors scheduled for today.
                    </TableCell>
                  </TableRow>
                ) : (
                  doctors.map((doc: any) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium text-[#3A3435]">{doc.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.specialty || "General"}</TableCell>
                      <TableCell>
                        <Badge variant={doc.status === "ARRIVED" ? "default" : "secondary"}>
                          {doc.status || "PENDING"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{doc.roomNumber || "-"}</TableCell>
                      <TableCell className="text-right">
                        {doc.status !== "ARRIVED" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedDoctorId(doc.id);
                              setRoomNumber(doc.roomNumber || "");
                              setIsArrivalModalOpen(true);
                            }}
                          >
                            Mark Arrived
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isArrivalModalOpen} onOpenChange={setIsArrivalModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark Doctor Arrived</DialogTitle>
            <DialogDescription>
              Assign a room number for the doctor's consultation session today.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="room" className="text-right text-sm font-medium">
                Room No
              </label>
              <Input
                id="room"
                placeholder="e.g. 101 or Room A"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArrivalModalOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkArrived} disabled={submitting || !roomNumber}>
              {submitting ? "Saving..." : "Confirm Arrival"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
