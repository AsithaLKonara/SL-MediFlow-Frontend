import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EnhancedCalendar({ 
  selectedDate, 
  onDateSelect,
  calendarData
}: { 
  selectedDate: Date;
  onDateSelect: (d: Date) => void;
  calendarData?: any;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDayInfo = (dateNum: number) => {
    if (!calendarData || !calendarData.schedules) return null;
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dateNum);
    const dayOfWeek = d.getDay();
    let totalTokens = 0;
    let bookedTokens = 0;
    let hasClinic = false;
    let isCancelled = false;
    let isOnLeave = false;

    // Check leaves
    if (calendarData.schedules) {
      for (const schedule of calendarData.schedules) {
        if (schedule.leaves) {
          for (const leave of schedule.leaves) {
            const lStart = new Date(leave.startDate).getTime();
            const lEnd = new Date(leave.endDate).getTime();
            if (d.getTime() >= lStart && d.getTime() <= lEnd) {
              isOnLeave = true;
            }
          }
        }
      }
    }

    if (isOnLeave) hasClinic = false;

    // Check schedules and aggregate capacity, factoring in exceptions
    const isoDateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    let activeSessionsCount = 0;
    let cancelledSessionsCount = 0;

    if (!isOnLeave) {
      for (const schedule of calendarData.schedules) {
        const sessions = schedule.sessions?.filter((s: any) => s.dayOfWeek === dayOfWeek && s.isActive);
        if (sessions && sessions.length > 0) {
          hasClinic = true;
          
          const exception = schedule.exceptions?.find((ex: any) => ex.exceptionDate.startsWith(isoDateStr) && ex.isUnavailable);
          
          if (exception) {
            cancelledSessionsCount += sessions.length;
          } else {
            activeSessionsCount += sessions.length;
            totalTokens += sessions.reduce((acc: number, s: any) => acc + (s.tokenCapacity || 0), 0);
          }
        }
      }
    }

    // A day is only entirely cancelled if it has clinics, but ALL of them are cancelled
    if (hasClinic && activeSessionsCount === 0 && cancelledSessionsCount > 0) {
      isCancelled = true;
    }

    // Booked
    if (calendarData.bookedAppointments && hasClinic && !isCancelled) {
      // Only count appointments for the active (non-cancelled) sessions if we were strictly perfect, 
      // but overall booked for the day is generally fine since cancelled sessions don't accept new ones.
      bookedTokens = calendarData.bookedAppointments.filter((a: any) => a.appointmentDate?.startsWith(isoDateStr)).length;
    }

    return { hasClinic, totalTokens, bookedTokens, isCancelled, isOnLeave };
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-foreground uppercase tracking-wider text-sm">
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h4>
        <div className="flex gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-[10px] px-2 font-bold uppercase"
            onClick={() => {
              setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
              onDateSelect(new Date());
            }}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" className="w-7 h-7" onClick={handlePrevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="w-7 h-7" onClick={handleNextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {days.map(d => (
          <div key={d} className="text-[10px] font-bold text-muted-foreground uppercase">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`}/>)}
        
        {dates.map(date => {
          const isSelected = selectedDate.getDate() === date && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
          const info = getDayInfo(date);
          const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), date);
          const isPast = d.getTime() < new Date().setHours(0,0,0,0);

          return (
            <button
              key={date}
              onClick={() => onDateSelect(d)}
              className={`
                h-12 w-full rounded-md border flex flex-col items-center p-1 transition-colors
                ${isSelected ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-card border-border hover:border-primary/50'}
                ${info?.isOnLeave ? 'bg-muted opacity-60 cursor-not-allowed' : ''}
                ${info?.isCancelled && !isSelected ? 'bg-red-50 border-red-200 opacity-80' : ''}
                ${isPast && !isSelected ? 'opacity-50' : ''}
              `}
            >
              <span className={`text-xs font-bold ${isSelected ? 'text-white' : (info?.isCancelled ? 'text-red-700 line-through' : 'text-foreground')}`}>{date}</span>
              {info?.hasClinic && !info.isCancelled && !info.isOnLeave && (
                <div className="mt-auto flex flex-col items-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                  <span className={`text-[8px] leading-tight font-medium mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {info.totalTokens}/{info.bookedTokens}
                  </span>
                </div>
              )}
              {info?.isCancelled && !info.isOnLeave && (
                <div className="mt-auto">
                  <span className="text-[8px] leading-tight font-bold text-red-600 uppercase">Cancel</span>
                </div>
              )}
              {info?.isOnLeave && (
                <div className="mt-auto">
                  <span className="text-[8px] leading-tight font-bold text-muted-foreground uppercase">Leave</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
