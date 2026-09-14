"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pill, ClipboardCheck, PackageSearch, DollarSign, Clock } from "lucide-react";
import Link from "next/link";

interface Metrics {
  pendingPrescriptions: number;
  fulfilledToday: number;
  lowStockItems: number;
  totalRevenue: number;
  recentPrescriptions: { id: string; patientName: string; doctor: string; drugs: string[]; status: string; issuedAt: string }[];
}

export default function PharmacistOverview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pharmacist/metrics").then(r => r.json()).then(d => { setMetrics(d); setLoading(false); });
  }, []);

  if (loading || !metrics) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Pharmacy Overview</h2>
        <p className="text-muted-foreground mt-2">Today's dispensing summary and pharmacy status.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Prescriptions</CardTitle>
            <Pill className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pendingPrescriptions}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting dispensing</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fulfilled Today</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{metrics.fulfilledToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Prescriptions dispensed</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <PackageSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.lowStockItems}</div>
            <p className="text-xs text-muted-foreground mt-1">Items need reordering</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">From medication sales</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Prescriptions</CardTitle>
            <CardDescription>Latest digital prescriptions received from doctors</CardDescription>
          </div>
          <Link href="/pharmacist/prescriptions">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.recentPrescriptions.map((rx) => (
            <div key={rx.id} className="flex items-start gap-4 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Pill className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[#3A3435]">{rx.patientName}</p>
                  <span className="text-xs text-muted-foreground">by {rx.doctor}</span>
                  <Badge variant="secondary" className={rx.status === "PENDING" ? "bg-yellow-100 text-yellow-700 ml-auto" : "bg-green-100 text-green-700 ml-auto"}>
                    {rx.status === "PENDING" ? <><Clock className="w-3 h-3 mr-1 inline" />Pending</> : "Fulfilled"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">💊 {rx.drugs.join(", ")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{new Date(rx.issuedAt).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
