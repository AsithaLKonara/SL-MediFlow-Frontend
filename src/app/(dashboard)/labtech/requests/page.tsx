"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Microscope, Clock } from "lucide-react";
import Link from "next/link";

interface TestItem {
  name: string;
  unit: string;
  referenceRange: string;
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
  PENDING:     { label: "Pending",     className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  IN_PROGRESS: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  COMPLETED:   { label: "Completed",   className: "bg-muted/50 text-foreground/80" },
  PUBLISHED:   { label: "Published",   className: "bg-green-500/10 text-green-600 dark:text-green-400" },
};

export default function LabTechRequestsPage() {
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL}`}/lab/requests`)
      .then(r => r.json())
      .then((data: any[]) => {
        const mapped = data.map(req => ({
          id: req.id,
          patientId: req.patientId,
          patientName: req.Patient?.fullName || `Patient ${req.patientId.slice(0, 4)}`,
          patientAge: 30,
          doctor: req.Visit?.User?.fullName || req.doctorId || "Unknown",
          clinicalIndication: "Routine Checkup",
          tests: (req.items || []).map((item: any) => ({
            id: item.LabTest?.id,
            name: item.LabTest?.name,
            unit: item.LabTest?.unit || "",
            referenceRange: item.LabTest?.referenceRange || "",
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

  const active = requests.filter(r => r.status !== "PUBLISHED");
  const published = requests.filter(r => r.status === "PUBLISHED");

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
              <span className="font-mono text-xs text-muted-foreground">{req.id}</span>
              {req.priority === "URGENT" && (
                <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 gap-1 animate-pulse text-xs">
                  <AlertTriangle className="w-3 h-3" /> URGENT
                </Badge>
              )}
              <Badge variant="secondary" className={`${sc.className} text-xs`}>{sc.label}</Badge>
            </div>
            <p className="font-semibold text-[#3A3435] mt-1">{req.patientName} <span className="text-muted-foreground font-normal text-sm">· Age {req.patientAge}</span></p>
            <p className="text-sm text-muted-foreground">Requested by {req.doctor}</p>
            <p className="text-xs text-muted-foreground mt-0.5 italic">"{req.clinicalIndication}"</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" />{new Date(req.requestedAt).toLocaleTimeString()}
            </p>
            {req.status !== "PUBLISHED" && (
              <Link href={`/labtech/results/${req.id}`}>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white mt-2">
                  {req.status === "PENDING" ? "Start Processing" : "Enter Results"}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Tests list */}
        <div className="border-t pt-3 flex flex-wrap gap-2">
          {req.tests.map((t, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs bg-muted/50 rounded-md px-2 py-1">
              <Microscope className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{t.name}</span>
              {t.result && <span className="text-primary font-semibold">→ {t.result}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Lab Test Requests</h2>
        <p className="text-muted-foreground mt-1">
          {active.length} active · {published.length} published today
        </p>
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
    </div>
  );
}
