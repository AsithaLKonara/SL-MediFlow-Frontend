import { useAuth } from "@/components/providers/AuthProvider";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CalendarPlus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DoctorStatus } from "../../../page";

export function ScheduleConflictForm({ doctor, onComplete }: { doctor: DoctorStatus; onComplete?: () => void }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0],
    startTime: "09:00",
    endTime: "12:00",
    room: "Room 02",
    type: "General Consultation",
    tokenLimit: 20,
    interval: 10,
    days: [] as string[]
  });

  const toggleDay = (day: string) => {
    setFormData(p => ({
      ...p,
      days: p.days.includes(day) ? p.days.filter(d => d !== day) : [...p.days, day]
    }));
  };

  const checkConflicts = async () => {
    // Relying on the 409 response from the creation API below
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/doctors/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          doctorId: doctor.id,
          ...formData,
          isRecurring
        })
      });

      if (res.status === 409) {
        const errorData = await res.json();
        setConflictWarning(errorData.error);
        setIsLoading(false);
        return;
      }

      if (!res.ok) throw new Error("Failed");

      toast.success("Schedule created successfully");
      setOpen(false);
      setConflictWarning(null);
      if (onComplete) onComplete();
    } catch (err) {
      toast.error("Failed to create schedule");
    } finally {
      setIsLoading(false);
    }
  };

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10" />}>
        <CalendarPlus className="w-4 h-4 mr-2" />
        + Add Schedule
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Doctor Schedule</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {conflictWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md flex items-start gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p><strong>Warning:</strong> {conflictWarning}</p>
            </div>
          )}

          <div className="flex gap-4 p-2 bg-muted/30 rounded-lg">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!isRecurring} onChange={() => setIsRecurring(false)} className="accent-primary" />
              One-time
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={isRecurring} onChange={() => setIsRecurring(true)} className="accent-primary" />
              Recurring
            </Label>
          </div>

          {!isRecurring ? (
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" required value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
            </div>
          ) : (
            <div className="space-y-3 p-3 border border-border rounded-lg bg-card">
              <Label>Days of Week</Label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1 text-sm rounded-full border transition-all ${
                      formData.days.includes(day) ? 'bg-primary text-white border-primary' : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div><Label>From</Label><Input type="date" /></div>
                <div><Label>Until</Label><Input type="date" /></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Start Time</Label><Input type="time" required value={formData.startTime} onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))}/></div>
            <div className="space-y-2"><Label>End Time</Label><Input type="time" required value={formData.endTime} onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))}/></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Room</Label>
              <Select value={formData.room} onValueChange={v => setFormData(p => ({ ...p, room: v as string }))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="Room 01">Room 01</SelectItem><SelectItem value="Room 02">Room 02</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Input value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Token Limit</Label><Input type="number" required value={formData.tokenLimit} onChange={e => setFormData(p => ({ ...p, tokenLimit: Number(e.target.value) }))}/></div>
            <div className="space-y-2"><Label>Interval (min)</Label><Input type="number" required value={formData.interval} onChange={e => setFormData(p => ({ ...p, interval: Number(e.target.value) }))}/></div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {conflictWarning ? "Ignore & Save Anyway" : "Create Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
