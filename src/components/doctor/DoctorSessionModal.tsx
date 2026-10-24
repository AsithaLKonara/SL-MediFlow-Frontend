"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, Stethoscope, AlertCircle, CalendarClock, Layers } from "lucide-react";

export interface DoctorSessionInfo {
  id: string;
  sessionName: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  roomName: string;
  tokenCapacity: number;
  bookedCount: number;
  completedCount: number;
  cancelledCount: number;
  totalAppointments: number;
  isCurrent: boolean;
  isPast: boolean;
  isUpcoming: boolean;
}

interface DoctorSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: DoctorSessionInfo[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  currentColomboTime?: string;
  doctorName?: string;
}

export function DoctorSessionModal({
  open,
  onOpenChange,
  sessions,
  activeSessionId,
  onSelectSession,
  currentColomboTime,
  doctorName,
}: DoctorSessionModalProps) {
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${m} ${ampm}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Stethoscope className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-500">
              Session Dispatcher
            </span>
          </div>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>Select Consultation Session</span>
            {currentColomboTime && (
              <Badge variant="outline" className="text-xs font-normal font-mono gap-1.5 border-border">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                {currentColomboTime} Colombo
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {doctorName ? `Dr. ${doctorName}, select ` : "Select "}
            which scheduled session you are actively attending. Your queue will strictly isolate and display patients booked for that session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {sessions.length === 0 ? (
            <div className="p-6 text-center border rounded-xl border-dashed bg-muted/20">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">No Scheduled Sessions Today</p>
              <p className="text-xs text-muted-foreground mt-1">
                You do not have any active schedule sessions configured for today.
              </p>
            </div>
          ) : (
            sessions.map((sess) => {
              const isSelected = activeSessionId === sess.id;
              return (
                <div
                  key={sess.id}
                  onClick={() => {
                    onSelectSession(sess.id);
                    onOpenChange(false);
                  }}
                  className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                      : "border-border hover:border-primary/50 bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base text-foreground">
                          {sess.sessionName}
                        </span>
                        {sess.isCurrent && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold uppercase">
                            Active Time Window
                          </Badge>
                        )}
                        {sess.isUpcoming && (
                          <Badge variant="outline" className="border-blue-500/30 text-blue-500 text-[10px]">
                            Upcoming
                          </Badge>
                        )}
                        {sess.isPast && (
                          <Badge variant="outline" className="border-zinc-500/30 text-zinc-400 text-[10px]">
                            Ended
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(sess.startTime)} – {formatTime(sess.endTime)}
                        </span>
                        <span>•</span>
                        <span>Room: <strong className="text-foreground">{sess.roomNumber}</strong></span>
                        <span>•</span>
                        <span>Capacity: <strong className="text-foreground">{sess.tokenCapacity}</strong></span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className={`gap-1.5 h-8 text-xs font-medium ${
                          isSelected ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSession(sess.id);
                          onOpenChange(false);
                        }}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </>
                        ) : (
                          "Start Session"
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span>Booked: <strong className="text-primary font-semibold">{sess.bookedCount}</strong></span>
                      <span>Completed: <strong className="text-emerald-600 font-semibold">{sess.completedCount}</strong></span>
                      {sess.cancelledCount > 0 && (
                        <span>Cancelled: <strong className="text-rose-500">{sess.cancelledCount}</strong></span>
                      )}
                    </div>
                    <span className="text-[11px] opacity-75">
                      {sess.bookedCount === 0 ? "No waiting patients" : `${sess.bookedCount} in queue`}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {sessions.length > 1 && (
            <div
              onClick={() => {
                onSelectSession("ALL");
                onOpenChange(false);
              }}
              className={`p-3 rounded-lg border border-dashed transition-all cursor-pointer flex items-center justify-between text-xs ${
                activeSessionId === "ALL"
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>View All Sessions Combined (Overview Mode)</span>
              </div>
              {activeSessionId === "ALL" && <CheckCircle2 className="w-4 h-4 text-primary" />}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
