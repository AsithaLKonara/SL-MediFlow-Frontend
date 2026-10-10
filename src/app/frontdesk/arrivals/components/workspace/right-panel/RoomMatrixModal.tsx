import { useAuth } from "@/components/providers/AuthProvider";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RoomMatrixModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorName: string;
  onAssign: (roomId: string, startTime: string, endTime: string) => void;
  selectedDate: Date;
  sessions?: any[];
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
  isActive?: boolean;
}

export function RoomMatrixModal({ open, onOpenChange, doctorName, onAssign, selectedDate, sessions = [], isAssigning }: RoomMatrixModalProps) {
  const { token } = useAuth();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  
  // Default to sensible times
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("13:00");
  const [selectedSession, setSelectedSession] = useState<string>("manual");

  const handleSessionChange = (val: string | null) => {
    if (!val) return;
    setSelectedSession(val);
    if (val !== "manual") {
      const session = sessions.find(s => s.id === val);
      if (session) {
        setStartTime(session.startTime);
        setEndTime(session.endTime);
      }
    }
  };

  useEffect(() => {
    if (open) fetchRooms();
  }, [open, selectedDate]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const formattedDate = new Date(selectedDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/rooms/matrix?date=${formattedDate}`, {
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
    const room = rooms.find(r => r.id === selectedRoom);
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
      <DialogContent className="sm:max-w-2xl bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Room Assignment Matrix</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Assign {doctorName} to a consultation room.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3 max-h-[400px] overflow-y-auto pr-2">
              {rooms.filter(r => r.isActive !== false).map(room => (
                <div 
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedRoom === room.id 
                      ? 'border-orange-500 bg-orange-500/10' 
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-semibold text-sm">{room.name}</div>
                  <div className="text-[10px] text-zinc-500 mt-1 space-y-1">
                    {room.bookings.length === 0 ? (
                      <span className="text-green-500">Available</span>
                    ) : (
                      room.bookings.map((b, i) => (
                        <div key={i} className="bg-zinc-800 p-1 rounded">
                          <span className={b.status === "LEFT" ? "text-zinc-400 line-through" : "text-orange-400"}>
                            {b.startTime}-{b.endTime}
                          </span>
                          <br/>
                          <span className="truncate block max-w-full" title={b.doctorName}>{b.doctorName}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Doctor Schedule Session</label>
                <Select value={selectedSession} onValueChange={handleSessionChange}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue placeholder="Select a session..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                    {sessions.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.startTime} - {s.endTime} {s.maxPatients ? `(Max: ${s.maxPatients})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Expected Start Time</label>
                  <Input 
                    type="time" 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 focus-visible:ring-orange-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Expected End Time</label>
                  <Input 
                    type="time" 
                    value={endTime} 
                    onChange={e => setEndTime(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 focus-visible:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleAssign} isLoading={isAssigning}>Assign Room</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
