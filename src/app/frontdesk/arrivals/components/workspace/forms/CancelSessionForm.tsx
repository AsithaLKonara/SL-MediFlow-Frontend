import { useAuth } from "@/components/providers/AuthProvider";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Ban } from "lucide-react";
import { toast } from "sonner";

export function CancelSessionForm({ 
  sessionId, 
  date,
  sessionName,
  onCancelSuccess 
}: { 
  sessionId: string; 
  date: Date;
  sessionName: string;
  onCancelSuccess?: () => void;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error("Reason Required", { description: "Please provide a reason for cancelling this session." });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/sessions/${sessionId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          date: new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0],
          reason
        })
      });

      if (!res.ok) throw new Error("Failed to cancel session");

      toast.success("Session Cancelled", { description: "The session has been cancelled and appointments have been notified." });
      setOpen(false);
      setReason("");
      if (onCancelSuccess) onCancelSuccess();
    } catch (err) {
      toast.error("Error", { description: "Could not cancel session." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" className="h-8 text-xs text-red-500 hover:bg-red-50 hover:text-red-600" />}>
        <Ban className="w-3 h-3 mr-1" /> Cancel
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Session</DialogTitle>
          <DialogDescription>
            You are about to cancel <strong>{sessionName}</strong> on {date.toLocaleDateString()}. All pending appointments for this session will be marked as cancelled.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <label className="text-sm font-medium block mb-2">Cancellation Reason</label>
          <Textarea 
            placeholder="e.g. Doctor is in emergency surgery..." 
            value={reason} 
            onChange={e => setReason(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Keep Session</Button>
          <Button variant="destructive" onClick={handleCancel} disabled={isSubmitting}>Confirm Cancellation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
