"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";

export default function LabTechReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/lab/reports`)
      .then(r => r.json())
      .then(data => {
        setReports(data);
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to load reports", e);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Published Reports</h2>
        <p className="text-muted-foreground mt-1">
          A log of all finalized lab reports sent to doctors.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>All Completed Reports ({reports.length})</CardTitle>
          <CardDescription>View historical lab results and attached PDFs.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No reports published yet.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date Published</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Test Ordered</TableHead>
                    <TableHead>Requesting Doctor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">PDF Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(req.requestedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium text-[#3A3435]">
                        Patient {req.patientId.slice(0, 4)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{req.test.name}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {req.doctorId || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {req.reportUrl ? (
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(req.reportUrl, '_blank')}>
                            <Download className="w-4 h-4" /> View PDF
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No PDF Attached</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
