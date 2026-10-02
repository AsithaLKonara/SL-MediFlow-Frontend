import { DoctorStatus } from "../page";

export function TopSummaryBar({ doctor, tokens = [] }: { doctor: DoctorStatus; tokens?: any[] }) {
  // Compute basic stats based on doctor's schedule and appointments
  const isArrived = doctor.attendance?.status === "ARRIVED";
  const statusColor = isArrived ? "bg-green-500" : (doctor.attendance?.status === "SCHEDULED" ? "bg-yellow-500" : "bg-gray-400");
  const statusText = doctor.attendance?.status || "NOT ARRIVED";

  const totalTokens = doctor.sessions && doctor.sessions.length > 0 ? doctor.sessions[0].tokenLimit : 0;
  const booked = tokens.length;
  const waiting = tokens.filter(t => t.status === "WAITING").length;
  const completed = tokens.filter(t => t.status === "COMPLETED").length;

  return (
    <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className={`w-4 h-4 rounded-full ${statusColor} animate-pulse shadow-[0_0_10px_currentColor] opacity-80`} />
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {doctor.fullName}
            <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground font-medium uppercase tracking-wider">
              {statusText}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Today's Clinic: {doctor.sessions && doctor.sessions.length > 0 ? `${doctor.sessions[0].startTime} - ${doctor.sessions[0].endTime}` : "No clinic scheduled"}
          </p>
        </div>
      </div>

      <div className="flex gap-6 items-center w-full md:w-auto">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{totalTokens}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tokens</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{booked}</div>
          <div className="text-xs text-blue-600/80 uppercase tracking-wider font-semibold">Booked</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-500">{waiting}</div>
          <div className="text-xs text-amber-500/80 uppercase tracking-wider font-semibold">Waiting</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{completed}</div>
          <div className="text-xs text-green-600/80 uppercase tracking-wider font-semibold">Completed</div>
        </div>
      </div>
    </div>
  );
}
