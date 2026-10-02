import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DoctorStatus } from "../page";
import { UserRound } from "lucide-react";

export function DoctorSelector({ 
  doctors, 
  selectedId, 
  onSelect 
}: { 
  doctors: DoctorStatus[]; 
  selectedId: string | null; 
  onSelect: (id: string) => void;
}) {
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
              {selectedId ? doctors.find(d => d.id === selectedId)?.fullName : "Select a doctor"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {doctors.map(doc => (
              <SelectItem key={doc.id} value={doc.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{doc.fullName}</span>
                  {doc.specialty && <span className="text-xs text-muted-foreground ml-2">{doc.specialty}</span>}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
