import { useAuth } from "@/components/providers/AuthProvider";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RoomMatrixModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorName: string;
  onAssign: (roomNumber: string, startTime: string, endTime: string) => void;
  selectedDate: Date;
  isAssigning?: boolean;
}

interface Room {
  id: string;
  name: string;
  bookings: {
    doctorId: string;
    doctorName: string;
    startTime: string;
    endTime: string;
    status: string;
  }[];
}

export function RoomMatrixModal({ open, onOpenChange, doctorName, onAssign, selectedDate, isAssigning }: RoomMatrixModalProps) {
  const { token } = useAuth();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  
  // Default to sensible times
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("13:00");

  useEffect(() => {
    if (open) fetchRooms();
  }, [open, selectedDate]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/rooms/matrix?date=${selectedDate.toISOString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch rooms");
      const data = await res.json();
      setRooms(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load room matrix");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = () => {
    if (!selectedRoom) return toast.error("Please select a room");
    if (!startTime || !endTime) return toast.error("Please select start and end times");
    if (startTime >= endTime) return toast.error("End time must be after start time");

    // Optional: client side validation if room is already booked for this time
    // But since this is a quick clinic tool, we can allow overrides or simple checks
    const room = rooms.find(r => r.name === selectedRoom);
    if (room) {
      const conflict = room.bookings.find(b => {
        // Simple string time comparison works for HH:mm
        return (startTime >= b.startTime && startTime < b.endTime) ||
               (endTime > b.startTime && endTime <= b.endTime) ||
               (startTime <= b.startTime && endTime >= b.endTime);
      });
      if (conflict && conflict.status !== "LEFT") {
        if (!confirm(`Warning: ${conflict.doctorName} is already assigned to ${selectedRoom} from ${conflict.startTime} to ${conflict.endTime}. Do you want to proceed anyway?`)) {
          return;
        }
      }
    }

    onAssign(selectedRoom, startTime, endTime);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-zinc-950 border-zinc-800 text-white p-6 md:p-10">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-3xl font-bold tracking-tight">Room Assignment Matrix</DialogTitle>
          <DialogDescription className="text-lg text-zinc-400 mt-2">
            Assign {doctorName} to a consultation room.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {rooms.map(room => (
                <div 
                  key={room.id}
                  onClick={() => setSelectedRoom(room.name)}
                  className={`p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedRoom === room.name 
                      ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.15)] scale-[1.02]' 
                      : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-600 hover:bg-zinc-800'
                  }`}
                >
                  <div className="font-bold text-xl md:text-2xl text-zinc-100 mb-3">{room.name}</div>
                  <div className="text-sm text-zinc-400 space-y-2 font-medium">
                    {room.bookings.length === 0 ? (
                      <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1.5 rounded-lg w-fit">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Available
                      </div>
                    ) : (
                      room.bookings.map((b, i) => (
                        <div key={i} className="bg-zinc-950/50 border border-zinc-800/80 p-2.5 rounded-lg space-y-1">
                          <span className={`block font-semibold ${b.status === "LEFT" ? "text-zinc-500 line-through" : "text-orange-400"}`}>
                            {b.startTime} - {b.endTime}
                          </span>
                          <span className={`truncate block max-w-full text-sm ${b.status === "LEFT" ? "text-zinc-600" : "text-zinc-300"}`} title={b.doctorName}>
                            {b.doctorName}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6 mt-8 p-6 md:p-8 bg-zinc-900/60 rounded-2xl border-2 border-zinc-800/50">
              <div className="space-y-3">
                <label className="text-base font-semibold text-zinc-300 uppercase tracking-wider">Expected Start Time</label>
                <Input 
                  type="time" 
                  value={startTime} 
                  onChange={e => setStartTime(e.target.value)}
                  className="h-14 text-xl font-medium bg-zinc-950 border-2 border-zinc-800 focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-all rounded-xl"
                />
              </div>
              <div className="space-y-3">
                <label className="text-base font-semibold text-zinc-300 uppercase tracking-wider">Expected End Time</label>
                <Input 
                  type="time" 
                  value={endTime} 
                  onChange={e => setEndTime(e.target.value)}
                  className="h-14 text-xl font-medium bg-zinc-950 border-2 border-zinc-800 focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-all rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6 md:mt-8 gap-3">
          <Button variant="ghost" className="h-12 px-6 text-base font-medium rounded-xl hover:bg-zinc-800 hover:text-white transition-colors" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="h-12 px-8 text-base font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20 transition-all active:scale-95" onClick={handleAssign} isLoading={isAssigning}>Assign Room</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
