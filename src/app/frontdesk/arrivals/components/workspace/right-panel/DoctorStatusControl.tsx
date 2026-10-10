import { useAuth } from "@/components/providers/AuthProvider";

import { Button } from "@/components/ui/button";
import { DoctorStatus } from "../../../page";
import { Clock, LogOut, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { WalkInForm } from "../forms/WalkInForm";
import { useState } from "react";

export function DoctorStatusControl({ 
  doctor,
  selectedDate,
  onRefresh
}: { 
  doctor: DoctorStatus;
  selectedDate: Date;
  onRefresh: () => void;
}) {
  const isArrived = doctor.attendance?.status === "ARRIVED" || doctor.attendance?.status === "IN_CONSULTATION";

  const { token } = useAuth();
  const [isMarkingArrived, setIsMarkingArrived] = useState(false);
  const [isMarkingOut, setIsMarkingOut] = useState(false);

  const hasRoom = !!doctor.roomNumber;



  const handleMarkArrived = async () => {
    try {
      setIsMarkingArrived(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/doctors/${doctor.id}/attendance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: "ARRIVED",
          date: new Date(selectedDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
        })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`${doctor.fullName} marked as Arrived`);
      onRefresh();
    } catch (err: any) {
      toast.error(`Failed to mark arrived: ${err.message}`);
    } finally {
      setIsMarkingArrived(false);
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
        body: JSON.stringify({ 
          status: "LEFT", 
          forceExit,
          date: new Date(selectedDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
        })
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
        {!isArrived && (
          <Button onClick={handleMarkArrived} isLoading={isMarkingArrived} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Mark Arrived
          </Button>
        )}

        {isArrived && (
          <Button variant="destructive" onClick={() => handleMarkOut(false)} isLoading={isMarkingOut} className="w-full sm:w-auto gap-2">
            <LogOut className="w-4 h-4" />
            Mark Out
          </Button>
        )}
      </div>
    </div>
  );
}
