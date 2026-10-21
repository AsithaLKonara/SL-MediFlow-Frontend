"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ScanBarcode, Search, CheckCircle2, Clock, User, Phone, Calendar, ActivitySquare, Loader2, Sparkles, Stethoscope } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

interface ExtraServiceRecord {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isCompleted?: boolean;
}

interface ScannedVisit {
  masterBarcode: string;
  patient: {
    fullName: string;
    phone?: string;
    age?: number | string;
    gender?: string;
  };
  tokens: {
    extraService?: string | null;
    consultation?: string | null;
    lab?: string | null;
  };
  room: string;
  services: ExtraServiceRecord[];
}

export default function ExtraServicesWorkstation() {
  const { token } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [currentVisit, setCurrentVisit] = useState<ScannedVisit | null>(null);
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  const processBarcode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;
    setSearching(true);

    try {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/barcode/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });

      if (!res.ok) {
        toast.error(`No record found for barcode "${code}".`);
        return;
      }

      const json = await res.json();
      const { type, data: bData, masterBarcode } = json;

      if (type === "APPOINTMENT") {
        const patientData = bData.patient || bData.appointment?.Patient || {};
        const extraServiceItems: ExtraServiceRecord[] = (bData.extraServices || []).map((s: any) => ({
          id: s.id,
          description: s.description || s.title || "Extra Service",
          quantity: s.quantity || 1,
          unitPrice: s.unitPrice || s.price || 0,
          total: s.total || s.price || 0
        }));

        const visitData: ScannedVisit = {
          masterBarcode: masterBarcode || bData.masterBarcode || code,
          patient: {
            fullName: patientData.fullName || "Walk-in Patient",
            phone: patientData.phone,
            age: patientData.ageFallback,
            gender: patientData.gender
          },
          tokens: {
            extraService: bData.tokens?.extraService || null,
            consultation: bData.tokens?.consultation || null,
            lab: bData.tokens?.lab || null
          },
          room: bData.rooms?.extraService || "PROCEDURE",
          services: extraServiceItems
        };

        setCurrentVisit(visitData);
        setSearchInput("");
        if (extraServiceItems.length > 0) {
          toast.success(`Loaded ${extraServiceItems.length} service(s) for ${visitData.patient.fullName}`);
        } else {
          toast.info(`Visit ${visitData.masterBarcode} has no extra services booked.`);
        }
        return;
      }

      if (type === "EXTRA_SERVICE") {
        const visitData: ScannedVisit = {
          masterBarcode: code,
          patient: {
            fullName: "Walk-in Patient"
          },
          tokens: {
            extraService: "SRV"
          },
          room: "PROCEDURE",
          services: [{
            id: bData.id,
            description: bData.title || "Service",
            quantity: 1,
            unitPrice: bData.price || 0,
            total: bData.price || 0
          }]
        };
        setCurrentVisit(visitData);
        toast.success(`Service identified: ${bData.title}`);
        return;
      }

      toast.error(`Barcode recognized as ${type}, not an extra service visit.`);
    } catch (e) {
      console.error("Barcode resolution error:", e);
      toast.error("Failed to resolve barcode.");
    } finally {
      setSearching(false);
    }
  };

  // Auto-scan using hardware scanner
  useBarcodeScanner((barcode) => {
    processBarcode(barcode);
  });

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(searchInput);
  };

  const toggleComplete = (serviceId: string) => {
    setCompletedMap(prev => {
      const next = { ...prev, [serviceId]: !prev[serviceId] };
      if (next[serviceId]) {
        toast.success("Procedure marked as completed!");
      }
      return next;
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-6xl mx-auto">
      {/* HEADER & SCANNER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 border rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold px-2.5 py-0.5">
              Workstation Active
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ScanBarcode className="w-3.5 h-3.5" /> Hardware Scanner Listening
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <ActivitySquare className="w-8 h-8 text-primary" />
            Extra Services & Procedure Station
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Scan patient master barcode to execute ECG, Dressing, Injections, or Nursing procedures.
          </p>
        </div>

        {/* SEARCH FORM */}
        <form onSubmit={handleManualSearch} className="flex items-center gap-2 w-full md:w-96">
          <div className="relative flex-1">
            <ScanBarcode className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Scan Barcode (0123456789)..."
              className="pl-9 font-mono font-semibold"
              disabled={searching}
            />
          </div>
          <Button type="submit" disabled={searching || !searchInput.trim()} className="gap-1.5 font-bold">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Scan
          </Button>
        </form>
      </div>

      {/* ACTIVE SCANNED VISIT CARD */}
      {currentVisit ? (
        <Card className="border-2 border-primary/30 shadow-lg overflow-hidden">
          <div className="bg-muted/40 p-6 border-b">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-sm font-black bg-primary text-primary-foreground shadow-sm">
                    <ScanBarcode className="w-4 h-4" />
                    <span>{currentVisit.masterBarcode}</span>
                  </span>

                  {currentVisit.tokens.extraService && (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold px-3 py-1 text-sm">
                      Service Token: #{currentVisit.tokens.extraService}
                    </Badge>
                  )}

                  {currentVisit.tokens.consultation && (
                    <Badge variant="outline" className="text-muted-foreground font-semibold px-2.5 py-0.5 text-xs">
                      Doctor Token: #{currentVisit.tokens.consultation}
                    </Badge>
                  )}

                  <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-1">
                    Room: {currentVisit.room}
                  </Badge>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-muted-foreground" />
                  {currentVisit.patient.fullName}
                </h2>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                  {currentVisit.patient.age && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Age: {currentVisit.patient.age} {currentVisit.patient.gender ? `(${currentVisit.patient.gender})` : ''}
                    </span>
                  )}
                  {currentVisit.patient.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {currentVisit.patient.phone}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">
                  Booked Services
                </span>
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {currentVisit.services.length}
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" />
              Procedures to Execute for this Patient
            </h3>

            {currentVisit.services.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-lg text-muted-foreground">
                No extra services or procedures registered under this visit.
              </div>
            ) : (
              <div className="divide-y border rounded-lg overflow-hidden bg-card">
                {currentVisit.services.map((srv, idx) => {
                  const isDone = completedMap[srv.id];
                  return (
                    <div
                      key={`${srv.id}-${idx}`}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isDone ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-base ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {srv.description}
                          </span>
                          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                            Qty: {srv.quantity}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Rate: LKR {srv.unitPrice.toFixed(2)} • Total: LKR {srv.total.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                          isDone 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}>
                          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                          {isDone ? "Completed" : "Pending Execution"}
                        </span>

                        <Button
                          size="sm"
                          variant={isDone ? "outline" : "default"}
                          onClick={() => toggleComplete(srv.id)}
                          className="gap-1.5 font-bold"
                        >
                          {isDone ? "Undo" : "Mark as Done"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-xl bg-card">
          <ScanBarcode className="w-16 h-16 mx-auto text-muted-foreground/40 mb-3 animate-pulse" />
          <h3 className="text-xl font-bold text-foreground">Awaiting Barcode Scan</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
            Point your handheld scanner at the patient's token barcode or enter the 10-digit number above to load their procedure list.
          </p>
        </div>
      )}
    </div>
  );
}
