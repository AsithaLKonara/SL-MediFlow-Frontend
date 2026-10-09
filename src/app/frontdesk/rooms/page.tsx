"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { DoorOpen, ArrowLeft, CheckCircle2, AlertCircle, Wrench, Users } from "lucide-react";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function FrontdeskRoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchRooms = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/rooms/matrix?date=${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })}`, {
        headers: { Authorization: `Bearer ${token}` }
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
    fetchRooms();
    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000');
    
    socket.on("connect", () => fetchRooms());
    socket.on("ROOM_STATUS_UPDATED", () => fetchRooms());
    
    return () => {
      socket.disconnect();
    };
  }, [token]);

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

  return (
    <div className="flex-1 p-8 h-[calc(100vh-56px)] overflow-y-auto animate-in fade-in bg-muted/20">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/frontdesk">
                <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
              </Link>
              <h1 className="text-3xl font-bold text-foreground">Live Room Matrix</h1>
            </div>
            <p className="text-muted-foreground mt-1 ml-12">Real-time status of all hospital rooms</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rooms.filter(r => r.isActive).map(room => (
              <Card key={room.id} className={`border-2 shadow-sm transition-all duration-300 ${getStatusColor(room.status)}`}>
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-black">{room.name}</h2>
                      <span className="text-xs font-semibold tracking-wider uppercase opacity-80">{room.department}</span>
                    </div>
                    {getStatusIcon(room.status)}
                  </div>
                  
                  <div className="flex-1">
                    {room.bookings?.length > 0 ? (
                      <div className="space-y-3 mt-4">
                        <div className="flex items-center gap-2 text-sm font-semibold opacity-80 border-b border-current/20 pb-1">
                          <Users className="w-4 h-4" /> Today's Assignments
                        </div>
                        {room.bookings.map((b: any, i: number) => (
                          <div key={i} className={`p-2 rounded bg-background/50 backdrop-blur-sm border border-current/10 ${b.status === 'LEFT' ? 'opacity-50 grayscale' : ''}`}>
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-bold">{b.startTime} - {b.endTime}</span>
                              <span className="text-xs font-mono">{b.status}</span>
                            </div>
                            <div className="text-sm truncate font-medium">{b.doctorName}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center opacity-50 text-sm italic py-8">
                        No assignments today
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
