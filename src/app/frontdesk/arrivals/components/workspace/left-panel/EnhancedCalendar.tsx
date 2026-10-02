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

    // Check schedules
    for (const schedule of calendarData.schedules) {
      const sessions = schedule.sessions?.filter((s: any) => s.dayOfWeek === dayOfWeek && s.isActive);
      if (sessions && sessions.length > 0) {
        hasClinic = true;
        totalTokens += sessions.reduce((acc: number, s: any) => acc + (s.tokenCapacity || 0), 0);
      }
    }

    // Exceptions would be evaluated here for real world...
    
    // Booked
    if (calendarData.bookedAppointments && hasClinic) {
      const isoDateStr = d.toISOString().split('T')[0];
      bookedTokens = calendarData.bookedAppointments.filter((a: any) => a.appointmentDate?.startsWith(isoDateStr)).length;
    }

    return hasClinic ? { totalTokens, bookedTokens } : null;
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
                ${isPast && !isSelected ? 'opacity-50' : ''}
              `}
            >
              <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-foreground'}`}>{date}</span>
              {info && (
                <div className="mt-auto flex flex-col items-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                  <span className={`text-[8px] leading-tight font-medium mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {info.totalTokens}/{info.bookedTokens}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
