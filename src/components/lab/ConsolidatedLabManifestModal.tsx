"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanBarcode, User, Phone, Calendar, ArrowRight, CheckCircle2, Clock, FlaskConical, Stethoscope } from "lucide-react";

export interface ConsolidatedTestItem {
  requestId: string;
  testId: string;
  testName: string;
  category?: string;
  roomNumber?: string;
  status: string;
  source: "Frontdesk" | "Doctor";
  requestedAt?: string;
  price?: number;
}

export interface ConsolidatedLabManifest {
  masterBarcode: string;
  patient: {
    name: string;
    age?: number | string;
    gender?: string;
    phone?: string;
  };
  tokens: {
    lab?: string | null;
    consultation?: string | null;
  };
  room?: string;
  tests: ConsolidatedTestItem[];
}

interface ConsolidatedLabManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: ConsolidatedLabManifest | null;
}

export function ConsolidatedLabManifestModal({
  isOpen,
  onClose,
  manifest
}: ConsolidatedLabManifestModalProps) {
  const router = useRouter();

  if (!manifest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border rounded-xl shadow-2xl">
        {/* HEADER BANNER */}
        <div className="bg-muted/40 p-6 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-black bg-primary text-primary-foreground shadow-sm">
                  <ScanBarcode className="w-3.5 h-3.5" />
                  <span>{manifest.masterBarcode}</span>
                </span>

                {manifest.tokens.lab && (
                  <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 font-bold px-2.5 py-0.5">
                    Lab Token: #{manifest.tokens.lab}
                  </Badge>
                )}

                {manifest.tokens.consultation && (
                  <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10 font-semibold px-2 py-0.5">
                    Consultation Token: #{manifest.tokens.consultation}
                  </Badge>
                )}

                <Badge variant="secondary" className="font-semibold text-xs px-2 py-0.5">
                  Room: {manifest.room || "LAB"}
                </Badge>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-muted-foreground" />
                {manifest.patient.name || "Walk-in Patient"}
              </h2>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                {manifest.patient.age && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Age: {manifest.patient.age} {manifest.patient.gender ? `(${manifest.patient.gender})` : ''}
                  </span>
                )}
                {manifest.patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {manifest.patient.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">
                Total Ordered Tests
              </span>
              <span className="text-3xl font-extrabold text-primary">
                {manifest.tests.length}
              </span>
            </div>
          </div>
        </div>

        {/* TEST MANIFEST LIST */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-primary" />
              Consolidated Test Manifest for this Visit Cycle
            </h3>
            <span className="text-xs text-muted-foreground">
              Frontdesk & Doctor orders unified
            </span>
          </div>

          {manifest.tests.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground">
              No lab tests requested under this visit barcode.
            </div>
          ) : (
            <div className="divide-y border rounded-lg overflow-hidden bg-card">
              {manifest.tests.map((test, idx) => (
                <div key={`${test.requestId}-${test.testId}-${idx}`} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {test.testName}
                      </span>

                      {test.source === "Doctor" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                          <Stethoscope className="w-3 h-3" />
                          Doctor Recommended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                          Frontdesk Booking
                        </span>
                      )}

                      {test.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {test.category}
                        </span>
                      )}

                      {test.roomNumber && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {test.roomNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Request ID: {test.requestId.substring(0, 8)}...</span>
                      {test.price ? <span>• LKR {test.price.toFixed(2)}</span> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      test.status === "COMPLETED" 
                        ? "bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20"
                        : test.status === "IN_PROGRESS"
                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                    }`}>
                      {test.status === "COMPLETED" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      {test.status}
                    </span>

                    <Button
                      size="sm"
                      onClick={() => {
                        onClose();
                        router.push(`/labtech/results/${test.requestId}`);
                      }}
                      className="gap-1.5 h-8 text-xs font-semibold"
                    >
                      <span>{test.status === "COMPLETED" ? "View Report" : "Enter Results"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-muted/20 px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
