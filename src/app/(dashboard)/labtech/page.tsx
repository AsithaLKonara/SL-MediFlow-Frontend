"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Microscope, FileCheck, Clock, AlertTriangle, FlaskConical } from "lucide-react";
import Link from "next/link";

interface Metrics {
  pendingRequests: number;
  inProgressTests: number;
  publishedToday: number;
  criticalResults: number;
  urgentRequests: { id: string; patientName: string; doctor: string; tests: string[]; priority: string; requestedAt: string }[];
}

export default function LabTechOverview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/labtech/metrics").then(r => r.json()).then(d => { setMetrics(d); setLoading(false); });
  }, []);

  if (loading || !metrics) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Laboratory Overview</h2>
        <p className="text-muted-foreground mt-2">Today's diagnostic workload and testing summary.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Microscope className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pendingRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.inProgressTests}</div>
            <p className="text-xs text-muted-foreground mt-1">Tests currently running</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published Today</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{metrics.publishedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Reports sent to doctors</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical Results</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.criticalResults}</div>
            <p className="text-xs text-muted-foreground mt-1">Require immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Requests */}
      {metrics.urgentRequests.length > 0 && (
        <Card className="shadow-sm border-red-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Urgent Test Requests
              </CardTitle>
              <CardDescription>These require immediate processing.</CardDescription>
            </div>
            <Link href="/labtech/requests">
              <Button variant="outline" size="sm">View All Requests</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.urgentRequests.map((req) => (
              <div key={req.id} className="flex items-start gap-4 p-4 rounded-lg border border-red-200 bg-red-50/40">
                <div className="p-2 bg-red-100 rounded-lg shrink-0">
                  <Microscope className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#3A3435]">{req.patientName}</p>
                    <span className="text-xs text-muted-foreground">by {req.doctor}</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-700 animate-pulse ml-auto">
                      URGENT
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">🧪 {req.tests.join(", ")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <Clock className="w-3 h-3 inline mr-1" />{new Date(req.requestedAt).toLocaleTimeString()}
                  </p>
                </div>
                <Link href={`/labtech/results/${req.id}`}>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shrink-0">
                    Process Now
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
