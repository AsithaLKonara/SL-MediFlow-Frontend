import { Button } from "@/components/ui/button";
import { DoctorStatus } from "../../../page";
import { Clock, Users, Edit2, Ban } from "lucide-react";
import { ScheduleConflictForm } from "../forms/ScheduleConflictForm";
import { EditSessionForm } from "../forms/EditSessionForm";
import { ManageTokensForm } from "../forms/ManageTokensForm";
import { CancelSessionForm } from "../forms/CancelSessionForm";

export function TodaysScheduleList({ 
  doctor, 
  tokens = [],
  selectedDate,
  calendarData,
  onScheduleUpdate
}: { 
  doctor: DoctorStatus; 
  tokens?: any[];
  selectedDate?: Date;
  calendarData?: any;
  onScheduleUpdate?: () => void;
}) {
  const booked = tokens.length;
  const waiting = tokens.filter(t => ['WAITING', 'ARRIVED', 'CHECKED_IN'].includes(t.status)).length;
  const completed = tokens.filter(t => t.status === "COMPLETED").length;

  const targetDate = selectedDate || new Date();
  const dayOfWeek = targetDate.getDay();
  // Get local YYYY-MM-DD
  const isoDateStr = new Date(targetDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

  let activeSessions: any[] = [];

  if (calendarData && calendarData.schedules) {
    calendarData.schedules.forEach((sch: any) => {
      // Check if this schedule is actually valid for the selected date
      const targetDateObj = selectedDate || new Date();
      const targetTime = new Date(targetDateObj).getTime();
      const validFromTime = new Date(sch.validFrom).getTime();
      const validUntilTime = sch.validUntil ? new Date(sch.validUntil).getTime() : Infinity;
      
      if (targetTime < validFromTime || targetTime > validUntilTime) return;

      // Filter out exceptions for this date
      const exception = sch.exceptions?.find((e: any) => e.exceptionDate.startsWith(isoDateStr));
      
      const sess = sch.sessions?.filter((s: any) => s.dayOfWeek === dayOfWeek && s.isActive).map((s: any) => {
        // Filter appointments for this specific session and date
        const sessionApts = calendarData.bookedAppointments?.filter((a: any) => a.sessionId === s.id && a.appointmentDate.startsWith(isoDateStr)) || [];
        const sessionBooked = sessionApts.length;
        const sessionWaiting = sessionApts.filter((a: any) => ['WAITING', 'ARRIVED', 'CHECKED_IN'].includes(a.status)).length;
        const sessionCompleted = sessionApts.filter((a: any) => a.status === 'COMPLETED').length;
        
        return {
          ...s,
          booked: sessionBooked,
          waiting: sessionWaiting,
          completed: sessionCompleted,
          isCancelled: exception?.isUnavailable || false,
          cancelReason: exception?.reason
        };
      });
      
      if (sess) activeSessions.push(...sess);
    });
  } else if (doctor.sessions && doctor.sessions.length > 0) {
    activeSessions = doctor.sessions.map(s => ({
      ...s,
      booked,
      waiting,
      completed,
      isCancelled: false
    }));
  } else {
    activeSessions = [
      {
        id: "session-1",
        sessionName: "General Consultation",
        startTime: "09:00",
        endTime: "12:00",
        tokenLimit: 20,
        roomNumber: "Room 02",
        booked,
        waiting,
        completed,
        isCancelled: false
      }
    ];
  }

  const isToday = new Date().toDateString() === targetDate.toDateString();
  const title = isToday ? "Today's Schedule" : `Schedule for ${targetDate.toLocaleDateString()}`;

  return (
    <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <ScheduleConflictForm doctor={doctor} onComplete={onScheduleUpdate} selectedDate={selectedDate} />
      </div>
      
      <div className="space-y-4">
        {activeSessions.length === 0 && (
          <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
            No sessions scheduled for this date.
          </div>
        )}
        {activeSessions.map((session, idx) => (
          <div key={session.id || idx} className={`flex flex-col sm:flex-row justify-between p-4 border border-border rounded-lg gap-4 ${session.isCancelled ? 'bg-red-50/50 opacity-70' : 'bg-muted/20'}`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className={`font-bold text-base ${session.isCancelled ? 'line-through text-red-700' : ''}`}>
                  {session.startTime} — {session.endTime}
                </span>
                {session.isCancelled && <span className="text-[10px] uppercase font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">Cancelled</span>}
              </div>
              <div className="text-sm font-medium text-foreground">{session.sessionName}</div>
              <div className="text-sm text-muted-foreground">{session.room?.roomNumber || session.roomNumber || doctor.roomNumber || "No Room Assigned"}</div>
              {session.isCancelled && session.cancelReason && (
                <div className="text-xs text-red-600 mt-2 font-medium">Reason: {session.cancelReason}</div>
              )}
            </div>

            <div className="flex flex-col sm:items-end justify-between">
              <div className="flex items-center gap-4 text-xs font-semibold mb-3 mt-1 sm:mt-0">
                <div className="text-center"><span className="text-foreground text-sm block">{session.tokenLimit >= 9999 ? '∞' : session.tokenLimit}</span> Tokens</div>
                <div className="text-center"><span className="text-blue-600 text-sm block">{session.booked}</span> Booked</div>
                <div className="text-center"><span className="text-amber-500 text-sm block">{session.waiting}</span> Waiting</div>
              </div>
              
              {!session.isCancelled && (
                <div className="flex gap-2">
                  <EditSessionForm 
                    sessionId={session.id!} 
                    initialData={{
                      sessionName: session.sessionName,
                      startTime: session.startTime,
                      endTime: session.endTime,
                      roomNumber: session.roomNumber,
                      roomId: session.roomId || session.room?.id
                    }}
                    onUpdateSuccess={onScheduleUpdate}
                  />
                  
                  <ManageTokensForm 
                    sessionId={session.id!} 
                    currentLimit={session.tokenLimit}
                    sessionName={session.sessionName}
                    onUpdateSuccess={onScheduleUpdate}
                  />
                  
                  <CancelSessionForm 
                    sessionId={session.id!} 
                    date={targetDate} 
                    sessionName={session.sessionName}
                    onCancelSuccess={onScheduleUpdate}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
