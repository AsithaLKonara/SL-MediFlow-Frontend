"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Stethoscope, Calculator, Printer, CheckCircle, CreditCard, Calendar, Filter } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { useReactToPrint } from "react-to-print";

export default function DoctorStatementsPage() {
  const { token } = useAuth();
  const [statements, setStatements] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Period filters
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedDoctorId, setSelectedDoctorId] = useState("ALL");
  const [commissionRate, setCommissionRate] = useState("15");

  // Payment Recording Modal
  const [payingStatement, setPayingStatement] = useState<any | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    paymentMethod: "BANK_TRANSFER",
    paymentReference: "",
  });
  const [markingPaid, setMarkingPaid] = useState(false);

  // Printing Statement
  const [printStatement, setPrintStatement] = useState<any | null>(null);
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Doctor_Payment_Statement",
    onAfterPrint: () => setPrintStatement(null),
  });

  const triggerPrint = (stmt: any) => {
    setPrintStatement(stmt);
    setTimeout(() => {
      handlePrint();
    }, 150);
  };

  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchStatements = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/finance/doctor-statements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setStatements(data.data || []);
    } catch (e) {
      toast.error("Failed to load doctor payment statements");
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const users = data.data || data.users || [];
        setDoctors(users.filter((u: any) => u.specialty || u.Role?.name?.toUpperCase() === "DOCTOR" || u.role?.toUpperCase() === "DOCTOR"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatements();
    fetchDoctors();
  }, [token]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const start = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1).toISOString();
      const end = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0, 23, 59, 59, 999).toISOString();

      const res = await fetch(`${API}/finance/doctor-statements/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          periodStart: start,
          periodEnd: end,
          doctorId: selectedDoctorId !== "ALL" ? selectedDoctorId : undefined,
          commissionRate: parseFloat(commissionRate) || 15,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Generated ${data.count} doctor payment statements`);
        fetchStatements();
      } else {
        toast.error(data.error || "Failed to generate statements");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string, extraData = {}) => {
    try {
      const res = await fetch(`${API}/finance/doctor-statements/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, ...extraData }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Statement status updated to ${status}`);
        fetchStatements();
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingStatement) return;
    setMarkingPaid(true);
    try {
      await handleUpdateStatus(payingStatement.id, "PAID", {
        paymentMethod: paymentDetails.paymentMethod,
        paymentReference: paymentDetails.paymentReference || `DOC-PAY-${Date.now()}`,
      });
      setPayingStatement(null);
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100 flex items-center gap-2">
            <Stethoscope className="w-8 h-8 text-primary" /> Doctor Payment Statements
          </h2>
          <p className="text-muted-foreground mt-1">
            Revenue-based settlement statements for visiting and specialist doctors (Consultation Revenue − Hospital Commission).
          </p>
        </div>
      </div>

      {/* Generator Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" /> Generate Periodic Statements
          </CardTitle>
          <CardDescription>
            Calculates revenue directly from completed consultations and paid invoice line items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Month</label>
              <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v || "1")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {new Date(0, m - 1).toLocaleString("default", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Year</label>
              <Select value={selectedYear} onValueChange={(v) => setSelectedYear(v || "2026")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Doctor</label>
              <Select value={selectedDoctorId} onValueChange={(v) => setSelectedDoctorId(v || "ALL")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Active Doctors</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.fullName || d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Button onClick={handleGenerate} disabled={generating} className="w-full bg-primary text-white gap-2">
                <Calculator className="w-4 h-4" />
                {generating ? "Calculating..." : "Generate Statements"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Doctor Settlement History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Consultations</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Commission ({commissionRate}%)</TableHead>
                  <TableHead className="text-right font-bold text-primary">Net Payable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{s.doctor?.fullName}</div>
                      <div className="text-xs text-muted-foreground">{s.doctor?.specialty || "Consultant"}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(s.periodStart).toLocaleDateString()} – {new Date(s.periodEnd).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">{s.totalConsultations}</TableCell>
                    <TableCell className="text-right">LKR {s.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right text-red-500">- LKR {s.hospitalCommission?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      LKR {s.netDoctorPayment?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          s.status === "PAID"
                            ? "bg-green-100 text-green-800"
                            : s.status === "APPROVED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => triggerPrint(s)} title="Print Statement">
                          <Printer className="w-4 h-4" />
                        </Button>
                        {s.status === "DRAFT" && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(s.id, "APPROVED")}>
                            Approve
                          </Button>
                        )}
                        {s.status === "APPROVED" && (
                          <Button size="sm" className="bg-green-600 text-white" onClick={() => setPayingStatement(s)}>
                            <CreditCard className="w-3.5 h-3.5 mr-1" /> Pay
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {statements.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No doctor payment statements generated yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Confirmation Dialog */}
      <Dialog open={!!payingStatement} onOpenChange={(open) => !open && setPayingStatement(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Settlement Payment</DialogTitle>
            <DialogDescription>
              Record disbursement of LKR {payingStatement?.netDoctorPayment?.toLocaleString()} to Dr. {payingStatement?.doctor?.fullName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmPayment} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Method</label>
              <Select
                value={paymentDetails.paymentMethod}
                onValueChange={(v) => setPaymentDetails({ ...paymentDetails, paymentMethod: v || "BANK_TRANSFER" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer (SLIPS/CEFT)</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Reference / Cheque No.</label>
              <Input
                placeholder="e.g. CEFT-98421004"
                value={paymentDetails.paymentReference}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, paymentReference: e.target.value })}
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setPayingStatement(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={markingPaid} className="bg-green-600 text-white">
                {markingPaid ? "Processing..." : "Confirm & Mark Paid"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hidden Printable Doctor Statement Template */}
      <div className="hidden">
        <div ref={printRef} className="p-10 bg-white text-black font-sans w-[210mm] min-h-[297mm] mx-auto box-border print:block">
          {printStatement && (
            <div>
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-red-600 pb-4 mb-6">
                <div>
                  <h1 className="text-3xl font-extrabold text-red-600 tracking-tight">AMAZ HOSPITAL</h1>
                  <p className="text-sm text-gray-600 mt-1">Debarawewa, Tissamaharama</p>
                  <p className="text-sm text-gray-600">Phone: 047-2233445 | Email: accounts@amazhospital.lk</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-gray-800">DOCTOR PAYMENT STATEMENT</h2>
                  <p className="text-xs text-gray-500 font-mono mt-1">Ref: {printStatement.id}</p>
                  <p className="text-sm text-gray-600">
                    Period: {new Date(printStatement.periodStart).toLocaleDateString()} to {new Date(printStatement.periodEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Doctor Details */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">Consultant Name</p>
                  <p className="text-lg font-bold text-gray-800">Dr. {printStatement.doctor?.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Specialty / Department</p>
                  <p className="font-semibold text-gray-700">{printStatement.doctor?.specialty || "General Medicine"}</p>
                </div>
              </div>

              {/* Calculation Summary Table */}
              <table className="w-full text-left border-collapse border border-gray-300 mb-8">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-sm font-bold border-b border-gray-300">Revenue Breakdown</th>
                    <th className="py-3 px-4 text-sm font-bold border-b border-gray-300 text-right">Details</th>
                    <th className="py-3 px-4 text-sm font-bold border-b border-gray-300 text-right">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 px-4 font-medium">Eligible Consultation Fees Collected</td>
                    <td className="py-3 px-4 text-right text-gray-600">{printStatement.totalConsultations} Consultations</td>
                    <td className="py-3 px-4 text-right font-semibold">{printStatement.totalRevenue?.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 px-4 text-red-600 font-medium">Less: Hospital Commission</td>
                    <td className="py-3 px-4 text-right text-red-500">{printStatement.commissionRate}%</td>
                    <td className="py-3 px-4 text-right text-red-600 font-semibold">- {printStatement.hospitalCommission?.toFixed(2)}</td>
                  </tr>
                  {printStatement.otherAdjustments !== 0 && (
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-4 text-gray-600">Other Deductions / Adjustments</td>
                      <td className="py-3 px-4 text-right">-</td>
                      <td className="py-3 px-4 text-right text-red-600">- {printStatement.otherAdjustments?.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Net Payment Total */}
              <div className="flex justify-end mb-16">
                <div className="w-72 bg-gray-50 p-4 rounded border-2 border-gray-400">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-gray-700">NET DOCTOR PAYMENT:</span>
                  </div>
                  <div className="text-2xl font-extrabold text-gray-900 text-right">
                    LKR {printStatement.netDoctorPayment?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Payment Details if Paid */}
              {printStatement.status === "PAID" && (
                <div className="mb-8 p-3 bg-green-50 border border-green-200 rounded text-xs">
                  <p className="font-semibold text-green-800">
                    Payment Disbursed on {new Date(printStatement.paidAt || Date.now()).toLocaleDateString()} via {printStatement.paymentMethod} (Ref: {printStatement.paymentReference})
                  </p>
                </div>
              )}

              {/* Signatures */}
              <div className="flex justify-between items-end mt-24 pt-8 border-t border-gray-300">
                <div className="text-center w-48">
                  <div className="border-b border-black mb-2 h-8"></div>
                  <p className="text-sm font-semibold">Doctor Signature</p>
                </div>
                <div className="text-center w-48">
                  <div className="border-b border-black mb-2 h-8"></div>
                  <p className="text-sm font-semibold">Hospital Accountant</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
