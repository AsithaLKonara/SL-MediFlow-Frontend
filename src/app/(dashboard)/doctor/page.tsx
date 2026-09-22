"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, FlaskConical, Users } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/providers/AuthProvider";

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
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // Fetch tokens for this doctor
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/tokens/queue?doctorId=${user.id}`)
      .then((r) => r.json())
      .then((res: any) => { 
        const tokens = Array.isArray(res) ? res : (res.data || []);
        // Build metrics from real token data
        const upcoming = tokens
          .filter(t => {
            const s = (t.status || "").toLowerCase();
            return s !== "completed" && s !== "prescription_issued" && s !== "cancelled";
          })
                    .map(t => {
            const p = t.Patient || t.patient || {};
            return {
             queueNo: t.tokenNumber,
             patientId: p.id || t.patientId,
             patientName: p.fullName || "Unknown",
             age: p.age || (p.dateOfBirth ? (new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()) : 0),
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
  }, [user]);

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
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Welcome, {metrics.doctorName}</h2>
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

      {/* App-like Action Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/doctor/queue" className="group block">
          <Card className="h-full border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#3A3435]">Patient Queue</h3>
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
                <h3 className="text-xl font-bold text-[#3A3435]">Prescriptions</h3>
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
                <h3 className="text-xl font-bold text-[#3A3435]">Lab Results</h3>
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
                  <span className="text-sm font-bold text-primary">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-[#3A3435] truncate">{p.patientName}</p>
                    <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 bg-muted rounded-full">Age {p.age}</span>
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs ml-auto border-none">
                      <Clock className="w-3 h-3 mr-1" /> Waiting
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{p.reason}</p>
                </div>
                <Link href={`/doctor/consultation/${p.patientId}`}>
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
