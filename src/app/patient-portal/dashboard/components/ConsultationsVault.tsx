"use client";

import React from "react";
import { Stethoscope, Calendar, Clock, MapPin, CheckCircle2, User, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface AppointmentRecord {
  id: string;
  tokenNumber: string;
  department: string;
  status: "BOOKED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  appointmentDate: string;
  bookingReference?: string;
  notes?: string;
  User?: {
    id: string;
    fullName: string;
    specialty?: string;
    room?: {
      number: string;
      name: string;
    };
  };
}

interface ConsultationsVaultProps {
  appointments: AppointmentRecord[];
}

export const ConsultationsVault: React.FC<ConsultationsVaultProps> = ({ appointments }) => {
  const consultAppts = appointments?.filter((a) => a.department === "CONSULTATION" || !a.department) || [];

  if (consultAppts.length === 0) {
    return (
      <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700/60 mx-auto flex items-center justify-center text-zinc-400 mb-3">
          <Stethoscope className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-zinc-200">No Doctor Visits on File</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          Your physician consultations, booked appointments, and clinical encounters will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {consultAppts.map((appt) => {
        const isCompleted = appt.status === "COMPLETED";
        const isInProgress = appt.status === "IN_PROGRESS";
        const dateStr = new Date(appt.appointmentDate).toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        return (
          <div
            key={appt.id}
            className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-700/80 transition-all shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-zinc-100">
                    {appt.User?.fullName || "Assigned Medical Officer"}
                  </h4>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 font-mono text-[10px]">
                    Token #{appt.tokenNumber}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-0.5">
                  <span className="text-zinc-300 font-medium">{appt.User?.specialty || "General Medicine"}</span>
                  {appt.User?.room && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-cyan-400">
                        <MapPin className="w-3 h-3" />
                        {appt.User.room.number} ({appt.User.room.name})
                      </span>
                    </>
                  )}
                  {appt.bookingReference && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-zinc-500 text-[11px]">Barcode: {appt.bookingReference}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-zinc-800/80 pt-2 sm:pt-0">
              <div className="text-right">
                <div className="text-xs font-medium text-zinc-200 flex items-center gap-1 sm:justify-end">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  {dateStr}
                </div>
              </div>

              <Badge
                variant="outline"
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  isCompleted
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : isInProgress
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400"
                }`}
              >
                {isCompleted && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                {appt.status}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};
