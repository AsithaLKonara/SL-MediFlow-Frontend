"use client";

import React from "react";
import { Users, User, Activity, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface FamilyMember {
  id: string;
  patientId: string; // MRN
  fullName: string;
  phone: string;
  ageFallback: number | null;
  gender: string | null;
  bloodGroup: string | null;
  hasActiveVisitToday: boolean;
}

interface FamilyMemberSwitcherProps {
  familyMembers: FamilyMember[];
  activePatientId: string;
  onSelectMember: (patientId: string) => void;
  loadingPatientId?: string | null;
}

export const FamilyMemberSwitcher: React.FC<FamilyMemberSwitcherProps> = ({
  familyMembers,
  activePatientId,
  onSelectMember,
  loadingPatientId,
}) => {
  if (!familyMembers || familyMembers.length <= 1) {
    return null;
  }

  return (
    <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Household Family Profiles</h2>
            <p className="text-xs text-zinc-400">Select a family member to view their medical records & live visits</p>
          </div>
        </div>
        <Badge variant="outline" className="border-zinc-700 bg-zinc-800/60 text-zinc-300 text-[11px] font-normal">
          {familyMembers.length} Profiles Linked
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {familyMembers.map((member) => {
          const isActive = member.id === activePatientId;
          const isLoadingThis = loadingPatientId === member.id;

          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelectMember(member.id)}
              disabled={isActive || !!loadingPatientId}
              className={`relative flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${
                isActive
                  ? "bg-gradient-to-r from-orange-500/15 to-amber-500/10 border-orange-500/60 shadow-md shadow-orange-950/20 text-white"
                  : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/40 text-zinc-300"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-semibold text-xs border ${
                    isActive
                      ? "bg-orange-500 text-white border-orange-400 shadow-sm"
                      : "bg-zinc-800 text-zinc-300 border-zinc-700 group-hover:border-zinc-600"
                  }`}
                >
                  {member.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || <User className="w-4 h-4" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate text-zinc-100">{member.fullName}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>{member.ageFallback ? `${member.ageFallback} yrs` : "Age N/A"}</span>
                    <span>•</span>
                    <span>{member.gender || "Patient"}</span>
                    {member.patientId && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-zinc-500">{member.patientId}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Visit Beacon */}
              {member.hasActiveVisitToday && (
                <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden sm:inline">In Hospital</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
