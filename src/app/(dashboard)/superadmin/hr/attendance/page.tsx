"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CalendarCheck, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";

export default function AttendanceAndLeavesPage() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  
  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchData = async () => {
    if (!token) return;
    try {
      const [attRes, leaveRes] = await Promise.all([
        fetch(`${API}/hr/attendance`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/hr/leaves`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const attData = await attRes.json();
      const leaveData = await leaveRes.json();
      setAttendance(attData.data || []);
      setLeaves(leaveData.data || []);
    } catch (e) {
      toast.error("Failed to fetch HR data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const updateLeaveStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API}/hr/leaves/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Leave ${status.toLowerCase()}`);
        fetchData();
      } else {
        throw new Error("Failed to update");
      }
    } catch (e) {
      toast.error("Error updating leave request");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">Attendance & Leaves</h2>
        <p className="text-muted-foreground mt-1">Manage staff check-ins and approve or reject leave requests.</p>
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="attendance" className="flex gap-2"><Clock className="w-4 h-4" /> Daily Attendance</TabsTrigger>
          <TabsTrigger value="leaves" className="flex gap-2"><CalendarCheck className="w-4 h-4" /> Leave Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Log</CardTitle>
              <CardDescription>View when staff clocked in and out.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Staff Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{new Date(record.date).toLocaleDateString()}</TableCell>
                          <TableCell>{record.user?.fullName}</TableCell>
                          <TableCell>{record.user?.Role?.name}</TableCell>
                          <TableCell>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "-"}</TableCell>
                          <TableCell>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={record.status === 'PRESENT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {attendance.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No attendance records found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves">
          <Card>
            <CardHeader>
              <CardTitle>Leave Approvals</CardTitle>
              <CardDescription>Review and manage staff time-off requests.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Applied On</TableHead>
                        <TableHead>Staff Name</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.map((leave) => (
                        <TableRow key={leave.id}>
                          <TableCell className="text-xs text-muted-foreground">{new Date(leave.appliedAt).toLocaleString()}</TableCell>
                          <TableCell className="font-medium">{leave.user?.fullName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{leave.type}</Badge>
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate" title={leave.reason}>{leave.reason}</TableCell>
                          <TableCell>
                            <Badge variant={leave.status === 'PENDING' ? 'outline' : 'secondary'} className={
                              leave.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                              leave.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                              'bg-amber-100 text-amber-800'
                            }>
                              {leave.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {leave.status === 'PENDING' && (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => updateLeaveStatus(leave.id, 'APPROVED')}>
                                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => updateLeaveStatus(leave.id, 'REJECTED')}>
                                  <XCircle className="w-4 h-4 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {leaves.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No leave requests found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
