"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarCheck,
  CheckCircle2,
  Calendar,
  FileText,
  Clock,
  Eye,
  ShieldAlert,
  History,
  Send,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";

export default function MyHRPortal() {
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [selectedLeaveForView, setSelectedLeaveForView] = useState<any | null>(null);

  const { token, user } = useAuth();
  
  const [formData, setFormData] = useState({
    type: "SICK",
    startDate: "",
    endDate: "",
    reason: ""
  });

  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchLeaveHistory = useCallback(async () => {
    if (!token || !user) return;
    try {
      const res = await fetch(`${API}/hr/leaves?userId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setLeaveHistory(data.data || []);
    } catch (e) {
      console.error("Failed to fetch leave history", e);
    } finally {
      setLoadingHistory(false);
    }
  }, [API, token, user]);

  useEffect(() => {
    if (token && user) {
      fetchLeaveHistory();
    }
  }, [token, user, fetchLeaveHistory]);

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, isNaN(diff) ? 1 : diff);
  };

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error("End date cannot be earlier than start date");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/hr/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, userId: user.id })
      });
      if (res.ok) {
        toast.success("Leave request submitted successfully");
        setFormData({ type: "SICK", startDate: "", endDate: "", reason: "" });
        fetchLeaveHistory();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit leave");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to submit leave");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">My HR Portal</h2>
        <p className="text-muted-foreground mt-1">
          Apply for time off, monitor approval statuses, and review administrative feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* APPLY FOR LEAVE FORM (5 Columns) */}
        <div className="lg:col-span-5">
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarCheck className="w-5 h-5 text-primary" /> Apply for Leave
              </CardTitle>
              <CardDescription>Submit a new leave request for administrative review.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitLeave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Leave Type</label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v || "SICK"})}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SICK">Sick Leave</SelectItem>
                      <SelectItem value="CASUAL">Casual Leave</SelectItem>
                      <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                      <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input 
                      type="date" 
                      required 
                      value={formData.startDate} 
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input 
                      type="date" 
                      required 
                      value={formData.endDate} 
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})} 
                    />
                  </div>
                </div>

                {formData.startDate && formData.endDate && (
                  <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md flex items-center justify-between">
                    <span>Estimated Duration:</span>
                    <span className="font-semibold text-primary">
                      {calculateDays(formData.startDate, formData.endDate)} {calculateDays(formData.startDate, formData.endDate) === 1 ? "day" : "days"}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason for Leave</label>
                  <Textarea 
                    required 
                    placeholder="Provide details about why you need time off..." 
                    value={formData.reason} 
                    onChange={(e) => setFormData({...formData, reason: e.target.value})} 
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* LEAVE HISTORY TABLE (7 Columns) */}
        <div className="lg:col-span-7">
          <Card className="shadow-sm">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="w-5 h-5 text-primary" /> Leave History
                </CardTitle>
                <CardDescription>Your past requests and current review status.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Period & Days</TableHead>
                        <TableHead>Applied On</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveHistory.map((leave) => {
                        const days = calculateDays(leave.startDate, leave.endDate);
                        return (
                          <TableRow key={leave.id} className="hover:bg-muted/40">
                            <TableCell>
                              <Badge variant="outline" className="font-medium bg-muted/60 text-xs">
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
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(leave.appliedAt).toLocaleDateString()}
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
                              <Button 
                                size="sm" 
                                variant={leave.status === 'REJECTED' ? "destructive" : "ghost"}
                                className={`h-8 px-2.5 text-xs ${
                                  leave.status === 'REJECTED' 
                                    ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 dark:bg-red-950/50 dark:text-red-300" 
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                onClick={() => setSelectedLeaveForView(leave)}
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                {leave.status === 'REJECTED' ? "View Reason" : "View"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {leaveHistory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No leave applications submitted yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* VIEW LEAVE DETAILS MODAL */}
      <Dialog open={!!selectedLeaveForView} onOpenChange={(open) => !open && setSelectedLeaveForView(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-primary" />
                Leave Application Details
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
              Details and administrative review status of your leave request.
            </DialogDescription>
          </DialogHeader>

          {selectedLeaveForView && (
            <div className="space-y-4 py-2">
              {/* ADMIN REJECTION REASON ALERT BANNER */}
              {selectedLeaveForView.status === 'REJECTED' && (
                <div className="rounded-lg border border-red-200 bg-red-50/90 p-4 dark:border-red-900/60 dark:bg-red-950/50 shadow-xs">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-red-900 dark:text-red-200 uppercase tracking-wider">
                          Admin Rejection Reason
                        </h4>
                        {selectedLeaveForView.reviewedAt && (
                          <span className="text-[11px] text-red-600/80 dark:text-red-400/80">
                            {new Date(selectedLeaveForView.reviewedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300 whitespace-pre-wrap leading-relaxed">
                        {selectedLeaveForView.rejectionReason || "No explanation was provided by the administrator."}
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

              {/* APPROVED BANNER */}
              {selectedLeaveForView.status === 'APPROVED' && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                        Leave Approved
                      </p>
                      <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                        {selectedLeaveForView.reviewer?.fullName 
                          ? `Reviewed and approved by ${selectedLeaveForView.reviewer.fullName}` 
                          : "Approved by HR Administration"}
                        {selectedLeaveForView.reviewedAt && ` on ${new Date(selectedLeaveForView.reviewedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PENDING BANNER */}
              {selectedLeaveForView.status === 'PENDING' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/40">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                      Your request has been submitted and is awaiting administrative review.
                    </p>
                  </div>
                </div>
              )}

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

              {/* Submitted Reason */}
              <div className="rounded-md border p-3 bg-card">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Your Reason
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedLeaveForView.reason}
                </p>
              </div>

              <div className="text-xs text-muted-foreground pt-1 flex justify-between">
                <span>Applied On:</span>
                <span className="font-medium text-foreground">
                  {new Date(selectedLeaveForView.appliedAt).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLeaveForView(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
