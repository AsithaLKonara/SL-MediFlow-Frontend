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
  IN_CONSULTATION: { label: "In Consultation", className: "bg-blue-100 text-blue-700" },
  WAITING: { label: "Waiting", className: "bg-yellow-100 text-yellow-700" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
};

export default function ReceptionistOverview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/receptionist/metrics")
      .then((r) => r.json())
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      });
  }, []);

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
    </div>
  );
}
