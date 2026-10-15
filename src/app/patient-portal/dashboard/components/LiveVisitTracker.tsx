"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  Stethoscope,
  FlaskConical,
  Pill,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  ChevronRight,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Barcode = dynamic(() => import("react-barcode"), { ssr: false });

export interface ActiveVisitManifest {
  masterBarcode: string;
  visitDate: string;
  currentStage: "CHECKED_IN" | "WAITING_DOCTOR" | "IN_CONSULTATION" | "WAITING_LAB" | "LAB_PROCESSING" | "PHARMACY" | "COMPLETED";
  queueAhead: number;
  consultationToken?: {
    tokenNumber: string;
    status: string;
    doctorName: string;
    specialty: string;
    roomNumber: string;
  } | null;
  labToken?: {
    tokenNumber: string;
    status: string;
    testCount: number;
  } | null;
  extraServiceToken?: {
    tokenNumber: string;
    status: string;
  } | null;
  hasPrescription?: boolean;
  hasLabTests?: boolean;
}

interface LiveVisitTrackerProps {
  visit: ActiveVisitManifest | null;
  patientName: string;
}

export const LiveVisitTracker: React.FC<LiveVisitTrackerProps> = ({ visit, patientName }) => {
  const [pulseSeconds, setPulseSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!visit) {
    return (
      <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-5 text-center shadow-lg">
        <div className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700/60 mx-auto flex items-center justify-center text-zinc-400 mb-2.5">
          <Clock className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200">No Active Visit Today</h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
          {patientName} does not have an in-progress consultation or lab queue today. You can review past prescriptions, diagnostic reports, and medical history below.
        </p>
      </div>
    );
  }

  // Determine stage index (0 to 4)
  const getStageIndex = (stage: string) => {
    switch (stage) {
      case "CHECKED_IN":
        return 0;
      case "WAITING_DOCTOR":
      case "IN_CONSULTATION":
        return 1;
      case "WAITING_LAB":
      case "LAB_PROCESSING":
        return 2;
      case "PHARMACY":
        return 3;
      case "COMPLETED":
        return 4;
      default:
        return 0;
    }
  };

  const currentStageIndex = getStageIndex(visit.currentStage);

  const stages = [
    {
      title: "Frontdesk Registration",
      subtitle: "Token & Barcode Issued",
      icon: UserCheck,
    },
    {
      title: "Doctor Consultation",
      subtitle: visit.consultationToken?.doctorName || "Assigned Doctor",
      icon: Stethoscope,
      meta: visit.consultationToken ? `${visit.consultationToken.roomNumber}` : undefined,
    },
    {
      title: "Laboratory Diagnostic",
      subtitle: visit.hasLabTests ? "Specimen Analysis" : "No Tests Ordered",
      icon: FlaskConical,
      meta: visit.labToken ? `Token #${visit.labToken.tokenNumber}` : undefined,
    },
    {
      title: "Central Pharmacy",
      subtitle: "Dispensing Prescribed Drugs",
      icon: Pill,
    },
    {
      title: "Visit Checkout",
      subtitle: "Completed",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-zinc-900/90 via-zinc-900/70 to-zinc-950 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl shadow-cyan-950/20 space-y-6">
      {/* Top Banner with Pulse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">Live Hospital Visit Tracker</h2>
              <Badge className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400 text-[10px] uppercase font-semibold">
                Live Processing
              </Badge>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Real-time queue display and department processing for {patientName}</p>
          </div>
        </div>

        {/* Master Barcode Card */}
        {visit.masterBarcode && visit.masterBarcode !== "N/A" && (
          <div className="bg-white/95 rounded-xl p-2 px-3 flex flex-col items-center justify-center shadow-md">
            <div className="h-9 flex items-center justify-center overflow-hidden">
              <Barcode
                value={visit.masterBarcode}
                format="CODE128"
                width={1.2}
                height={26}
                displayValue={false}
                margin={0}
                background="transparent"
              />
            </div>
            <span className="font-mono font-bold text-[11px] text-zinc-950 tracking-widest mt-0.5">
              {visit.masterBarcode}
            </span>
          </div>
        )}
      </div>

      {/* Active Tokens Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Doctor Token */}
        {visit.consultationToken && (
          <div className="bg-zinc-900/90 border border-cyan-500/40 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">Doctor Token</span>
                <div className="text-xl font-black text-white tracking-tight">
                  #{visit.consultationToken.tokenNumber}
                </div>
                <div className="text-xs text-zinc-300 font-medium truncate max-w-[150px]">
                  {visit.consultationToken.doctorName}
                </div>
              </div>
            </div>
            <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 bg-cyan-950/40 text-xs font-semibold px-2 py-1">
              <MapPin className="w-3 h-3 mr-1" />
              {visit.consultationToken.roomNumber}
            </Badge>
          </div>
        )}

        {/* Lab Token */}
        {visit.labToken ? (
          <div className="bg-zinc-900/90 border border-emerald-500/40 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Laboratory Token</span>
                <div className="text-xl font-black text-white tracking-tight">
                  #{visit.labToken.tokenNumber}
                </div>
                <div className="text-xs text-zinc-300 font-medium">
                  {visit.labToken.testCount} Test(s) Ordered
                </div>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-950/40 text-xs font-semibold px-2 py-1">
              Room 02
            </Badge>
          </div>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3.5 flex items-center gap-3 text-zinc-500">
            <FlaskConical className="w-5 h-5" />
            <div className="text-xs">
              <div className="font-semibold text-zinc-400">Laboratory</div>
              <div>No lab investigations booked</div>
            </div>
          </div>
        )}

        {/* Extra Service Token */}
        {visit.extraServiceToken ? (
          <div className="bg-zinc-900/90 border border-purple-500/40 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider">Extra Service</span>
                <div className="text-xl font-black text-white tracking-tight">
                  #{visit.extraServiceToken.tokenNumber}
                </div>
              </div>
            </div>
            <Badge variant="outline" className="border-purple-500/40 text-purple-300 bg-purple-950/40 text-xs font-semibold px-2 py-1">
              Treatment Room
            </Badge>
          </div>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3.5 flex items-center gap-3 text-zinc-500">
            <Pill className="w-5 h-5" />
            <div className="text-xs">
              <div className="font-semibold text-zinc-400">Pharmacy Counter</div>
              <div>Ready upon checkout</div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Queue Announcement Callout */}
      <div className="bg-gradient-to-r from-cyan-950/60 to-zinc-900/80 border border-cyan-500/40 rounded-xl p-4 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
          <Activity className="w-4 h-4 animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Status Update:</span>
            {visit.currentStage === "WAITING_DOCTOR" && (
              <span className="text-amber-400">Waiting for Doctor Call</span>
            )}
            {visit.currentStage === "IN_CONSULTATION" && (
              <span className="text-emerald-400 animate-pulse font-bold">In Doctor Consultation Room Now</span>
            )}
            {visit.currentStage === "WAITING_LAB" && (
              <span className="text-cyan-400">Please Proceed to Lab Room 02</span>
            )}
            {visit.currentStage === "LAB_PROCESSING" && (
              <span className="text-cyan-300">Specimen Collected — Analyzing</span>
            )}
            {visit.currentStage === "PHARMACY" && (
              <span className="text-orange-400">Prescription at Central Pharmacy</span>
            )}
            {visit.currentStage === "COMPLETED" && (
              <span className="text-emerald-400">Visit Successfully Completed</span>
            )}
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            {visit.currentStage === "WAITING_DOCTOR" && (
              <>
                There are <strong className="text-amber-400 font-bold">{visit.queueAhead}</strong> patients ahead of your token in{" "}
                <strong className="text-white">{visit.consultationToken?.roomNumber || "Consultation Room"}</strong>. Please remain seated near the hallway display screen.
              </>
            )}
            {visit.currentStage === "IN_CONSULTATION" && (
              <>
                The doctor has called your token. Please proceed immediately to{" "}
                <strong className="text-emerald-400">{visit.consultationToken?.roomNumber}</strong> with{" "}
                <strong className="text-white">{visit.consultationToken?.doctorName}</strong>.
              </>
            )}
            {visit.currentStage === "WAITING_LAB" && (
              <>
                Your doctor requested diagnostic tests. Please proceed to the Phlebotomy Counter at{" "}
                <strong className="text-cyan-300">Room 02</strong> with your Master Barcode.
              </>
            )}
            {visit.currentStage === "LAB_PROCESSING" && (
              <>
                Your sample has been collected by the laboratory team and is currently undergoing automated diagnostic testing.
              </>
            )}
            {visit.currentStage === "PHARMACY" && (
              <>
                Your consultation is completed and medications have been electronically forwarded to the Central Pharmacy POS for dispensing.
              </>
            )}
            {visit.currentStage === "COMPLETED" && (
              <>
                All hospital procedures for today have concluded. Thank you for visiting Amaz Hospital!
              </>
            )}
          </p>
        </div>
      </div>

      {/* 5-Stage Visual Stepper */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-1">
          <span>Patient Journey Workflow</span>
          <span>Stage {currentStageIndex + 1} of 5</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
          {stages.map((st, idx) => {
            const Icon = st.icon;
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            const isUpcoming = idx > currentStageIndex;

            return (
              <div
                key={idx}
                className={`relative p-3 rounded-xl border transition-all ${
                  isCurrent
                    ? "bg-gradient-to-b from-cyan-950/60 to-zinc-900/90 border-cyan-500 shadow-lg shadow-cyan-950/40 text-white"
                    : isCompleted
                    ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                    : "bg-zinc-900/30 border-zinc-800/50 text-zinc-500"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${
                      isCurrent
                        ? "bg-cyan-500 text-zinc-950 border-cyan-400 animate-pulse"
                        : isCompleted
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  {isCurrent && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                  )}
                </div>

                <div className="font-semibold text-xs leading-tight mb-0.5 text-zinc-100">
                  {st.title}
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  {st.subtitle}
                </div>
                {st.meta && (
                  <div className="text-[10px] font-mono font-medium text-cyan-400 mt-1">
                    {st.meta}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
