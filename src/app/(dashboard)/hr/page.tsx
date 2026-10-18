"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Loader2,
  Banknote,
  Printer,
  Download,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { PayslipPrintTemplate } from "../superadmin/hr/payroll/components/PayslipPrintTemplate";
import { useReactToPrint } from "react-to-print";

export default function MyHRPortal() {
  const { token, user } = useAuth();
  const API = process.env.NEXT_PUBLIC_API_URL;

  // Active Tab state
  const [activeTab, setActiveTab] = useState("leaves");

  // --- LEAVE STATE ---
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [selectedLeaveForView, setSelectedLeaveForView] = useState<any | null>(null);
  const [leaveFormData, setLeaveFormData] = useState({
    type: "SICK",
    startDate: "",
    endDate: "",
    reason: ""
  });

  // --- PAYSLIP STATE ---
  const [loadingPayslips, setLoadingPayslips] = useState(false);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  // --- OVERTIME STATE ---
  const [loadingOt, setLoadingOt] = useState(false);
  const [submittingOt, setSubmittingOt] = useState(false);
  const [otRecords, setOtRecords] = useState<any[]>([]);
  const [otFormData, setOtFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    shiftType: "NORMAL",
    startTime: "17:00",
    endTime: "21:00",
    remarks: ""
  });

  // Print ref
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `AMAZ-Payslip-${user?.fullName || "Staff"}`
  });

  // Fetch Leaves
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

  // Fetch Payslips
  const fetchPayslips = useCallback(async () => {
    if (!token) return;
    setLoadingPayslips(true);
    try {
      const res = await fetch(`${API}/hr/my-payslips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPayslips(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch payslips", e);
    } finally {
      setLoadingPayslips(false);
    }
  }, [API, token]);

  // Fetch Overtime
  const fetchOvertime = useCallback(async () => {
    if (!token || !user) return;
    setLoadingOt(true);
    try {
      const res = await fetch(`${API}/hr/overtime?employeeId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setOtRecords(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch overtime", e);
    } finally {
      setLoadingOt(false);
    }
  }, [API, token, user]);

  useEffect(() => {
    if (token && user) {
      fetchLeaveHistory();
      fetchPayslips();
      fetchOvertime();
    }
  }, [token, user, fetchLeaveHistory, fetchPayslips, fetchOvertime]);

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

    if (new Date(leaveFormData.endDate) < new Date(leaveFormData.startDate)) {
      toast.error("End date cannot be earlier than start date");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/hr/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...leaveFormData, userId: user.id })
      });
      if (res.ok) {
        toast.success("Leave request submitted successfully");
        setLeaveFormData({ type: "SICK", startDate: "", endDate: "", reason: "" });
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

  const submitOt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;

    setSubmittingOt(true);
    try {
      // Build ISO timestamps
      const startDateTime = new Date(`${otFormData.date}T${otFormData.startTime}:00`).toISOString();
      const endDateTime = new Date(`${otFormData.date}T${otFormData.endTime}:00`).toISOString();

      const res = await fetch(`${API}/hr/overtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          employeeId: user.id,
          date: otFormData.date,
          shiftType: otFormData.shiftType,
          startTime: startDateTime,
          endTime: endDateTime,
          remarks: otFormData.remarks,
        })
      });

      if (res.ok) {
        toast.success("Overtime record submitted for approval");
        setOtFormData({
          date: new Date().toISOString().split("T")[0],
          shiftType: "NORMAL",
          startTime: "17:00",
          endTime: "21:00",
          remarks: ""
        });
        fetchOvertime();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit overtime record");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to submit overtime record");
    } finally {
      setSubmittingOt(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">My Staff Portal</h2>
          <p className="text-muted-foreground mt-1">
            Access your salary slips, log overtime shifts, and manage leave requests.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="leaves" className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" /> Leaves
          </TabsTrigger>
          <TabsTrigger value="payslips" className="flex items-center gap-2">
            <Banknote className="w-4 h-4" /> My Payslips
          </TabsTrigger>
          <TabsTrigger value="overtime" className="flex items-center gap-2">
            <Clock className="w-4 h-4" /> My Overtime
          </TabsTrigger>
        </TabsList>

        {/* --- LEAVES TAB --- */}
        <TabsContent value="leaves" className="mt-6">
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
                      <Select value={leaveFormData.type} onValueChange={(v) => setLeaveFormData({...leaveFormData, type: v || "SICK"})}>
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
                          value={leaveFormData.startDate} 
                          onChange={(e) => setLeaveFormData({...leaveFormData, startDate: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">End Date</label>
                        <Input 
                          type="date" 
                          required 
                          value={leaveFormData.endDate} 
                          onChange={(e) => setLeaveFormData({...leaveFormData, endDate: e.target.value})} 
                        />
                      </div>
                    </div>

                    {leaveFormData.startDate && leaveFormData.endDate && (
                      <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md flex items-center justify-between">
                        <span>Estimated Duration:</span>
                        <span className="font-semibold text-primary">
                          {calculateDays(leaveFormData.startDate, leaveFormData.endDate)} {calculateDays(leaveFormData.startDate, leaveFormData.endDate) === 1 ? "day" : "days"}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Reason for Leave</label>
                      <Textarea 
                        required 
                        placeholder="Provide details about why you need time off..." 
                        value={leaveFormData.reason} 
                        onChange={(e) => setLeaveFormData({...leaveFormData, reason: e.target.value})} 
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
        </TabsContent>

        {/* --- MY PAYSLIPS TAB --- */}
        <TabsContent value="payslips" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="w-5 h-5 text-primary" /> My Monthly Salary Slips
              </CardTitle>
              <CardDescription>View official finalized payslips and download or print statements.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPayslips ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : payslips.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No payslips have been generated for your account yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Once administration finalizes monthly payroll, your payslips will appear here.</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Payroll Period</TableHead>
                        <TableHead>Basic Salary</TableHead>
                        <TableHead>Overtime (OT)</TableHead>
                        <TableHead>Allowances & Bonuses</TableHead>
                        <TableHead>Deductions (EPF)</TableHead>
                        <TableHead className="font-bold">Net Salary (LKR)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payslips.map((ps) => {
                        const runPeriod = `${ps.payrollRun?.type || "Monthly"} (${new Date(ps.payrollRun?.periodStart).toLocaleDateString()} - ${new Date(ps.payrollRun?.periodEnd).toLocaleDateString()})`;
                        return (
                          <TableRow key={ps.id} className="hover:bg-muted/40">
                            <TableCell className="font-medium whitespace-nowrap">
                              <div>{runPeriod}</div>
                              <div className="text-xs text-muted-foreground">
                                Pay Date: {ps.payrollRun?.payDate ? new Date(ps.payrollRun.payDate).toLocaleDateString() : "Pending"}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              LKR {ps.basicSalary?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-emerald-600 font-medium">
                              + LKR {ps.totalOtPayment?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-emerald-600">
                              + LKR {((ps.totalAllowances || 0) + (ps.totalBonuses || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-red-600">
                              - LKR {ps.totalDeductions?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="font-mono text-sm font-bold text-foreground whitespace-nowrap">
                              LKR {ps.netSalary?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                ps.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                ps.status === 'APPROVED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                'bg-amber-100 text-amber-800 border-amber-300'
                              }>
                                {ps.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1"
                                onClick={() => setSelectedPayslip(ps)}
                              >
                                <Eye className="w-3.5 h-3.5" /> View Payslip
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- MY OVERTIME TAB --- */}
        <TabsContent value="overtime" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* SUBMIT OT FORM */}
            <div className="lg:col-span-5">
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5 text-primary" /> Request Overtime
                  </CardTitle>
                  <CardDescription>Submit extra duty hours for supervisor verification.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitOt} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">OT Date</label>
                      <Input 
                        type="date" 
                        required 
                        value={otFormData.date} 
                        onChange={(e) => setOtFormData({...otFormData, date: e.target.value})} 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Shift Type</label>
                      <Select value={otFormData.shiftType} onValueChange={(v) => setOtFormData({...otFormData, shiftType: v || "NORMAL"})}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NORMAL">Normal OT Shift</SelectItem>
                          <SelectItem value="NIGHT">Night Shift OT</SelectItem>
                          <SelectItem value="WEEKEND">Weekend Duty OT</SelectItem>
                          <SelectItem value="HOLIDAY">Public / Mercantile Holiday OT</SelectItem>
                          <SelectItem value="SPECIAL">Special Emergency Duty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Start Time</label>
                        <Input 
                          type="time" 
                          required 
                          value={otFormData.startTime} 
                          onChange={(e) => setOtFormData({...otFormData, startTime: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">End Time</label>
                        <Input 
                          type="time" 
                          required 
                          value={otFormData.endTime} 
                          onChange={(e) => setOtFormData({...otFormData, endTime: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duty Remarks / Tasks Performed</label>
                      <Textarea 
                        placeholder="e.g. Covered ICU night emergency shift or extended clinic hours..." 
                        value={otFormData.remarks} 
                        onChange={(e) => setOtFormData({...otFormData, remarks: e.target.value})} 
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={submittingOt} 
                      className="w-full bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2"
                    >
                      {submittingOt ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Submit Overtime Record
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* OT RECORDS TABLE */}
            <div className="lg:col-span-7">
              <Card className="shadow-sm">
                <CardHeader className="pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <History className="w-5 h-5 text-primary" /> Overtime History
                    </CardTitle>
                    <CardDescription>Track submitted OT records, hours, and approval statuses.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingOt ? (
                    <div className="flex justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : otRecords.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No overtime records found.
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>Date & Shift</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Rate (LKR)</TableHead>
                            <TableHead>Total Est.</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {otRecords.map((ot) => (
                            <TableRow key={ot.id} className="hover:bg-muted/40">
                              <TableCell>
                                <div className="text-xs font-semibold">{new Date(ot.date).toLocaleDateString()}</div>
                                <Badge variant="outline" className="text-[10px] mt-0.5 font-normal">
                                  {ot.shiftType}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {ot.hours} hrs
                              </TableCell>
                              <TableCell className="text-xs font-mono">
                                LKR {ot.rate?.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-xs font-mono font-semibold text-emerald-600">
                                LKR {ot.totalPayment?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  ot.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                  ot.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-300' :
                                  'bg-amber-100 text-amber-800 border-amber-300'
                                }>
                                  {ot.status}
                                </Badge>
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
          </div>
        </TabsContent>
      </Tabs>

      {/* --- PAYSLIP DETAILS & PRINT MODAL --- */}
      <Dialog open={!!selectedPayslip} onOpenChange={(open) => !open && setSelectedPayslip(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between pr-6">
              <span>Staff Salary Statement</span>
              {selectedPayslip && (
                <Badge variant="outline" className={
                  selectedPayslip.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                  selectedPayslip.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                  'bg-amber-100 text-amber-800'
                }>
                  {selectedPayslip.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Verified payroll breakdown for {user?.fullName} ({user?.role || "Staff"}).
            </DialogDescription>
          </DialogHeader>

          {selectedPayslip && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 bg-muted/40 p-3.5 rounded-lg border text-xs">
                <div>
                  <span className="text-muted-foreground block">Employee:</span>
                  <span className="font-semibold text-foreground text-sm">{user?.fullName}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block">Period:</span>
                  <span className="font-semibold text-foreground">
                    {new Date(selectedPayslip.payrollRun?.periodStart).toLocaleDateString()} - {new Date(selectedPayslip.payrollRun?.periodEnd).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Payment Method:</span>
                  <span className="font-medium text-foreground">{selectedPayslip.paymentMethod || "Bank Transfer"}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block">Payment Status:</span>
                  <span className="font-medium text-foreground">{selectedPayslip.status}</span>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount (LKR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPayslip.lineItems?.map((li: any) => (
                      <TableRow key={li.id}>
                        <TableCell className="text-xs font-semibold">{li.category}</TableCell>
                        <TableCell className="text-xs">{li.description}</TableCell>
                        <TableCell className={`text-xs font-mono font-medium text-right ${
                          li.category === 'DEDUCTION' || li.category === 'STATUTORY' ? 'text-red-600' : 'text-foreground'
                        }`}>
                          {li.category === 'DEDUCTION' || li.category === 'STATUTORY' ? '- ' : '+ '}
                          {li.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals Summary */}
              <div className="space-y-2 bg-muted/20 p-4 rounded-lg border text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Basic Salary:</span>
                  <span className="font-mono">LKR {selectedPayslip.basicSalary?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Approved Overtime (OT):</span>
                  <span className="font-mono">+ LKR {selectedPayslip.totalOtPayment?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Allowances & Bonuses:</span>
                  <span className="font-mono">+ LKR {((selectedPayslip.totalAllowances || 0) + (selectedPayslip.totalBonuses || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Total Deductions (EPF 8% / Other):</span>
                  <span className="font-mono">- LKR {selectedPayslip.totalDeductions?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-base text-foreground">
                  <span>Net Salary (Take Home):</span>
                  <span className="text-primary font-mono">LKR {selectedPayslip.netSalary?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
            <Button variant="outline" onClick={() => setSelectedPayslip(null)}>
              Close
            </Button>
            <Button onClick={() => handlePrint()} className="gap-2 bg-primary">
              <Printer className="w-4 h-4" /> Print Official Payslip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden printable template */}
      {selectedPayslip && (
        <PayslipPrintTemplate
          ref={printRef}
          records={[selectedPayslip]}
          runPeriod={`${new Date(selectedPayslip.payrollRun?.periodStart).toLocaleDateString()} - ${new Date(selectedPayslip.payrollRun?.periodEnd).toLocaleDateString()}`}
        />
      )}

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
