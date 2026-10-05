import { useState, useEffect } from "react";
import { DoctorStatus } from "../../page";
import { DoctorStatusControl } from "./right-panel/DoctorStatusControl";
import { TopSummaryBar } from "../TopSummaryBar";
import { TokenBoardMatrix } from "./right-panel/TokenBoardMatrix";
import { EnhancedCalendar } from "./left-panel/EnhancedCalendar";
import { TodaysScheduleList } from "./right-panel/TodaysScheduleList";
import { io, Socket } from "socket.io-client";
import { Loader2 } from "lucide-react";

export function OperationalWorkspace({
  doctor,
  selectedDate,
  onDateSelect,
  onRefresh
}: {
  doctor: DoctorStatus;
  selectedDate: Date;
  onDateSelect: (d: Date) => void;
  onRefresh: () => void;
}) {
  const [tokens, setTokens] = useState<any[]>([]);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // We assume the first session is the active one for simplicity
  const activeSession = doctor.sessions && doctor.sessions.length > 0 ? doctor.sessions[0] : null;

  useEffect(() => {
    fetchContext();

    // Socket.io Integration
    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000');
    
    socket.on("connect", () => {
      console.log("Connected to websocket");
      fetchContext();
      onRefresh();
    });

    socket.on("TOKEN_STATUS_UPDATED", (data) => {
      // Refresh context when a token changes
      fetchContext();
    });

    socket.on("DOCTOR_ATTENDANCE_UPDATED", (data) => {
      onRefresh(); // Refresh doctor status at the parent level
      fetchContext();
    });

    return () => {
      socket.disconnect();
    };
  }, [doctor.id, selectedDate]);

  const fetchContext = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Fetch Calendar Aggregation
      const monthStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      const calRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/doctors/${doctor.id}/calendar?month=${monthStr}`, { headers });
      if (calRes.ok) setCalendarData(await calRes.json());

      // 2. Fetch Session Tokens
      if (activeSession) {
        const dateStr = selectedDate.toISOString();
        const tokRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/sessions/${activeSession.id}/tokens?date=${dateStr}`, { headers });
        if (tokRes.ok) setTokens(await tokRes.json());
      } else {
        setTokens([]);
      }

      // 3. Fetch Activity Log
      const dateStr = selectedDate.toISOString();
      const logRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/activity?date=${dateStr}`, { headers });
      if (logRes.ok) setActivityLog(await logRes.json());

    } catch (error) {
      console.error("Failed to fetch operational context:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* High-level status for selected doctor on this day */}
      <TopSummaryBar doctor={doctor} tokens={tokens} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Calendar (occupies 4 cols on large screens) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden p-4">
            <h3 className="font-semibold text-lg mb-4">Clinic Calendar</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Monthly overview of tokens & clinics for {doctor.fullName}.
            </p>
            <EnhancedCalendar selectedDate={selectedDate} onDateSelect={onDateSelect} calendarData={calendarData} />
          </div>
          
          <div className="bg-card border border-border rounded-xl shadow-sm p-4">
            <h3 className="font-semibold text-lg mb-4">Audit Log</h3>
            <div className="text-sm text-muted-foreground space-y-3 max-h-[300px] overflow-y-auto">
              {activityLog.length > 0 ? activityLog.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="text-xs shrink-0 pt-0.5">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{log.description}</span>
                </div>
              )) : (
                <div className="text-muted-foreground italic">No activity recorded today.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Daily Operations (occupies 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <DoctorStatusControl doctor={doctor} onRefresh={() => { fetchContext(); onRefresh(); }} />
          <TodaysScheduleList doctor={doctor} tokens={tokens} selectedDate={selectedDate} calendarData={calendarData} onScheduleUpdate={() => { fetchContext(); onRefresh(); }} />
          <TokenBoardMatrix doctor={doctor} sessionId={activeSession?.id} tokens={tokens} onTokenUpdate={fetchContext} />
        </div>
      </div>
    </div>
  );
}
