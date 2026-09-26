"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Loader2, UserRound, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DoctorStatus {
  id: string;
  fullName: string;
  specialty?: string;
  roomNumber?: string;
  isArrived?: boolean;
  isLeft?: boolean;
  outTime?: string;
  expectedStartTime?: string;
  expectedEndTime?: string;
}

export default function DoctorArrivalsPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<DoctorStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/doctors`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch doctors");
      // booking.service returns { success: true, data: [...] } or just [...]
      const data = json.data || json;
      setDoctors(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  
  const markOut = async (doctor: DoctorStatus) => {
    setProcessingId(doctor.id + "-out");
    setError(null);
    try {
      const el = document.getElementById(`outTime-${doctor.id}`) as HTMLInputElement;
      const outTime = el?.value || "";
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/doctors/${doctor.id}/out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outTime })
      });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Failed to mark out");
      }

      toast.success(`${doctor.fullName} marked as Left`);

      // Update local state to hide or mark as left
      setDoctors(docs => docs.map(d => 
        d.id === doctor.id ? { ...d, isArrived: false, isLeft: true } : d
      ));
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  
  
  const handleInputChange = (id: string, field: string, value: string) => {
    setDoctors(docs => docs.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const autoUpdateShift = async (doctor: DoctorStatus, field: 'start' | 'end', value: string) => {
    try {
      const payload = field === 'start' ? { startTime: value } : { endTime: value };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/doctors/${doctor.id}/shift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error("Failed to auto-save shift time");
      }
      

    } catch (err: any) {
      console.error(err);
      toast.error("Could not auto-save time");
    }
  };

  const markArrived = async (doctor: DoctorStatus) => {
    setProcessingId(doctor.id);
    setError(null);
    try {
      const el = document.getElementById(`room-${doctor.id}`) as HTMLInputElement;
      const startEl = document.getElementById(`start-${doctor.id}`) as HTMLInputElement;
      const endEl = document.getElementById(`end-${doctor.id}`) as HTMLInputElement;
      
      const newRoom = el?.value || doctor.roomNumber || "";
      const startTime = startEl?.value || doctor.expectedStartTime || "";
      const endTime = endEl?.value || doctor.expectedEndTime || "";
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/doctors/${doctor.id}/arrive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomNumber: newRoom, startTime, endTime })
      });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Failed to mark arrived");
      }

      toast.success(`${doctor.fullName} marked as Arrived in Room ${newRoom}`);

      // Update local state
      setDoctors(docs => docs.map(d => 
        d.id === doctor.id ? { ...d, isArrived: true, roomNumber: newRoom, expectedStartTime: startTime, expectedEndTime: endTime } : d
      ));
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex-1 p-8 h-[calc(100vh-56px)] overflow-y-auto animate-in fade-in bg-muted/10">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => router.push('/frontdesk')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Doctor Arrivals</h1>
            <p className="text-muted-foreground">Manage daily doctor attendance and trigger patient notifications.</p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        
        {/* Occupied Rooms Indicator */}
        {!isLoading && doctors.some(d => d.isArrived && !d.isLeft && d.roomNumber) && (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-6 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Currently Occupied Rooms
            </h2>
            <div className="flex flex-wrap gap-3">
              {doctors.filter(d => d.isArrived && !d.isLeft && d.roomNumber).map(doc => (
                <div key={doc.id} className="bg-muted/50 border border-border rounded-lg px-4 py-2 flex flex-col items-center min-w-[100px]">
                  <span className="text-xl font-bold text-foreground">{doc.roomNumber}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={doc.fullName}>
                    {doc.fullName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading schedule...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground text-center">
              <UserRound className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground">No doctors scheduled</p>
              <p>There are no doctors scheduled for today's sessions.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {doctors.map((doctor) => {
                const isArrived = !!doctor.isArrived;
                const isProcessing = processingId === doctor.id || processingId === doctor.id + "-out";

                return (
                  <div key={doctor.id} className={`flex items-center justify-between p-6 transition-colors ${isArrived ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${isArrived ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <UserRound className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{doctor.fullName}</h3>
                        <p className="text-sm text-muted-foreground mb-1">{doctor.specialty || "General Consultation"}</p>
                        <div className="flex items-center gap-2 mt-1">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            doctor.isLeft 
                              ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                              : isArrived 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500'
                          }`}>
                            {doctor.isLeft ? <UserRound className="w-3.5 h-3.5" /> : (isArrived ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />)}
                            {doctor.isLeft ? 'LEFT' : (isArrived ? 'ARRIVED' : 'SCHEDULED')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      
                      {/* Shift Period UI */}
                      <div className="flex flex-col gap-1 items-start mr-2">
                        <label className="text-xs font-medium text-muted-foreground">Shift Period</label>
                        <div className="flex items-center gap-2">
                          <Input 
                            id={`start-${doctor.id}`}
                            type="time"
                            value={doctor.expectedStartTime || ""}
                            onChange={(e) => handleInputChange(doctor.id, "expectedStartTime", e.target.value)}
                            className="w-[120px] h-9"
                            disabled={isArrived}
                            onBlur={(e) => autoUpdateShift(doctor, "end", e.target.value)}
                            onBlur={(e) => autoUpdateShift(doctor, "start", e.target.value)}
                          />
                          <span className="text-muted-foreground text-xs">to</span>
                          <Input 
                            id={`end-${doctor.id}`}
                            type="time"
                            value={doctor.expectedEndTime || ""}
                            onChange={(e) => handleInputChange(doctor.id, "expectedEndTime", e.target.value)}
                            className="w-[120px] h-9"
                            disabled={isArrived}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 items-end border-l pl-4 border-border">
                        <label className="text-xs font-medium text-muted-foreground">Today's Room</label>
                        <div className="flex items-center gap-2">
                          <Input 
                            id={`room-${doctor.id}`}
                            value={doctor.roomNumber || ""}
                            onChange={(e) => handleInputChange(doctor.id, "roomNumber", e.target.value)}
                            placeholder="Room #"
                            className="w-24 h-9"
                          />
                          <Button 
                            onClick={() => markArrived(doctor)} 
                            disabled={isProcessing || doctor.isLeft}
                            variant={isArrived ? "outline" : "default"}
                            className={`w-32 ${isArrived ? "border-green-500 text-green-600 hover:text-green-700" : ""}`}
                          >
                            {isProcessing && !processingId?.endsWith("-out") ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Marking...
                              </>
                            ) : (
                              isArrived ? "Update" : "Mark Arrived"
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Out Time UI */}
                      {isArrived && (
                        <div className="flex flex-col gap-1 items-end border-l pl-3 ml-1">
                          <label className="text-xs font-medium text-muted-foreground">Out Time</label>
                          <div className="flex items-center gap-2">
                            <Input 
                              id={`outTime-${doctor.id}`}
                              type="time"
                              className="w-32 h-9"
                            />
                            <Button 
                              onClick={() => markOut(doctor)} 
                              disabled={processingId === doctor.id + "-out"}
                              variant="destructive"
                              className="w-24"
                            >
                              {processingId === doctor.id + "-out" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Mark Out"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
