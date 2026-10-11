"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Clock,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  User,
  Calendar,
  FileText,
  ShieldAlert,
  Check,
  X,
  Building2,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";

export default function AttendanceAndLeavesPage() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  // Modals state
  const [selectedLeaveForView, setSelectedLeaveForView] = useState<any | null>(null);
  const [selectedLeaveForReject, setSelectedLeaveForReject] = useState<any | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

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

  const updateLeaveStatus = async (id: string, status: "APPROVED" | "REJECTED", rejectionReason?: string) => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`${API}/hr/leaves/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, rejectionReason })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Leave request ${status.toLowerCase()} successfully`);
        if (selectedLeaveForView && selectedLeaveForView.id === id) {
          setSelectedLeaveForView(data.data || { ...selectedLeaveForView, status, rejectionReason });
        }
        setSelectedLeaveForReject(null);
        setRejectReasonText("");
        fetchData();
      } else {
        throw new Error(data.error || "Failed to update leave status");
      }
    } catch (e: any) {
      toast.error(e.message || "Error updating leave request");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleOpenRejectModal = (leave: any) => {
    setSelectedLeaveForReject(leave);
    setRejectReasonText("");
  };

  const handleConfirmReject = () => {
    if (!selectedLeaveForReject) return;
    if (!rejectReasonText.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    updateLeaveStatus(selectedLeaveForReject.id, "REJECTED", rejectReasonText.trim());
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, isNaN(diff) ? 1 : diff);
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
                            <Badge variant="outline" className={record.status === 'PRESENT' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'}>
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
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Leave Approvals</CardTitle>
                <CardDescription>Review, inspect details, and approve or reject staff time-off requests.</CardDescription>
              </div>
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
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Period & Duration</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.map((leave) => {
                        const days = calculateDays(leave.startDate, leave.endDate);
                        return (
                          <TableRow key={leave.id} className="hover:bg-muted/40">
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(leave.appliedAt).toLocaleDateString()}
                              <span className="block text-[10px] text-muted-foreground/75">
                                {new Date(leave.appliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-foreground">{leave.user?.fullName || "Unknown Staff"}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <span>{leave.user?.Role?.name || "Employee"}</span>
                                {leave.user?.Department?.name && (
                                  <>
                                    <span>•</span>
                                    <span>{leave.user?.Department?.name}</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-medium bg-muted/60">
                                {leave.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-medium text-foreground whitespace-nowrap">
                                {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                              </div>
                              <div className="text-[11px] text-primary font-medium mt-0.5">
                                {days} {days === 1 ? "day" : "days"}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate text-muted-foreground" title={leave.reason}>
                              {leave.reason}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                leave.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300' : 
                                leave.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300' : 
                                'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                              }>
                                {leave.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => setSelectedLeaveForView(leave)}
                                  title="View full request details"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" /> View
                                </Button>

                                {leave.status === 'PENDING' && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-8 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200" 
                                      onClick={() => updateLeaveStatus(leave.id, 'APPROVED')}
                                      disabled={submittingAction}
                                    >
                                      <Check className="w-3.5 h-3.5 mr-1" /> Approve
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-8 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" 
                                      onClick={() => handleOpenRejectModal(leave)}
                                      disabled={submittingAction}
                                    >
                                      <X className="w-3.5 h-3.5 mr-1" /> Reject
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {leaves.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No leave requests found.
                          </TableCell>
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

      {/* VIEW LEAVE REQUEST FULL DETAILS POPUP */}
      <Dialog open={!!selectedLeaveForView} onOpenChange={(open) => !open && setSelectedLeaveForView(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-primary" />
                Leave Request Details
              </DialogTitle>
              {selectedLeaveForView && (
                <Badge variant="outline" className={
                  selectedLeaveForView.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-200' : 
                  selectedLeaveForView.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' : 
                  'bg-amber-100 text-amber-800 border-amber-200'
                }>
                  {selectedLeaveForView.status}
                </Badge>
              )}
            </div>
            <DialogDescription>
              Detailed view of time-off application and administrative approval history.
            </DialogDescription>
          </DialogHeader>

          {selectedLeaveForView && (
            <div className="space-y-4 py-2">
              {/* Employee Summary Card */}
              <div className="flex items-start justify-between rounded-lg border bg-muted/30 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-base">
                    {selectedLeaveForView.user?.fullName?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{selectedLeaveForView.user?.fullName || "Staff Member"}</h4>
                    <p className="text-xs text-muted-foreground">{selectedLeaveForView.user?.email || "No email"}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="font-medium text-foreground/80">{selectedLeaveForView.user?.Role?.name || "Employee"}</span>
                      {selectedLeaveForView.user?.Department?.name && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{selectedLeaveForView.user?.Department?.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <span className="block font-medium text-foreground/75">Applied On</span>
                  {new Date(selectedLeaveForView.appliedAt).toLocaleDateString()}
                  <span className="block text-[11px]">
                    {new Date(selectedLeaveForView.appliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Leave Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3 bg-card">
                  <span className="text-xs font-medium text-muted-foreground block">Leave Type</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="font-medium text-xs">
                      {selectedLeaveForView.type} LEAVE
                    </Badge>
                  </div>
                </div>

                <div className="rounded-md border p-3 bg-card">
                  <span className="text-xs font-medium text-muted-foreground block">Total Days</span>
                  <div className="text-sm font-semibold text-foreground mt-1">
                    {calculateDays(selectedLeaveForView.startDate, selectedLeaveForView.endDate)} {calculateDays(selectedLeaveForView.startDate, selectedLeaveForView.endDate) === 1 ? "day" : "days"}
                  </div>
                </div>

                <div className="col-span-2 rounded-md border p-3 bg-card">
                  <span className="text-xs font-medium text-muted-foreground block">Date Duration</span>
                  <div className="text-sm font-medium text-foreground mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{new Date(selectedLeaveForView.startDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span className="text-muted-foreground font-normal">to</span>
                    <span>{new Date(selectedLeaveForView.endDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Leave Reason Card */}
              <div className="rounded-md border p-3.5 bg-card">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Reason for Request
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedLeaveForView.reason || "No explanation provided."}
                </p>
              </div>

              {/* REJECTION REASON ALERT (If Rejected) */}
              {selectedLeaveForView.status === 'REJECTED' && (
                <div className="rounded-lg border border-red-200 bg-red-50/80 p-4 dark:border-red-900/60 dark:bg-red-950/40">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-red-900 dark:text-red-200 uppercase tracking-wider">
                          Rejection Reason by Administrator
                        </h4>
                        {selectedLeaveForView.reviewedAt && (
                          <span className="text-[11px] text-red-600/80 dark:text-red-400/80">
                            {new Date(selectedLeaveForView.reviewedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-red-800 dark:text-red-300 font-medium whitespace-pre-wrap">
                        {selectedLeaveForView.rejectionReason || "No specific reason provided."}
                      </p>
                      {selectedLeaveForView.reviewer?.fullName && (
                        <p className="text-xs text-red-700/80 dark:text-red-400/80 pt-1">
                          Reviewed by: <span className="font-semibold">{selectedLeaveForView.reviewer.fullName}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* APPROVAL DETAILS (If Approved) */}
              {selectedLeaveForView.status === 'APPROVED' && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                      Approved
                      {selectedLeaveForView.reviewer?.fullName && ` by ${selectedLeaveForView.reviewer.fullName}`}
                      {selectedLeaveForView.reviewedAt && ` on ${new Date(selectedLeaveForView.reviewedAt).toLocaleDateString()}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedLeaveForView?.status === 'PENDING' ? (
              <div className="flex w-full items-center justify-between">
                <Button 
                  variant="outline" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => {
                    const target = selectedLeaveForView;
                    setSelectedLeaveForView(null);
                    handleOpenRejectModal(target);
                  }}
                  disabled={submittingAction}
                >
                  <XCircle className="w-4 h-4 mr-1.5" /> Reject Request
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setSelectedLeaveForView(null)}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => updateLeaveStatus(selectedLeaveForView.id, 'APPROVED')}
                    disabled={submittingAction}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Request
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setSelectedLeaveForView(null)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT REASON ENTERING POPUP */}
      <Dialog open={!!selectedLeaveForReject} onOpenChange={(open) => !open && setSelectedLeaveForReject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" />
              Reject Leave Request
            </DialogTitle>
            <DialogDescription>
              Please enter an official reason for rejecting this leave request. This message will be displayed directly to the employee on their HR dashboard.
            </DialogDescription>
          </DialogHeader>

          {selectedLeaveForReject && (
            <div className="space-y-4 py-2">
              <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff Member:</span>
                  <span className="font-semibold text-foreground">{selectedLeaveForReject.user?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium text-foreground">
                    {new Date(selectedLeaveForReject.startDate).toLocaleDateString()} - {new Date(selectedLeaveForReject.endDate).toLocaleDateString()} ({calculateDays(selectedLeaveForReject.startDate, selectedLeaveForReject.endDate)} days)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leave Type:</span>
                  <span className="font-medium text-foreground">{selectedLeaveForReject.type}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejectionReason" className="text-sm font-medium flex items-center gap-1">
                  Reason for Rejection <span className="text-red-500">*</span>
                </Label>
                <Textarea 
                  id="rejectionReason"
                  placeholder="e.g., Critical staffing shortage scheduled for these dates, urgent department deadlines, or insufficient leave quota..." 
                  value={rejectReasonText} 
                  onChange={(e) => setRejectReasonText(e.target.value)}
                  rows={4}
                  className="resize-none focus-visible:ring-red-400"
                />
                <p className="text-[11px] text-muted-foreground">
                  The employee will see this exact message when viewing their rejected leave in their HR portal.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedLeaveForReject(null);
                setRejectReasonText("");
              }}
              disabled={submittingAction}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmReject}
              disabled={submittingAction || !rejectReasonText.trim()}
            >
              {submittingAction ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
