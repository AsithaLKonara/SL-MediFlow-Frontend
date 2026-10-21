"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, CheckCircle, ArrowRight, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

interface CancelAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    tokenNumber?: number | string;
    patientName?: string;
    doctorName?: string;
    bookingReference?: string;
    department?: string;
  } | null;
  onSuccess?: (result: { appointmentId: string; wasPaid: boolean; invoiceId?: string; paidAmount?: number }) => void;
}

const CANCELLATION_REASONS = [
  "Patient Request / Change of Mind",
  "Doctor Unavailable / Emergency",
  "Patient Did Not Arrive (No Show)",
  "Wrong Department / Duplicate Booking",
  "Incorrect Patient Details",
  "Other Reason"
];

export function CancelAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onSuccess
}: CancelAppointmentModalProps) {
  const { token } = useAuth();
  const router = useRouter();

  const [reason, setReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-cancellation state if refund is needed
  const [refundPromptData, setRefundPromptData] = useState<{
    invoiceId: string;
    paidAmount: number;
  } | null>(null);

  const handleClose = () => {
    setRefundPromptData(null);
    setNotes("");
    setReason(CANCELLATION_REASONS[0]);
    onClose();
  };

  const handleCancelAppointment = async () => {
    if (!appointment) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/appointments/${appointment.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          reason,
          notes: notes.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel appointment");
      }

      toast.success(`Token #${appointment.tokenNumber || ""} cancelled successfully.`);

      if (onSuccess) {
        onSuccess({
          appointmentId: appointment.id,
          wasPaid: data.wasPaid,
          invoiceId: data.invoiceId,
          paidAmount: data.paidAmount
        });
      }

      if (data.wasPaid && data.invoiceId) {
        // Payment was completed, prompt to process refund
        setRefundPromptData({
          invoiceId: data.invoiceId,
          paidAmount: data.paidAmount || 0
        });
      } else {
        handleClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Error cancelling appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToRefund = () => {
    if (refundPromptData) {
      const url = `/billing/refunds?invoiceId=${refundPromptData.invoiceId}&amount=${refundPromptData.paidAmount}&reason=${encodeURIComponent(`Appointment #${appointment?.tokenNumber || ''} cancelled: ${reason}`)}`;
      handleClose();
      router.push(url);
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        {refundPromptData ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 rounded-full bg-amber-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Payment Detected!</h3>
                <p className="text-xs text-muted-foreground">Appointment is cancelled, refund is recommended</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 text-sm space-y-2">
              <p className="text-amber-950 font-medium">
                This patient previously completed payment of <span className="font-bold text-base">LKR {Number(refundPromptData.paidAmount).toFixed(2)}</span>.
              </p>
              <p className="text-xs text-amber-800">
                Would you like to open the Refund Management screen now to process a refund voucher for this patient?
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button variant="outline" onClick={handleClose}>
                Later / Close
              </Button>
              <Button onClick={handleGoToRefund} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                Process Refund <ArrowRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                Cancel Appointment / Token
              </DialogTitle>
              <DialogDescription>
                This will release the doctor slot and remove the patient from the active consultation queue.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-lg border text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token Number:</span>
                  <span className="font-bold">#{appointment.tokenNumber || "N/A"}</span>
                </div>
                {appointment.patientName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient:</span>
                    <span className="font-medium">{appointment.patientName}</span>
                  </div>
                )}
                {appointment.doctorName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Doctor / Department:</span>
                    <span>{appointment.doctorName}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <Select value={reason} onValueChange={(val) => setReason(val || CANCELLATION_REASONS[0])}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select cancellation reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCELLATION_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Additional Notes (Optional)
                </label>
                <Textarea
                  placeholder="Enter any additional details or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Keep Appointment
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelAppointment}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
