"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { DoorOpen, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Room {
  id: string;
  roomNumber: string;
  department: string;
  status: string;
  description?: string;
  isActive: boolean;
}

interface RoomPickerDialogProps {
  open: boolean;
  onClose: () => void;
  date: string;        // "YYYY-MM-DD"
  startTime: string;   // "HH:MM"
  endTime: string;     // "HH:MM"
  onSelectRoom: (room: { id: string; roomNumber: string }) => void;
}

const DEPT_COLORS: Record<string, string> = {
  GENERAL: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  CONSULTATION: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  LAB: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  EXTRA_SERVICE: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  SURGERY: "bg-red-500/10 text-red-600 border-red-500/20",
};

const DEPT_LABELS: Record<string, string> = {
  GENERAL: "General Ward",
  CONSULTATION: "Consultation",
  LAB: "Laboratory",
  EXTRA_SERVICE: "Extra Services",
  SURGERY: "Operation Theater",
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isOverlapping(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) &&
         timeToMinutes(aEnd) > timeToMinutes(bStart);
}

export function RoomPickerDialog({ open, onClose, date, startTime, endTime, onSelectRoom }: RoomPickerDialogProps) {
  const { token } = useAuth();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [busyRoomsInfo, setBusyRoomsInfo] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    fetchRoomsAndAvailability();
  }, [open, date, startTime, endTime, token]);

  const fetchRoomsAndAvailability = async () => {
    setLoading(true);
    try {
      // Fetch all active rooms
      const res = await fetch(`${API}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      const data = await res.json();
      const activeRooms: Room[] = (data.data || data || []).filter((r: Room) => r.isActive);
      setRooms(activeRooms);

      // Check availability for each room
      if (date && startTime && endTime && activeRooms.length > 0) {
        setCheckingAvailability(true);
        const busyInfo: Record<string, any[]> = {};

        await Promise.all(
          activeRooms.map(async (room) => {
            try {
              const schedRes = await fetch(
                `${API}/rooms/${room.id}/schedules?startDate=${date}&endDate=${date}`,
                { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
              );
              if (!schedRes.ok) return;
              const schedData = await schedRes.json();
              const sessions: any[] = schedData.data || [];

              const overlaps = sessions.filter((s: any) =>
                isOverlapping(startTime, endTime, s.startTime, s.endTime)
              );

              if (overlaps.length > 0) {
                busyInfo[room.id] = overlaps;
              }
            } catch {}
          })
        );

        setBusyRoomsInfo(busyInfo);
        setCheckingAvailability(false);
      }
    } catch (e) {
      console.error("Failed to load rooms", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (room: Room) => {
    if (busyRoomsInfo[room.id]) return;
    onSelectRoom({ id: room.id, roomNumber: room.roomNumber });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[580px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-primary" />
            Select Room
          </DialogTitle>
          {date && startTime && endTime && (
            <p className="text-sm text-muted-foreground mt-1">
              Checking availability for <span className="font-semibold text-foreground">{date}</span>{" "}
              from <span className="font-semibold text-foreground">{startTime}</span> to{" "}
              <span className="font-semibold text-foreground">{endTime}</span>
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading rooms...</span>
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No active rooms found. Please add rooms in the Rooms section.
          </div>
        ) : (
          <>
            {checkingAvailability && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mb-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Checking real-time availability...
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Available</span>
              <span className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-red-500" /> Busy (Time Conflict)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {rooms.map((room) => {
                const overlaps = busyRoomsInfo[room.id];
                const isBusy = !!overlaps;
                return (
                  <button
                    key={room.id}
                    onClick={() => handleSelect(room)}
                    disabled={isBusy}
                    className={`relative p-4 rounded-xl border text-left transition-all duration-200 ${
                      isBusy
                        ? "border-red-500/20 bg-red-500/5 opacity-60 cursor-not-allowed"
                        : "border-border bg-card hover:border-primary hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 cursor-pointer"
                    }`}
                  >
                    {/* Status indicator */}
                    <div className="absolute top-3 right-3">
                      {isBusy ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>

                    <p className="text-2xl font-bold tracking-tight text-foreground mb-2">
                      {room.roomNumber}
                    </p>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium ${DEPT_COLORS[room.department] || ""}`}
                    >
                      {DEPT_LABELS[room.department] || room.department}
                    </Badge>

                    {isBusy && overlaps && (
                      <div className="mt-2 space-y-1">
                        {overlaps.map((overlap: any, idx: number) => (
                          <div key={idx} className="text-[10px] text-red-500 font-medium tracking-wide border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 rounded leading-tight">
                            Booked: {overlap.startTime} - {overlap.endTime} <br/>
                            <span className="opacity-80">{overlap.sessionName}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {room.description && !isBusy && (
                      <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-1">
                        {room.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
