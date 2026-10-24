import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DoctorStatus } from "../page";
import { UserRound } from "lucide-react";
import { sortDoctorsWithOpdFirst, isOpdDoctor } from "@/lib/doctor-utils";

export function DoctorSelector({ 
  doctors, 
  selectedId, 
  onSelect 
}: { 
  doctors: DoctorStatus[]; 
  selectedId: string | null; 
  onSelect: (id: string) => void;
}) {
  const sortedDoctors = sortDoctorsWithOpdFirst(doctors);

  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <UserRound className="w-5 h-5 text-primary" />
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
          Selected Doctor
        </label>
        <Select value={selectedId || ""} onValueChange={(val) => val && onSelect(val)}>
          <SelectTrigger className="w-[280px] h-10 border-border bg-background shadow-sm text-base font-semibold">
            <SelectValue placeholder="Select a doctor">
              {selectedId ? sortedDoctors.find(d => d.id === selectedId)?.fullName : "Select a doctor"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sortedDoctors.map(doc => {
              const isOpd = isOpdDoctor(doc);
              return (
                <SelectItem key={doc.id} value={doc.id}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="font-medium">{doc.fullName}</span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {isOpd && (
                        <span className="bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          OPD
                        </span>
                      )}
                      {doc.specialty && <span className="text-xs text-muted-foreground">{doc.specialty}</span>}
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
