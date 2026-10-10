import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

const API = process.env.NEXT_PUBLIC_API_URL;

const formatDate = (date: Date) => date.toISOString().split("T")[0];
const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

interface RoomScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: any | null; // room object { id, name, roomNumber }
  token: string;
}

export function RoomScheduleModal({ isOpen, onClose, room, token }: RoomScheduleModalProps) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState(formatDate(addDays(new Date(), 7)));
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && room) {
      fetchSchedules();
    }
  }, [isOpen, room]);

  const fetchSchedules = async () => {
    if (!room) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/admin/rooms/${room.id}/schedules?startDate=${startDate}&endDate=${endDate}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load schedules");
      setSchedules(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSchedules();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Schedules for {room?.roomNumber}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex gap-4 items-end bg-muted/30 p-4 rounded-lg">
          <div className="space-y-1">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Search
          </Button>
        </form>

        {error && <div className="text-red-500 text-sm">{error}</div>}

        <div className="border rounded-md mt-4 overflow-hidden max-h-[50vh] overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted sticky top-0">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Assigned Doctor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground animate-pulse">Loading schedules...</TableCell>
                </TableRow>
              ) : schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No schedules found for this date range.</TableCell>
                </TableRow>
              ) : (
                schedules.map((s, i) => (
                  <TableRow key={s.id || i}>
                    <TableCell className="font-medium">{new Date(s.date).toLocaleDateString()}</TableCell>
                    <TableCell>{s.startTime} - {s.endTime}</TableCell>
                    <TableCell>{s.sessionName}</TableCell>
                    <TableCell>{s.doctorName}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
