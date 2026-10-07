import { useAuth } from "@/components/providers/AuthProvider";

import { Button } from "@/components/ui/button";
import { DoctorStatus } from "../../../page";
import { Clock, LogOut, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { WalkInForm } from "../forms/WalkInForm";
import { RoomMatrixModal } from "./RoomMatrixModal";
import { useState } from "react";

export function DoctorStatusControl({ 
  doctor,
  onRefresh
}: { 
  doctor: DoctorStatus;
  onRefresh: () => void;
}) {
  const isArrived = doctor.attendance?.status === "ARRIVED";

  const { token } = useAuth();
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isMarkingOut, setIsMarkingOut] = useState(false);

  const handleAssignRoom = async (roomNumber: string, startTime: string, endTime: string) => {
    try {
      setIsAssigning(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/doctors/${doctor.id}/attendance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: "ARRIVED", roomNumber, startTime, endTime })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`${doctor.fullName} assigned to ${roomNumber}`);
      setMatrixOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(`Failed to assign room: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleMarkOut = async (forceExit: boolean = false) => {
    try {
      setIsMarkingOut(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/doctors/${doctor.id}/attendance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: "LEFT", forceExit })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || await res.text();
        
        if (errorMsg.includes("still waiting") && !forceExit) {
          if (confirm(`${errorMsg}\n\nDo you want to force mark out and flag these patients as NO SHOW?`)) {
            return handleMarkOut(true);
          } else {
            return;
          }
        }
        throw new Error(errorMsg);
      }
      toast.success(`${doctor.fullName} marked as Left`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark out");
    } finally {
      setIsMarkingOut(false);
    }
  };

  return (
    <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="font-semibold text-lg flex items-center gap-2">
          Operations Control
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage clinic state, walk-ins, and schedule overrides.
        </p>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        {!isArrived ? (
          <Button onClick={() => setMatrixOpen(true)} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Assign Room
          </Button>
        ) : (
          <Button variant="destructive" onClick={() => handleMarkOut(false)} isLoading={isMarkingOut} className="w-full sm:w-auto gap-2">
            <LogOut className="w-4 h-4" />
            Mark Out
          </Button>
        )}

      </div>
      <RoomMatrixModal 
        open={matrixOpen} 
        onOpenChange={setMatrixOpen}
        doctorName={doctor.fullName}
        onAssign={handleAssignRoom}
        selectedDate={new Date()}
        isAssigning={isAssigning}
      />
    </div>
  );
}
