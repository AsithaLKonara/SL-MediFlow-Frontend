"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  LogOut,
  Pill,
  FlaskConical,
  Stethoscope,
  Receipt,
  RefreshCw,
  Phone,
  User,
  Shield,
  Clock,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { FamilyMemberSwitcher, FamilyMember } from "./components/FamilyMemberSwitcher";
import { LiveVisitTracker, ActiveVisitManifest } from "./components/LiveVisitTracker";
import { PrescriptionsVault, PrescriptionRecord } from "./components/PrescriptionsVault";
import { LabReportsVault, LabRequestRecord } from "./components/LabReportsVault";
import { ConsultationsVault, AppointmentRecord } from "./components/ConsultationsVault";
import { InvoicesVault, InvoiceRecord } from "./components/InvoicesVault";

export interface PatientPortalData {
  familyMembers: FamilyMember[];
  activePatient: {
    id: string;
    patientId: string;
    fullName: string;
    phone: string;
    ageFallback: number | null;
    gender: string | null;
    bloodGroup: string | null;
  };
  activeVisit: ActiveVisitManifest | null;
  prescriptions: PrescriptionRecord[];
  labRequests: LabRequestRecord[];
  appointments: AppointmentRecord[];
  invoices: InvoiceRecord[];
}

export default function PatientDashboard() {
  const [data, setData] = useState<PatientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [switchingMemberId, setSwitchingMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"prescriptions" | "labs" | "consultations" | "invoices">("prescriptions");

  const loadData = useCallback(async (targetPatientId?: string, isSilent = false) => {
    const token = localStorage.getItem("patient_token");
    if (!token) {
      window.location.href = "/patient-portal";
      return;
    }

    if (!isSilent && !targetPatientId) setLoading(true);
    if (isSilent) setRefreshing(true);
    if (targetPatientId) setSwitchingMemberId(targetPatientId);

    try {
      const url = targetPatientId
        ? `${process.env.NEXT_PUBLIC_API_URL}/patient-portal/history?patientId=${targetPatientId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/patient-portal/history`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        localStorage.removeItem("patient_token");
        window.location.href = "/patient-portal";
        return;
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load records");

      setData(json.data);
    } catch (err: any) {
      console.error("Portal error:", err);
      toast.error(err.message || "Could not retrieve medical records");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSwitchingMemberId(null);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic background refresh for live hospital tracker (every 20s)
  useEffect(() => {
    if (!data?.activeVisit) return;
    const interval = setInterval(() => {
      if (data?.activePatient?.id) {
        loadData(data.activePatient.id, true);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [data?.activeVisit, data?.activePatient?.id, loadData]);

  const handleSelectMember = (patientId: string) => {
    loadData(patientId);
  };

  const handleLogout = () => {
    localStorage.removeItem("patient_token");
    window.location.href = "/patient-portal";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-zinc-200">Accessing Medical Vault</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Decrypting household records & real-time queue manifest...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.activePatient) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm space-y-4">
          <h3 className="text-base font-bold text-white">No Patient Record Found</h3>
          <p className="text-xs text-zinc-400">Please sign in again with your registered phone number.</p>
          <Button onClick={handleLogout} className="w-full bg-orange-600 hover:bg-orange-500 text-white">
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  const { activePatient, activeVisit, familyMembers, prescriptions, labRequests, appointments, invoices } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100 pb-24 selection:bg-orange-500/30 selection:text-orange-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Amaz Hospital" className="h-8 object-contain brightness-0 invert" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wider uppercase text-red-500">
                  AMAZ Hospital Holdings
                </span>
                <Badge variant="outline" className="hidden sm:inline-flex border-zinc-800 text-zinc-400 text-[10px]">
                  Patient Portal
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-zinc-500" />
                <span>+94 47 223 9090</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-500">Debarawewa, Tissamaharama</span>
              </p>
            </div>
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(activePatient.id, true)}
              disabled={refreshing}
              className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 text-xs h-8 px-2.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-orange-400" : ""}`} />
              <span className="hidden sm:inline ml-1.5">Sync</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 text-xs h-8 px-2.5"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* Active Patient Identity Header Card */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/80 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-bold text-base text-white shadow-lg shadow-orange-950/40">
              {activePatient.fullName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || <User className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-white tracking-tight">{activePatient.fullName}</h1>
                {activePatient.patientId && (
                  <Badge variant="outline" className="border-zinc-700 bg-zinc-800/60 font-mono text-[11px] text-zinc-300">
                    MRN: {activePatient.patientId}
                  </Badge>
                )}
                {activeVisit && (
                  <Badge className="bg-cyan-500/20 border-cyan-500/40 text-cyan-300 text-[10px] font-semibold animate-pulse">
                    Live In-Hospital
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-1">
                <span>Phone: <strong className="text-zinc-200 font-mono">{activePatient.phone}</strong></span>
                <span>•</span>
                <span>Age: <strong className="text-zinc-200">{activePatient.ageFallback ? `${activePatient.ageFallback} yrs` : "N/A"}</strong></span>
                <span>•</span>
                <span>Gender: <strong className="text-zinc-200">{activePatient.gender || "Not Specified"}</strong></span>
                {activePatient.bloodGroup && (
                  <>
                    <span>•</span>
                    <span>Blood: <strong className="text-red-400">{activePatient.bloodGroup}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <div className="text-right text-xs">
              <span className="text-zinc-400">Records Found</span>
              <div className="font-bold text-zinc-200">
                {prescriptions.length} Rx • {labRequests.length} Labs • {appointments.length} Visits
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Patient Family Switcher */}
        <FamilyMemberSwitcher
          familyMembers={familyMembers}
          activePatientId={activePatient.id}
          onSelectMember={handleSelectMember}
          loadingPatientId={switchingMemberId}
        />

        {/* Live Hospital Visit Tracker & Queue Stepper */}
        <LiveVisitTracker
          visit={activeVisit}
          patientName={activePatient.fullName}
        />

        {/* Navigation Tabs for Medical Vault */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab("prescriptions")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "prescriptions"
                    ? "bg-orange-500 text-white shadow-md shadow-orange-950/40"
                    : "bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60"
                }`}
              >
                <Pill className="w-4 h-4" />
                <span>Prescriptions</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "prescriptions" ? "bg-black/20 text-white" : "bg-zinc-800 text-zinc-400"
                }`}>
                  {prescriptions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("labs")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "labs"
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/40"
                    : "bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60"
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>Diagnostic Lab Reports</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "labs" ? "bg-black/20 text-white" : "bg-zinc-800 text-zinc-400"
                }`}>
                  {labRequests.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("consultations")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "consultations"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-950/40"
                    : "bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60"
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>Doctor Visits</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "consultations" ? "bg-black/20 text-white" : "bg-zinc-800 text-zinc-400"
                }`}>
                  {appointments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("invoices")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "invoices"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                    : "bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60"
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Billing & Invoices</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "invoices" ? "bg-black/20 text-white" : "bg-zinc-800 text-zinc-400"
                }`}>
                  {invoices.length}
                </span>
              </button>
            </div>
          </div>

          {/* Active Tab Panel */}
          <div className="pt-2">
            {activeTab === "prescriptions" && (
              <PrescriptionsVault prescriptions={prescriptions} />
            )}
            {activeTab === "labs" && (
              <LabReportsVault labRequests={labRequests} />
            )}
            {activeTab === "consultations" && (
              <ConsultationsVault appointments={appointments} />
            )}
            {activeTab === "invoices" && (
              <InvoicesVault invoices={invoices} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
