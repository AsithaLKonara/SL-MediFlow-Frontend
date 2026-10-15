"use client";

import React, { useState } from "react";
import { FlaskConical, Calendar, FileText, Download, CheckCircle2, Clock, AlertTriangle, Eye, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface LabRequestItem {
  id: string;
  LabTest?: {
    id: string;
    name: string;
    code: string;
    category?: string;
  };
}

export interface LabResultItem {
  id: string;
  parameterName?: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  interpretation?: string;
}

export interface LabRequestRecord {
  id: string;
  tokenNumber?: string;
  status: "PENDING" | "SAMPLE_COLLECTED" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  priority?: string;
  requestedAt?: string;
  createdAt?: string;
  reportUrl?: string;
  items?: LabRequestItem[];
  results?: LabResultItem[];
}

interface LabReportsVaultProps {
  labRequests: LabRequestRecord[];
}

export const LabReportsVault: React.FC<LabReportsVaultProps> = ({ labRequests }) => {
  const [selectedReportUrl, setSelectedReportUrl] = useState<string | null>(null);

  if (!labRequests || labRequests.length === 0) {
    return (
      <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700/60 mx-auto flex items-center justify-center text-zinc-400 mb-3">
          <FlaskConical className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-zinc-200">No Diagnostic Reports on File</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          Laboratory blood tests and diagnostic reports ordered during hospital visits will be published here with download links.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {labRequests.map((lab) => {
        const isCompleted = lab.status === "COMPLETED";
        const isCollected = lab.status === "SAMPLE_COLLECTED" || lab.status === "PROCESSING";
        const dateStr = new Date(lab.requestedAt || lab.createdAt || Date.now()).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        const reportLink = lab.reportUrl || (isCompleted ? `/reports/${lab.id.slice(0, 8).toUpperCase()}` : null);

        return (
          <Card key={lab.id} className="bg-zinc-900/80 backdrop-blur-md border-zinc-800/80 text-white shadow-xl overflow-hidden">
            <CardHeader className="bg-zinc-900/90 border-b border-zinc-800/80 p-4 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <span>Lab Investigation Batch</span>
                      {lab.tokenNumber && (
                        <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 font-mono text-[11px]">
                          Token #{lab.tokenNumber}
                        </Badge>
                      )}
                    </CardTitle>
                    <span className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      isCompleted
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : isCollected
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                    {isCollected && <Clock className="w-3 h-3 mr-1 inline" />}
                    {lab.status}
                  </Badge>

                  {isCompleted && reportLink && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 h-8 font-semibold shadow-md shadow-emerald-950/30"
                      onClick={() => window.open(reportLink, "_blank")}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Test Items */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Ordered Tests ({lab.items?.length || 0})
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {lab.items?.map((item) => (
                    <div
                      key={item.id}
                      className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        <span className="font-semibold text-zinc-200">
                          {item.LabTest?.name || "Diagnostic Test"}
                        </span>
                      </div>
                      <Badge variant="outline" className="border-zinc-800 text-zinc-400 text-[10px]">
                        {item.LabTest?.category || "Pathology"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recorded Parameters/Results if available */}
              {lab.results && lab.results.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Diagnostic Parameters
                  </div>
                  <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-3 bg-zinc-900/60 p-2 text-[11px] font-semibold text-zinc-400 border-b border-zinc-800">
                      <div>Parameter</div>
                      <div className="text-center">Observed Value</div>
                      <div className="text-right">Reference Range</div>
                    </div>
                    {lab.results.map((res) => (
                      <div key={res.id} className="grid grid-cols-3 p-2 text-xs border-b border-zinc-800/50 last:border-0 text-zinc-300">
                        <div className="font-medium text-zinc-200">{res.parameterName || "Test Value"}</div>
                        <div className="text-center font-bold text-cyan-300">
                          {res.value} {res.unit || ""}
                        </div>
                        <div className="text-right text-zinc-500 font-mono text-[11px]">
                          {res.referenceRange || "Normal"}
                        </div>
                      </div>
                    ))}
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
