import { useAuth } from "@/components/providers/AuthProvider";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, DoorOpen } from "lucide-react";
import { toast } from "sonner";
import { RoomPickerDialog } from "./RoomPickerDialog";

export function EditSessionForm({ 
  sessionId, 
  initialData,
  onUpdateSuccess 
}: { 
  sessionId: string; 
  initialData: { sessionName: string, startTime: string, endTime: string, roomNumber?: string, roomId?: string };
  onUpdateSuccess?: () => void;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<{ id: string; roomNumber: string } | null>(
    initialData.roomId ? { id: initialData.roomId, roomNumber: initialData.roomNumber || "" } : null
  );


  const handleUpdate = async () => {
    try {
      setIsSubmitting(true);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionName: formData.sessionName,
          startTime: formData.startTime,
          endTime: formData.endTime,
          roomId: selectedRoom?.id || undefined
        })
      });

      if (!res.ok) throw new Error("Failed to update session");

      toast.success("Session Updated", { description: `Session ${formData.sessionName} has been successfully updated.` });
      setOpen(false);
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      toast.error("Error", { description: "Could not update session." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-foreground" />}>
        <Edit2 className="w-3 h-3 mr-1" /> Edit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
          <DialogDescription>
            Update the default timings and location for this session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium block">Session Name</label>
            <Input 
              value={formData.sessionName}
              onChange={e => setFormData(p => ({...p, sessionName: e.target.value}))}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium block">Start Time</label>
              <Input 
                type="time"
                value={formData.startTime}
                onChange={e => setFormData(p => ({...p, startTime: e.target.value}))}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium block">End Time</label>
              <Input 
                type="time"
                value={formData.endTime}
                onChange={e => setFormData(p => ({...p, endTime: e.target.value}))}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium block">Assigned Room</label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2 font-normal"
              onClick={() => setRoomPickerOpen(true)}
              disabled={isSubmitting}
            >
              <DoorOpen className="w-4 h-4 text-primary" />
              {selectedRoom ? (
                <span className="font-semibold text-foreground">{selectedRoom.roomNumber}</span>
              ) : (
                <span className="text-muted-foreground">Select a Room...</span>
              )}
            </Button>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={isSubmitting}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>

      <RoomPickerDialog 
        open={roomPickerOpen} 
        onClose={() => setRoomPickerOpen(false)} 
        onSelectRoom={setSelectedRoom}
        date={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })}
        startTime={formData.startTime}
        endTime={formData.endTime}
      />
    </Dialog>
  );
}
