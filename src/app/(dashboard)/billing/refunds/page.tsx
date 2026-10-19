"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { Search, RotateCcw, Plus, Printer, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { RefundReceipt } from "@/components/billing/RefundReceipt";

interface RefundItem {
  id: string;
  refundNumber?: string;
  invoiceId: string;
  amount: number;
  reason?: string;
  method?: string;
  refundMethod?: string;
  status?: string;
  createdAt: string;
  invoice?: {
    id: string;
    totalAmount: number;
    patient?: {
      fullName: string;
      phone?: string;
    };
  };
  processedBy?: {
    fullName?: string;
    name?: string;
  };
}

function RefundManagementContent() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();

  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create Refund Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [searchingInvoice, setSearchingInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  const [refundType, setRefundType] = useState<"FULL" | "PARTIAL">("FULL");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundMethod, setRefundMethod] = useState<string>("CASH");
  const [reason, setReason] = useState<string>("Appointment Cancelled");
  const [remarks, setRemarks] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Print voucher ref & state
  const [voucherToPrint, setVoucherToPrint] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Refund_Voucher_${voucherToPrint?.id?.substring(0, 8) || "Print"}`,
  });

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/refunds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRefunds(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      toast.error("Failed to load refunds");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [token]);

  // Handle URL query parameters for pre-filling refund (from Cancel Appointment)
  useEffect(() => {
    const qInvoiceId = searchParams?.get("invoiceId");
    const qAmount = searchParams?.get("amount");
    const qReason = searchParams?.get("reason");

    if (qInvoiceId) {
      setIsCreateOpen(true);
      setInvoiceSearchQuery(qInvoiceId);
      if (qAmount) setRefundAmount(qAmount);
      if (qReason) setReason(qReason);

      // Auto-lookup this invoice
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/invoices/${qInvoiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data && (data.id || data.data?.id)) {
            const inv = data.id ? data : data.data;
            setSelectedInvoice(inv);
            setRefundAmount(qAmount || String(inv.paidAmount || inv.totalAmount || 0));
          }
        })
        .catch(console.error);
    }
  }, [searchParams, token]);

  const handleSearchInvoice = async () => {
    if (!invoiceSearchQuery.trim()) return;
    setSearchingInvoice(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/invoices/${invoiceSearchQuery.trim()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const inv = data.id ? data : data.data;
        setSelectedInvoice(inv);
        const maxRefundable = inv.paidAmount !== undefined ? inv.paidAmount : inv.totalAmount;
        setRefundAmount(String(maxRefundable));
      } else {
        toast.error("Invoice not found");
        setSelectedInvoice(null);
      }
    } catch (err) {
      toast.error("Error looking up invoice");
    } finally {
      setSearchingInvoice(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!selectedInvoice) {
      toast.error("Please search and select an invoice");
      return;
    }

    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }

    const maxAmt = selectedInvoice.paidAmount !== undefined ? selectedInvoice.paidAmount : selectedInvoice.totalAmount;
    if (amt > maxAmt) {
      toast.error(`Refund amount cannot exceed total paid amount (LKR ${maxAmt})`);
      return;
    }

    setSubmitting(true);
    try {
      const fullReason = remarks ? `${reason}: ${remarks}` : reason;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/refunds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: amt,
          reason: fullReason,
          method: refundMethod
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to process refund");
      }

      toast.success("Refund processed successfully!");
      
      const newRefundData = {
        id: result.data?.id || result.id || "REF-" + Date.now(),
        amount: amt,
        reason: fullReason,
        refundMethod,
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber || selectedInvoice.id.substring(0, 8),
        patientName: selectedInvoice.patient?.fullName || selectedInvoice.Patient?.fullName,
        patientPhone: selectedInvoice.patient?.phone || selectedInvoice.Patient?.phone,
        processedBy: (user as any)?.fullName || user?.email || "Cashier",
        createdAt: new Date().toISOString()
      };

      setVoucherToPrint(newRefundData);
      setIsCreateOpen(false);
      setSelectedInvoice(null);
      setInvoiceSearchQuery("");
      setRemarks("");
      fetchRefunds();

      // Trigger thermal print after state update
      setTimeout(() => {
        handlePrint();
      }, 250);

    } catch (err: any) {
      toast.error(err.message || "Failed to process refund");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRefunds = refunds.filter((r) => {
    const q = searchTerm.toLowerCase();
    const idMatch = (r.id || "").toLowerCase().includes(q);
    const numMatch = (r.refundNumber || "").toLowerCase().includes(q);
    const invMatch = (r.invoiceId || "").toLowerCase().includes(q);
    const patientMatch = (r.invoice?.patient?.fullName || "").toLowerCase().includes(q);
    const reasonMatch = (r.reason || "").toLowerCase().includes(q);
    return idMatch || numMatch || invMatch || patientMatch || reasonMatch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-primary" />
            Refund Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Issue and audit patient refunds, print official thermal vouchers, and reconcile cancelled services.
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Issue New Refund
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by refund #, invoice, patient, or reason..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-base font-semibold">Processed Refunds</CardTitle>
          <CardDescription>
            Showing {filteredRefunds.length} recorded refund transactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading refund records...</div>
          ) : filteredRefunds.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No refund records found.</div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Voucher / Refund ID</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Invoice Ref</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount (LKR)</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRefunds.map((ref) => {
                  const methodDisplay = ref.refundMethod || ref.method || "CASH";
                  return (
                    <TableRow key={ref.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {ref.refundNumber || ref.id.substring(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(ref.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        #{ref.invoiceId.substring(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-medium text-xs">
                        {ref.invoice?.patient?.fullName || "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={ref.reason}>
                        {ref.reason || "General Refund"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {methodDisplay}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-red-600">
                        LKR {Number(ref.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setVoucherToPrint({
                              id: ref.id,
                              refundNumber: ref.refundNumber,
                              amount: ref.amount,
                              reason: ref.reason,
                              refundMethod: methodDisplay,
                              createdAt: ref.createdAt,
                              invoiceId: ref.invoiceId,
                              patientName: ref.invoice?.patient?.fullName,
                              patientPhone: ref.invoice?.patient?.phone,
                              processedBy: ref.processedBy?.fullName || ref.processedBy?.name || "Cashier"
                            });
                            setTimeout(() => {
                              handlePrint();
                            }, 150);
                          }}
                          className="gap-1.5 h-8 text-xs"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Issue Refund Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" />
              Process Patient Refund
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Invoice search */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Search Invoice ID or Visit ID
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Invoice ID (e.g. inv_...)"
                  value={invoiceSearchQuery}
                  onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchInvoice(); }}
                />
                <Button variant="outline" onClick={handleSearchInvoice} disabled={searchingInvoice}>
                  {searchingInvoice ? "Searching..." : "Lookup"}
                </Button>
              </div>
            </div>

            {/* Selected invoice summary */}
            {selectedInvoice && (
              <div className="p-3.5 rounded-lg border bg-muted/40 space-y-2 text-sm">
                <div className="flex justify-between items-center font-medium border-b pb-1.5">
                  <span>Invoice #{selectedInvoice.id.substring(0, 8).toUpperCase()}</span>
                  <Badge variant={selectedInvoice.status === "PAID" ? "default" : "outline"}>
                    {selectedInvoice.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Patient</span>
                    <span className="font-semibold">{selectedInvoice.patient?.fullName || selectedInvoice.Patient?.fullName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Original Total</span>
                    <span className="font-semibold">LKR {Number(selectedInvoice.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Refund Type & Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Refund Scope
                </label>
                <Select
                  value={refundType}
                  onValueChange={(val) => {
                    const type = (val || "FULL") as "FULL" | "PARTIAL";
                    setRefundType(type);
                    if (type === "FULL" && selectedInvoice) {
                      const maxAmt = selectedInvoice.paidAmount !== undefined ? selectedInvoice.paidAmount : selectedInvoice.totalAmount;
                      setRefundAmount(String(maxAmt));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL">Full Refund</SelectItem>
                    <SelectItem value="PARTIAL">Partial Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Refund Amount (LKR) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  disabled={refundType === "FULL"}
                  min="0"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Refund Payment Method
              </label>
              <Select value={refundMethod} onValueChange={(val) => setRefundMethod(val || "CASH")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preset Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Reason Preset
              </label>
              <Select value={reason} onValueChange={(val) => setReason(val || "Appointment Cancelled")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Appointment Cancelled">Appointment Cancelled</SelectItem>
                  <SelectItem value="Doctor Unavailable / Emergency">Doctor Unavailable / Emergency</SelectItem>
                  <SelectItem value="Test / Service Not Performed">Test / Service Not Performed</SelectItem>
                  <SelectItem value="Returned Pharmacy Item">Returned Pharmacy Item</SelectItem>
                  <SelectItem value="Billing Overcharge / Adjustment">Billing Overcharge / Adjustment</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Cashier Remarks / Notes
              </label>
              <Textarea
                placeholder="Specific justification or patient agreement notes..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleProcessRefund} disabled={submitting || !selectedInvoice}>
              {submitting ? "Processing..." : "Confirm & Print Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden printable refund voucher */}
      <div style={{ display: "none" }}>
        {voucherToPrint && <RefundReceipt ref={printRef} refund={voucherToPrint} />}
      </div>
    </div>
  );
}

export default function RefundsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading refund management...</div>}>
      <RefundManagementContent />
    </Suspense>
  );
}
