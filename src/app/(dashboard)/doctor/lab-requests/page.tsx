"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";


export default function DoctorLabRequestsPage() {
  const { token, user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [completedReports, setCompletedReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLabData = async () => {
    if (!user?.id || !token) return;
    try {
      setLoading(true);
      const [pendingRes, completedRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/requests?doctorId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/reports?doctorId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingRequests(data);
      }
      
      if (completedRes.ok) {
        const data = await completedRes.json();
        setCompletedReports(data);
      }
    } catch (error) {
      console.error("Failed to fetch lab requests", error);
      toast.error("Failed to load lab requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabData();
  }, [user, token]);

  const viewReport = (report: any) => {
    const url = report?.reportUrl || (report?.id ? `/reports/${report.id.slice(0, 8).toUpperCase()}` : null);
    if (!url) {
      toast.error("Report URL not found");
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Lab Requests & Reports</h2>
        <p className="text-muted-foreground mt-1">
          Track the status of your patients' lab tests and view published results.
        </p>
      </div>

      <Tabs defaultValue="completed" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Published Reports
            <Badge variant="secondary" className="ml-2 bg-primary/10">{completedReports.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending Requests
            <Badge variant="secondary" className="ml-2 bg-primary/10">{pendingRequests.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="completed">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-4">Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Tests Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : completedReports.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No published reports found.</TableCell></TableRow>
                  ) : (
                    completedReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {new Date(report.requestedAt).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{report.Patient?.fullName}</div>
                          <div className="text-xs text-muted-foreground">{report.Patient?.mrn}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {report.items?.map((item: any) => (
                              <Badge key={item.id} variant="outline" className="text-xs">
                                {item.LabTest?.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            Published
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => viewReport(report)} className="gap-2">
                            <FileText className="w-4 h-4" /> View Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-4">Requested</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Tests</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : pendingRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No pending lab requests.</TableCell></TableRow>
                  ) : (
                    pendingRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(req.requestedAt).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{req.Patient?.fullName}</div>
                          <div className="text-xs text-muted-foreground">{req.Patient?.mrn}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {req.items?.map((item: any) => (
                              <Badge key={item.id} variant="outline" className="text-xs">
                                {item.LabTest?.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={req.priority === "URGENT" ? "destructive" : "secondary"}>
                            {req.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            {req.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
