"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { DoorOpen, ArrowLeft, CheckCircle2, AlertCircle, Wrench, Users, Calendar, ChevronLeft, ChevronRight, Stethoscope } from "lucide-react";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FrontdeskRoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => 
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
  );
  const { token } = useAuth();

  const fetchRooms = async (dateToFetch = selectedDate) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/rooms/matrix?date=${dateToFetch}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        setRooms(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms(selectedDate);
  }, [token, selectedDate]);

  useEffect(() => {
    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000');
    
    socket.on("connect", () => fetchRooms(selectedDate));
    socket.on("ROOM_STATUS_UPDATED", () => fetchRooms(selectedDate));
    socket.on("DOCTOR_ATTENDANCE_UPDATED", () => fetchRooms(selectedDate));
    
    return () => {
      socket.disconnect();
    };
  }, [token, selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }));
  };

  const handleNextDay = () => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }));
  };

  const handleToday = () => {
    setSelectedDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }));
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'AVAILABLE': return "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
      case 'OCCUPIED': return "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
      case 'MAINTENANCE': return "border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      default: return "border-zinc-500 bg-zinc-500/10 text-zinc-700 dark:text-zinc-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'AVAILABLE': return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'OCCUPIED': return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'MAINTENANCE': return <Wrench className="w-6 h-6 text-yellow-500" />;
      default: return <DoorOpen className="w-6 h-6 text-zinc-500" />;
    }
  };

  const getBookingBadge = (status: string) => {
    switch(status) {
      case 'ARRIVED':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-300">Arrived</span>;
      case 'IN_CONSULTATION':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300">In Consult</span>;
      case 'LEFT':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-500/20 text-zinc-500">Left</span>;
      default:
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300">Scheduled</span>;
    }
  };

  const activeRooms = rooms.filter(r => r.isActive);
  const totalOccupied = activeRooms.filter(r => r.status === 'OCCUPIED').length;
  const totalAvailable = activeRooms.filter(r => r.status === 'AVAILABLE').length;
  const totalAssignments = activeRooms.reduce((acc, r) => acc + (r.bookings?.length || 0), 0);
  const isToday = selectedDate === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

  return (
    <div className="flex-1 p-8 h-[calc(100vh-56px)] overflow-y-auto animate-in fade-in bg-muted/20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header & Date Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/frontdesk">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Live Room Matrix</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Real-time room occupancy, schedules, and clinic allocations</p>
            </div>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-card border border-border p-1.5 rounded-xl shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevDay}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant={isToday ? "default" : "outline"} 
              size="sm" 
              className="h-8 text-xs font-semibold"
              onClick={handleToday}
            >
              Today
            </Button>
            <Input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
              className="h-8 w-36 text-xs bg-background"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextDay}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Stat Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-3.5 rounded-xl shadow-sm flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Rooms</span>
            <span className="text-lg font-bold">{activeRooms.length}</span>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 p-3.5 rounded-xl shadow-sm flex items-center justify-between">
            <span className="text-xs font-medium text-green-700 dark:text-green-300">Available</span>
            <span className="text-lg font-bold text-green-700 dark:text-green-300">{totalAvailable}</span>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl shadow-sm flex items-center justify-between">
            <span className="text-xs font-medium text-red-700 dark:text-red-400">Occupied</span>
            <span className="text-lg font-bold text-red-700 dark:text-red-400">{totalOccupied}</span>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-xl shadow-sm flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Assignments</span>
            <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{totalAssignments}</span>
          </div>
        </div>

        {/* Room Grid */}
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeRooms.map(room => (
              <Card key={room.id} className={`border-2 shadow-sm transition-all duration-300 flex flex-col ${getStatusColor(room.status)}`}>
                <CardContent className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-black">{room.name}</h2>
                      <span className="text-xs font-semibold tracking-wider uppercase opacity-80">{room.department}</span>
                    </div>
                    {getStatusIcon(room.status)}
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    {room.bookings?.length > 0 ? (
                      <div className="space-y-3 mt-2">
                        <div className="flex items-center gap-2 text-xs font-semibold opacity-80 border-b border-current/20 pb-1">
                          <Users className="w-3.5 h-3.5" /> Assignments ({room.bookings.length})
                        </div>
                        {room.bookings.map((b: any, i: number) => (
                          <div key={i} className={`p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-current/10 space-y-1 shadow-xs ${b.status === 'LEFT' ? 'opacity-50 grayscale' : ''}`}>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold">{b.startTime} — {b.endTime}</span>
                              {getBookingBadge(b.status)}
                            </div>
                            <div className="text-sm font-semibold truncate text-foreground">{b.doctorName}</div>
                            {b.sessionName && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Stethoscope className="w-3 h-3 shrink-0" />
                                <span className="truncate">{b.sessionName}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center opacity-50 text-sm italic py-12">
                        No assignments on this date
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
