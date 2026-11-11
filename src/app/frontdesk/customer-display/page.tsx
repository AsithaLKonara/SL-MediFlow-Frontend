"use client";

import { useAuth } from "@/components/providers/AuthProvider";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize } from "lucide-react";

export default function CustomerDisplayPage() {
  const { token } = useAuth();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll logic (scroll one row at a time)
    const scrollInterval = setInterval(() => {
      const container = containerRef.current;
      if (container) {
        // Find a table row to get its height, fallback to 100px
        const rowHeight = container.querySelector('tr')?.clientHeight || 100;
        
        // Check if we're near the bottom
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (container.scrollTop >= maxScroll - 10) {
          // Smooth scroll to top
          container.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          // Scroll down by one row height
          container.scrollBy({ top: rowHeight, behavior: 'smooth' });
        }
      }
    }, 4000); // 4 seconds delay between scrolls
    
    return () => clearInterval(scrollInterval);
  }, [doctors]); // Re-bind if doctors change (so rows might change)

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDoctorsStatus = async (currentToken: string | null) => {
    try {
      const formattedDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/doctors/status?date=${formattedDate}&t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        const scheduledDoctors = data.filter((d: any) => (d.sessions && d.sessions.length > 0) || d.attendance);
        setDoctors(scheduledDoctors);
      }
    } catch (err) {
      console.error("Failed to fetch doctors status", err);
    }
  };

  useEffect(() => {
    if (!token) return; // Wait until auth token is available

    fetchDoctorsStatus(token);
    
    // Fallback polling every 10 seconds to ensure it stays in sync even if sockets fail
    const pollInterval = setInterval(() => {
      fetchDoctorsStatus(token);
    }, 10000);

    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000');
    
    socket.on("connect", () => console.log("Customer Display connected to websocket"));
    
    // Listen for events that should refresh the board
    socket.on("DOCTOR_ATTENDANCE_UPDATED", () => fetchDoctorsStatus(token));
    socket.on("TOKEN_STATUS_UPDATED", () => fetchDoctorsStatus(token));
    
    return () => {
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [token]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="w-full bg-white shadow-sm border-b border-slate-200 py-4 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="relative w-48 h-16">
            <Image 
              src="/logo.png" 
              alt="SL MediFlow" 
              fill 
              className="object-contain"
              priority 
            />
          </div>
          <div className="hidden md:block h-10 border-l border-slate-200 mx-2"></div>
          <div className="hidden md:flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Outpatient Department</h1>
            <p className="text-sm text-slate-500 font-medium">Live Consultation Status</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="text-3xl font-bold text-slate-800 font-mono tracking-tight">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">
            {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Main Content — fills remaining height, no page scroll */}
      <main className="flex-1 flex flex-col min-h-0 px-8 pb-8 md:px-12 md:pb-12">
        <div className="flex flex-col flex-1 min-h-0 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          {/* Scrollable body — auto-scroll target */}
          <div ref={containerRef} className="flex-1 overflow-y-auto scrollbar-hide">
            <Table>
              <TableHeader className="bg-slate-50/80 sticky top-0 z-10 shadow-sm">
                <TableRow className="border-b-2 border-slate-200 hover:bg-transparent">
                  <TableHead className="text-xl py-5 px-8 font-bold text-slate-700 w-[30%]">Doctor</TableHead>
                  <TableHead className="text-xl py-5 px-6 font-bold text-slate-700 w-[22%] text-center">Designation</TableHead>
                  <TableHead className="text-xl py-5 px-6 font-bold text-slate-700 w-[13%] text-center">Room</TableHead>
                  <TableHead className="text-xl py-5 px-6 font-bold text-slate-700 w-[20%] text-center">Status</TableHead>
                  <TableHead className="text-xl py-5 px-8 font-bold text-slate-700 w-[15%] text-center">Now Serving</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {doctors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-400 text-xl font-medium">
                    Waiting for schedule data...
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {doctors.map((doctor) => {
                    const status = doctor.attendance?.status;
                    const isArrived = status === 'ARRIVED' || status === 'IN_CONSULTATION';
                    const hasSessions = doctor.sessions && doctor.sessions.length > 0;
                    
                    const activeSession = doctor.currentSessionId 
                      ? doctor.sessions?.find((s: any) => s.id === doctor.currentSessionId) 
                      : doctor.sessions?.[0];
                    const displayRoomNumber = activeSession?.room?.roomNumber || activeSession?.roomNumber || doctor.roomNumber;
                    
                    // Status Badge Logic
                    let badgeColor = "bg-slate-100 text-slate-500 border-slate-200";
                    let statusText = "Not Arrived";
                    let ping = false;

                    if (isArrived) {
                      badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      statusText = "In Clinic";
                      ping = true;
                    } else if (status === 'LEFT') {
                      badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                      statusText = "Left Clinic";
                    } else if (status === 'SCHEDULED') {
                      badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                      statusText = "Scheduled";
                    } else if (!hasSessions) {
                      badgeColor = "bg-slate-50 text-slate-400 border-slate-100";
                      statusText = "No Schedule";
                    }

                    return (
                      <motion.tr 
                        key={doctor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group"
                      >
                        <TableCell className="py-5 px-8">
                          <div className="flex flex-col">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">
                              <span className="text-primary font-bold">{doctor.title ? doctor.title + " " : "Dr. "}</span>{doctor.fullName.replace(/^(Dr\.\s*)+/i, '')}
                            </span>
                          </div>
                        </TableCell>

                        {/* Designation / Title column */}
                        <TableCell className="py-5 px-6 text-center align-middle">
                          {doctor.specialty ? (
                            <span className="text-xl font-bold text-slate-700 tracking-tight">
                              {doctor.specialty}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xl font-bold">—</span>
                          )}
                        </TableCell>

                        {/* Room column */}
                        <TableCell className="py-5 px-6 text-center align-middle">
                          {displayRoomNumber ? (
                            <span className="text-2xl font-black text-slate-800 tracking-tight">
                              {/^room\s+/i.test(displayRoomNumber) ? displayRoomNumber : `Room ${displayRoomNumber}`}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xl font-bold">—</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="py-5 px-6 text-center align-middle">
                          <div className="inline-flex items-center justify-center">
                            <div className={`flex items-center gap-3 font-bold text-xl ${
                              isArrived ? "text-emerald-600" :
                              status === 'LEFT' ? "text-rose-600" :
                              status === 'SCHEDULED' ? "text-blue-600" : "text-slate-400"
                            }`}>
                              {ping && (
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                              )}
                              <span className="tracking-wide uppercase">{statusText}</span>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-5 px-8 text-center align-middle">
                          <div className="flex justify-center items-center">
                            {isArrived && doctor.currentlyServing ? (
                              <div className="text-primary font-black text-5xl tracking-tighter text-center">
                                {String(doctor.currentlyServing).padStart(2, '0')}
                              </div>
                            ) : (
                              <div className="text-2xl font-bold text-slate-300 text-center">
                                --
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      </main>

      <button 
        onClick={toggleFullScreen}
        className="fixed bottom-4 right-4 p-3 bg-slate-200/50 hover:bg-slate-300/50 text-slate-500 rounded-full transition-colors opacity-50 hover:opacity-100"
        title="Toggle Fullscreen"
      >
        <Maximize className="w-5 h-5" />
      </button>
    </div>
  );
}
