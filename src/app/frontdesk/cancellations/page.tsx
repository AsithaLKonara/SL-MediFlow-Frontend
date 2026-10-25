"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useShift } from "../hooks/useShift";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  RotateCcw,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Banknote,
  RefreshCw,
  AlertCircle,
  XCircle,
  Stethoscope,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { RefundVoucherReceipt, RefundVoucherData } from "../components/PrintTemplates/RefundVoucherReceipt";

interface BookingItem {
  id: string;
  tokenNumber: string;
  bookingReference: string | null;
  appointmentDate: string;
  status: string;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  patient: {
    id: string;
    fullName: string;
    phone: string;
    gender: string | null;
    age: number | null;
  } | null;
  doctor: {
    id: string;
    fullName: string;
    specialty: string | null;
    title: string | null;
  } | null;
  session: {
    id: string;
    sessionName: string;
    startTime: string;
    endTime: string;
  } | null;
  payment: {
    id: string;
    amount: number;
    method: string;
    status: string;
    refunds: Array<{ id: string; amount: number; reason: string; createdAt: string }>;
  } | null;
  invoice: {
    id: string;
    status: string;
    totalAmount: number;
  } | null;
  totalPaid: number;
  totalRefunded: number;
  refundableAmount: number;
  isRefunded: boolean;
}

const REASONS = [
  "Patient Request / Change of Mind",
  "Doctor Unavailable / Emergency",
  "Medical Exemption / Transferred",
  "Wrong Doctor / Rescheduled Session",
  "System / Duplicate Booking",
  "Other Reason"
];

export default function CancellationsAndRefundsPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { shift } = useShift();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Cancel & Refund Modal State
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [processRefund, setProcessRefund] = useState(true);
  const [refundAmount, setRefundAmount] = useState<string>("0");
  const [submitting, setSubmitting] = useState(false);

  // Voucher Printing
  const [activeVoucher, setActiveVoucher] = useState<RefundVoucherData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrintVoucher = useReactToPrint({
    contentRef: printRef,
    documentTitle: `AMAZ_Refund_Voucher_${activeVoucher?.tokenNumber || "Receipt"}`,
  });

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (selectedDate) params.set("date", selectedDate);
      if (selectedStatus && selectedStatus !== "ALL") params.set("status", selectedStatus);
      params.set("limit", "50");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/bookings/search?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setBookings(data.appointments || []);
      } else {
        toast.error(data.error || "Failed to load bookings");
      }
    } catch (err: any) {
      console.error("Fetch bookings error:", err);
      toast.error("Network error while loading bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBookings();
    }
  }, [token, selectedDate, selectedStatus]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) fetchBookings();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const openCancelModal = (booking: BookingItem) => {
    setSelectedBooking(booking);
    setReason(REASONS[0]);
    setNotes("");
    setProcessRefund(booking.refundableAmount > 0);
    setRefundAmount(String(booking.refundableAmount));
    setIsModalOpen(true);
  };

  const handleConfirmCancelRefund = async () => {
    if (!selectedBooking) return;

    if (processRefund && (!shift || !shift.isOpen)) {
      toast.error("You must have an OPEN cashier shift to issue cash/payment refunds.");
      return;
    }

    const numericRefund = parseFloat(refundAmount) || 0;
    if (processRefund && numericRefund <= 0 && selectedBooking.refundableAmount > 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/bookings/${selectedBooking.id}/cancel-refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason,
          notes,
          processRefund,
          refundAmount: numericRefund,
          shiftId: shift?.id
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Token #${selectedBooking.tokenNumber} successfully cancelled.`);
        setIsModalOpen(false);

        // Prepare Voucher Data for instant print
        const voucherData: RefundVoucherData = {
          voucherNumber: `RF-${Date.now().toString().slice(-6)}`,
          tokenNumber: selectedBooking.tokenNumber,
          bookingReference: selectedBooking.bookingReference || undefined,
          patientName: selectedBooking.patient?.fullName || "Walk-in Patient",
          patientPhone: selectedBooking.patient?.phone,
          doctorName: selectedBooking.doctor?.fullName || "Medical Officer",
          sessionTime: selectedBooking.session ? `${selectedBooking.session.startTime} - ${selectedBooking.session.endTime}` : undefined,
          appointmentDate: new Date(selectedBooking.appointmentDate).toISOString().split("T")[0],
          cancellationReason: data.reason || reason,
          originalAmount: selectedBooking.totalPaid,
          refundAmount: data.refundedAmount || 0,
          paymentMethod: selectedBooking.payment?.method,
          processedBy: user?.fullName || "Front Desk Cashier",
          shiftId: shift?.id || undefined,
          timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" })
        };

        setActiveVoucher(voucherData);
        // Trigger print after state update
        setTimeout(() => {
          handlePrintVoucher();
        }, 300);

        // Refresh list
        fetchBookings();
      } else {
        toast.error(data.error || "Failed to cancel and refund booking");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error executing cancellation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReprintVoucher = (booking: BookingItem) => {
    const voucherData: RefundVoucherData = {
      voucherNumber: `RF-${Date.now().toString().slice(-6)}`,
      tokenNumber: booking.tokenNumber,
      bookingReference: booking.bookingReference || undefined,
      patientName: booking.patient?.fullName || "Walk-in Patient",
      patientPhone: booking.patient?.phone,
      doctorName: booking.doctor?.fullName || "Medical Officer",
      sessionTime: booking.session ? `${booking.session.startTime} - ${booking.session.endTime}` : undefined,
      appointmentDate: new Date(booking.appointmentDate).toISOString().split("T")[0],
      cancellationReason: booking.cancellationReason || "Booking Cancelled",
      originalAmount: booking.totalPaid,
      refundAmount: booking.totalRefunded || booking.totalPaid,
      paymentMethod: booking.payment?.method,
      processedBy: user?.fullName || "Front Desk Cashier",
      shiftId: shift?.id || undefined,
      timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" })
    };

    setActiveVoucher(voucherData);
    setTimeout(() => {
      handlePrintVoucher();
    }, 200);
  };

  // Calculated Metrics
  const totalBookingsCount = bookings.length;
  const cancelledCount = bookings.filter(b => b.status === "CANCELLED").length;
  const totalRefundedSum = bookings.reduce((sum, b) => sum + (b.totalRefunded || 0), 0);

  return (
    <div className="flex-1 w-full min-h-screen overflow-y-auto bg-neutral-950 text-neutral-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Bar Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/frontdesk")}
            className="border-neutral-800 bg-neutral-900 hover:bg-neutral-800 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <RotateCcw className="w-6 h-6 text-rose-500" />
                Booking Cancellation & Refund Center
              </h1>
              <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10 text-xs">
                Frontdesk Portal
              </Badge>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Instant token cancellation, reason auditing, and financial drawer refund processing
            </p>
          </div>
        </div>

        {/* Shift Badge Indicator */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
            shift?.isOpen 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
          }`}>
            <span className={`w-2 h-2 rounded-full ${shift?.isOpen ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            {shift?.isOpen ? `Cashier Shift Active (${shift.cashierName})` : "Shift Closed (Refunds require open shift)"}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBookings}
            disabled={loading}
            className="border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-neutral-900/60 border-neutral-800">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-neutral-400">Total Tokens on Date</CardDescription>
            <CardTitle className="text-2xl font-bold text-white">{totalBookingsCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-neutral-500">
            For selected date: {selectedDate || "All Dates"}
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/60 border-neutral-800">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-rose-400">Cancelled Bookings</CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-400">{cancelledCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-neutral-500">
            {totalBookingsCount > 0 ? `${((cancelledCount / totalBookingsCount) * 100).toFixed(1)}% cancellation rate` : "No tokens recorded"}
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/60 border-neutral-800">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-amber-400">Total Money Refunded</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-400">
              Rs. {totalRefundedSum.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-neutral-500">
            Debited from drawer cashier settlements
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Patient Name, Phone, Token #, or Barcode..."
            className="pl-9 bg-neutral-950 border-neutral-800 text-sm focus-visible:ring-rose-500"
            autoFocus
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker & Quick Shortcuts */}
          <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm text-neutral-200 outline-none cursor-pointer"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            className={`text-xs border-neutral-800 ${
              selectedDate === new Date().toISOString().split("T")[0]
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-neutral-950 text-neutral-400"
            }`}
          >
            Today
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }}
            className={`text-xs border-neutral-800 ${
              selectedDate === new Date(Date.now() + 86400000).toISOString().split("T")[0]
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-neutral-950 text-neutral-400"
            }`}
          >
            Tomorrow
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate("")}
            className={`text-xs border-neutral-800 ${
              selectedDate === "" ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-neutral-950 text-neutral-400"
            }`}
          >
            All Dates
          </Button>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active (Scheduled / Waiting)</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <Card className="bg-neutral-900/60 border-neutral-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-900/90 border-b border-neutral-800">
            <TableRow className="border-neutral-800 hover:bg-transparent">
              <TableHead className="text-neutral-400 text-xs font-bold w-24">Token #</TableHead>
              <TableHead className="text-neutral-400 text-xs font-bold">Patient Details</TableHead>
              <TableHead className="text-neutral-400 text-xs font-bold">Doctor & Session</TableHead>
              <TableHead className="text-neutral-400 text-xs font-bold">Appointment Date</TableHead>
              <TableHead className="text-neutral-400 text-xs font-bold">Payment & Refund</TableHead>
              <TableHead className="text-neutral-400 text-xs font-bold">Status</TableHead>
              <TableHead className="text-neutral-400 text-xs font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-neutral-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
                    <span className="text-xs">Loading bookings & financial records...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-neutral-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <AlertCircle className="w-6 h-6 opacity-40 text-neutral-400" />
                    <p className="text-sm font-medium">No bookings found</p>
                    <p className="text-xs text-neutral-600">Try adjusting your search query, date, or filter options</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => {
                const isCancelled = b.status === "CANCELLED";
                const isCompleted = b.status === "COMPLETED";

                return (
                  <TableRow key={b.id} className="border-neutral-800 hover:bg-neutral-800/40 transition-colors">
                    <TableCell className="font-mono">
                      <div className="flex flex-col">
                        <span className="text-base font-black text-white">#{b.tokenNumber}</span>
                        {b.bookingReference && (
                          <span className="text-[10px] text-neutral-500 truncate max-w-[90px]">{b.bookingReference}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-neutral-100 text-sm">
                          {b.patient?.fullName || "Walk-in Patient"}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                          {b.patient?.phone && <span>{b.patient.phone}</span>}
                          {b.patient?.gender && <span>• {b.patient.gender}</span>}
                          {b.patient?.age && <span>• {b.patient.age} yrs</span>}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-neutral-200 text-sm flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-rose-400" />
                          {b.doctor?.fullName || "OPD Doctor"}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {b.session ? `${b.session.sessionName} (${b.session.startTime} - ${b.session.endTime})` : "General Session"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-neutral-300">
                        {new Date(b.appointmentDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {b.totalPaid > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[11px] py-0">
                              Paid: Rs. {b.totalPaid.toFixed(2)}
                            </Badge>
                            {b.payment?.method && (
                              <span className="text-[10px] text-neutral-500 uppercase">({b.payment.method})</span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="border-neutral-700 text-neutral-400 bg-neutral-800 text-[11px] py-0 w-fit">
                            Unpaid
                          </Badge>
                        )}

                        {b.totalRefunded > 0 && (
                          <span className="text-[11px] text-amber-400 font-medium">
                            Refunded: Rs. {b.totalRefunded.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {isCancelled ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10 text-xs w-fit">
                            CANCELLED
                          </Badge>
                          {b.cancellationReason && (
                            <span className="text-[10px] text-neutral-400 max-w-[130px] truncate" title={b.cancellationReason}>
                              {b.cancellationReason}
                            </span>
                          )}
                        </div>
                      ) : isCompleted ? (
                        <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs">
                          COMPLETED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">
                          {b.status}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {isCancelled ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReprintVoucher(b)}
                          className="border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs gap-1.5 text-neutral-300"
                        >
                          <Printer className="w-3.5 h-3.5 text-rose-400" />
                          Reprint Voucher
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openCancelModal(b)}
                          className="bg-rose-600/90 hover:bg-rose-600 text-xs gap-1.5 shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Cancel & Refund
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
      </div>

      {/* Cancel & Refund Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-neutral-900 border-neutral-800 text-neutral-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-500" />
              Cancel Token #{selectedBooking?.tokenNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Confirm booking cancellation and process financial drawer refund.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-2">
              {/* Summary Card */}
              <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Patient:</span>
                  <span className="font-semibold text-neutral-200">{selectedBooking.patient?.fullName || "Walk-in"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Doctor:</span>
                  <span className="font-semibold text-neutral-200">{selectedBooking.doctor?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Date & Session:</span>
                  <span className="text-neutral-300">
                    {new Date(selectedBooking.appointmentDate).toISOString().split("T")[0]} ({selectedBooking.session?.startTime || "N/A"})
                  </span>
                </div>
                <div className="flex justify-between border-t border-neutral-800 pt-1.5">
                  <span className="text-neutral-400">Total Paid:</span>
                  <span className="font-bold text-white">Rs. {selectedBooking.totalPaid.toFixed(2)}</span>
                </div>
                {selectedBooking.totalRefunded > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Already Refunded:</span>
                    <span>Rs. {selectedBooking.totalRefunded.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-rose-400 font-bold border-t border-dashed border-neutral-800 pt-1">
                  <span>Available to Refund:</span>
                  <span>Rs. {selectedBooking.refundableAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Cancellation Reason Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">Reason for Cancellation</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 outline-none focus:border-rose-500"
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">Auditor Notes (Optional)</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Patient called due to transport delay"
                  className="bg-neutral-950 border-neutral-800 text-xs"
                />
              </div>

              {/* Financial Refund Toggle & Amount */}
              {selectedBooking.totalPaid > 0 && (
                <div className="bg-rose-500/5 border border-rose-500/20 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-bold text-white">Process Financial Refund</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={processRefund}
                      onChange={(e) => setProcessRefund(e.target.checked)}
                      className="rounded border-neutral-700 text-rose-500 focus:ring-rose-500 cursor-pointer w-4 h-4"
                    />
                  </div>

                  {processRefund && (
                    <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between gap-3">
                      <span className="text-xs text-neutral-400">Refund Amount (LKR):</span>
                      <Input
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        max={selectedBooking.refundableAmount}
                        min="0"
                        step="10"
                        className="w-32 bg-neutral-950 border-rose-500/40 text-right text-sm font-bold text-rose-400"
                      />
                    </div>
                  )}

                  {!shift?.isOpen && processRefund && (
                    <p className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      Warning: No active drawer shift open. Please open a shift on the dashboard to settle refunds.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancelRefund}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-xs gap-1.5"
            >
              {submitting ? "Processing..." : "Confirm & Issue Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Container for Voucher Printing */}
      <div className="hidden">
        {activeVoucher && <RefundVoucherReceipt ref={printRef} data={activeVoucher} />}
      </div>
    </div>
  );
}
