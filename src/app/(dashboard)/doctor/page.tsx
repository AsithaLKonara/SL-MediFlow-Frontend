"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Clock, FilePen, FlaskConical, UserCheck } from "lucide-react";
import Link from "next/link";

interface Metrics {
  doctorName: string;
  specialty: string;
  patientsToday: number;
  completedConsultations: number;
  pendingQueue: number;
  pendingPrescriptions: number;
  pendingLabRequests: number;
  upcomingPatients: { queueNo: string; patientId: string; patientName: string; age: number; reason: string; status: string }[];
}

export default function DoctorOverview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/doctor/metrics")
      .then((r) => r.json())
      .then((d) => { setMetrics(d); setLoading(false); });
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
        <p className="text-sm font-medium text-primary uppercase tracking-wider">{metrics.specialty}</p>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">{metrics.doctorName}</h2>
        <p className="text-muted-foreground mt-1">Here is your clinical summary for today.</p>
      </div>

      {/* KPI Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Patients Today</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.patientsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Total assigned patients</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{metrics.completedConsultations}</div>
            <p className="text-xs text-muted-foreground mt-1">Consultations done</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Prescriptions</CardTitle>
            <FilePen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pendingPrescriptions}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting sign-off</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lab Requests</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.pendingLabRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending results</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming patients */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Next Up — Patient Queue</CardTitle>
            <CardDescription>{metrics.pendingQueue} patients waiting for consultation</CardDescription>
          </div>
          <Link href="/doctor/queue">
            <Button variant="outline" size="sm">View Full Queue</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.upcomingPatients.map((p, idx) => (
              <div key={p.queueNo} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#3A3435] truncate">{p.patientName}</p>
                    <span className="text-xs text-muted-foreground">Age {p.age}</span>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs ml-auto">
                      <Clock className="w-3 h-3 mr-1" /> Waiting
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{p.reason}</p>
                </div>
                <Link href={`/doctor/consultation/${p.patientId}`}>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-white shrink-0">
                    Start Consultation
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
