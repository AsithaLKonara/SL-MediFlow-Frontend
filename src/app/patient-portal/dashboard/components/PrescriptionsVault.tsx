"use client";

import React from "react";
import { Pill, Calendar, Clock, Stethoscope, Sun, Sunrise, Moon, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  medicine?: {
    id: string;
    name: string;
    genericName?: string;
    category?: string;
    strength?: string;
  };
}

export interface PrescriptionRecord {
  id: string;
  doctorName: string;
  diagnosis?: string;
  notes?: string;
  status: string; // e.g. ACTIVE, DISPENSED, PENDING
  createdAt: string;
  items: PrescriptionItem[];
}

interface PrescriptionsVaultProps {
  prescriptions: PrescriptionRecord[];
}

// Parses frequency strings like "1-0-1", "1-1-1", "0-0-1", "2x day", "Once daily"
function parseDosageTiming(freqStr: string) {
  if (!freqStr) return { morning: "-", noon: "-", night: "-" };
  const clean = freqStr.trim();
  const match = clean.match(/^(\d+)-(\d+)-(\d+)$/);
  if (match) {
    return { morning: match[1], noon: match[2], night: match[3] };
  }
  if (clean.toLowerCase().includes("1x") || clean.toLowerCase().includes("once")) {
    return { morning: "1", noon: "-", night: "-" };
  }
  if (clean.toLowerCase().includes("2x") || clean.toLowerCase().includes("twice")) {
    return { morning: "1", noon: "-", night: "1" };
  }
  if (clean.toLowerCase().includes("3x") || clean.toLowerCase().includes("thrice")) {
    return { morning: "1", noon: "1", night: "1" };
  }
  return { morning: "-", noon: "-", night: "-" };
}

export const PrescriptionsVault: React.FC<PrescriptionsVaultProps> = ({ prescriptions }) => {
  if (!prescriptions || prescriptions.length === 0) {
    return (
      <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700/60 mx-auto flex items-center justify-center text-zinc-400 mb-3">
          <Pill className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-zinc-200">No Prescriptions on File</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          Prescriptions written by your doctor during consultations will appear here with scheduled dosage directions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prescriptions.map((rx) => {
        const isDispensed = rx.status === "DISPENSED";
        const dateStr = new Date(rx.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        return (
          <Card key={rx.id} className="bg-zinc-900/80 backdrop-blur-md border-zinc-800/80 text-white shadow-xl overflow-hidden">
            <CardHeader className="bg-zinc-900/90 border-b border-zinc-800/80 p-4 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <span>Doctor: {rx.doctorName || "Assigned Physician"}</span>
                    </CardTitle>
                    {rx.diagnosis && (
                      <p className="text-xs text-orange-400 font-medium mt-0.5">
                        Diagnosis: {rx.diagnosis}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                      isDispensed
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    }`}
                  >
                    {isDispensed ? <CheckCircle2 className="w-3 h-3 mr-1 inline" /> : null}
                    {isDispensed ? "Dispensed by Pharmacy" : "Prescribed"}
                  </Badge>
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {dateStr}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Items List */}
              <div className="space-y-2.5">
                {rx.items?.map((item) => {
                  const timing = parseDosageTiming(item.frequency);

                  return (
                    <div
                      key={item.id}
                      className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700/80 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-zinc-100">{item.drugName}</span>
                          {item.medicine?.strength && (
                            <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[10px]">
                              {item.medicine.strength}
                            </Badge>
                          )}
                          {item.dosage && (
                            <span className="text-xs text-zinc-400 font-medium">({item.dosage})</span>
                          )}
                        </div>

                        {item.medicine?.genericName && (
                          <div className="text-xs text-zinc-400">
                            Generic: <span className="text-zinc-300 italic">{item.medicine.genericName}</span>
                          </div>
                        )}

                        {item.instructions && (
                          <div className="text-xs text-orange-400/90 font-medium flex items-center gap-1.5">
                            <span>Directions: {item.instructions}</span>
                          </div>
                        )}
                      </div>

                      {/* Daily Schedule Chips */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 px-2 text-xs">
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-amber-300 bg-amber-500/10">
                            <Sunrise className="w-3 h-3" />
                            <span className="font-mono font-bold text-[11px]">{timing.morning}</span>
                          </div>
                          <span className="text-zinc-600">:</span>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-orange-300 bg-orange-500/10">
                            <Sun className="w-3 h-3" />
                            <span className="font-mono font-bold text-[11px]">{timing.noon}</span>
                          </div>
                          <span className="text-zinc-600">:</span>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-indigo-300 bg-indigo-500/10">
                            <Moon className="w-3 h-3" />
                            <span className="font-mono font-bold text-[11px]">{timing.night}</span>
                          </div>
                        </div>

                        {item.frequency && (
                          <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-xs">
                            {item.frequency}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {rx.notes && (
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-zinc-300">Doctor Note: </strong>
                    {rx.notes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
