"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  X,
  Printer,
  FileText,
  Activity,
  User,
  Calendar,
  CheckCircle2,
  DollarSign,
  HeartPulse,
  Eye,
  Scale
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { triggerPrinterAutoCut } from "@/lib/printerAutoCut";
import {
  PhysicalFitnessCertificateTemplate,
  PhysicalFitnessCertificateData
} from "@/components/printing/certificates/PhysicalFitnessCertificateTemplate";
import {
  MedicalCertificateA5Template,
  MedicalCertificateA5Data
} from "@/components/printing/certificates/MedicalCertificateA5Template";

export interface CertificatePatientInfo {
  id?: string;
  fullName: string;
  phone?: string;
  nic?: string;
  gender?: string;
  age?: number | string;
  address?: string;
}

interface MedicalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: CertificatePatientInfo;
  doctorName?: string;
  doctorSlmc?: string;
  onSaveAsExtraService?: (serviceData: {
    title: string;
    price: number;
    patientId?: string;
    certificateType: "LEAVE" | "FITNESS";
    certificateDetails: any;
  }) => Promise<void> | void;
}

export default function MedicalCertificateModal({
  isOpen,
  onClose,
  patient,
  doctorName = "Dr. K. M. Wickramasinghe",
  doctorSlmc = "SLMC-28491",
  onSaveAsExtraService,
}: MedicalCertificateModalProps) {
  // Mode: LEAVE or FITNESS
  const [certType, setCertType] = useState<"LEAVE" | "FITNESS">("LEAVE");
  const [activeTab, setActiveTab] = useState<"FORM" | "PREVIEW">("PREVIEW");

  // Patient Info State
  const [patientName, setPatientName] = useState(patient?.fullName || "Sunil Shantha");
  const [patientAge, setPatientAge] = useState(patient?.age?.toString() || "45");
  const [patientGender, setPatientGender] = useState(patient?.gender || "Male");
  const [patientNic, setPatientNic] = useState(patient?.nic || "197914502391");
  const [patientPhone, setPatientPhone] = useState(patient?.phone || "0771234567");

  // Sync patient prop changes when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (patient) {
        setPatientName(patient.fullName || "");
        setPatientAge(patient.age?.toString() || "");
        setPatientGender(patient.gender || "Male");
        setPatientNic(patient.nic || "");
        setPatientPhone(patient.phone || "");
      }
    }
  }, [isOpen, patient]);

  // Doctor Info State
  const [docName, setDocName] = useState(doctorName);
  const [docQualifications, setDocQualifications] = useState("MBBS (Colombo), Dip. Family Medicine");
  const [docSlmc, setDocSlmc] = useState(doctorSlmc);

  // Billing Price
  const [servicePrice, setServicePrice] = useState(certType === "LEAVE" ? "650" : "1200");
  const [isSaving, setIsSaving] = useState(false);

  // Today's date ISO
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const certSerial = useMemo(
    () => `AMAZ-MC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
    [certType]
  );

  // Medical Leave specific fields
  const [diagnosis, setDiagnosis] = useState("Acute Viral Gastroenteritis with dehydration");
  const [leaveFrom, setLeaveFrom] = useState(todayStr);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  }, []);
  const [leaveTo, setLeaveTo] = useState(tomorrowStr);
  const [resumeDate, setResumeDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [leaveRemarks, setLeaveRemarks] = useState(
    "Advised complete bed rest, adequate oral hydration, and medication compliance. Medically unfit to attend duties during this period."
  );

  // Calculated Leave Days
  const calculatedDays = useMemo(() => {
    if (!leaveFrom || !leaveTo) return 1;
    const diffTime = Math.abs(new Date(leaveTo).getTime() - new Date(leaveFrom).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(diffDays) ? 1 : diffDays;
  }, [leaveFrom, leaveTo]);

  // General Fitness specific fields
  const [fitnessPurpose, setFitnessPurpose] = useState("General Employment Medical Clearance");
  const [heightCm, setHeightCm] = useState("172");
  const [weightKg, setWeightKg] = useState("68");
  const [bp, setBp] = useState("120/80");
  const [pulse, setPulse] = useState("72");
  const [visionLeft, setVisionLeft] = useState("6/6");
  const [visionRight, setVisionRight] = useState("6/6");
  const [visionCorrection, setVisionCorrection] = useState<"WITHOUT" | "WITH">("WITHOUT");
  const [fitnessDeclaration, setFitnessDeclaration] = useState(
    "I hereby certify that I have conducted a thorough clinical physical examination of the above-named candidate and found them to be in good physical and mental health, free from infectious or communicable diseases, and medically FIT for duty."
  );
  const [fitnessRemarks, setFitnessRemarks] = useState("No significant clinical abnormalities detected. Fit for all regular duties.");

  // Calculated BMI
  const bmiInfo = useMemo(() => {
    const h = parseFloat(heightCm) / 100;
    const w = parseFloat(weightKg);
    if (!h || !w || h <= 0) return { value: "N/A", status: "N/A" };
    const val = (w / (h * h)).toFixed(1);
    const num = parseFloat(val);
    let st = "Normal";
    if (num < 18.5) st = "Underweight";
    else if (num >= 25 && num < 30) st = "Overweight";
    else if (num >= 30) st = "Obese";
    return { value: val, status: st };
  }, [heightCm, weightKg]);

  // Print ref
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef as any,
    documentTitle: `${certType === "LEAVE" ? "Medical_Leave_Certificate" : "Fitness_Certificate"}_${patientName}`,
    onAfterPrint: () => {
      triggerPrinterAutoCut();
      toast.success("Certificate sent to printer successfully");
    },
  });

  const handleSaveAndBill = async () => {
    try {
      setIsSaving(true);
      const title =
        certType === "LEAVE"
          ? `Medical Leave Certificate (${calculatedDays} Days)`
          : `General Fitness Certificate (${fitnessPurpose})`;
      const price = parseFloat(servicePrice) || 0;

      const certDetails =
        certType === "LEAVE"
          ? {
              serial: certSerial,
              patientName,
              diagnosis,
              leaveFrom,
              leaveTo,
              calculatedDays,
              resumeDate,
              remarks: leaveRemarks,
              doctor: docName,
            }
          : {
              serial: certSerial,
              patientName,
              purpose: fitnessPurpose,
              height: heightCm,
              weight: weightKg,
              bmi: bmiInfo.value,
              bp,
              pulse,
              vision: { left: visionLeft, right: visionRight, correction: visionCorrection },
              remarks: fitnessRemarks,
              doctor: docName,
            };

      if (onSaveAsExtraService) {
        await onSaveAsExtraService({
          title,
          price,
          patientId: patient?.id,
          certificateType: certType,
          certificateDetails: certDetails,
        });
      } else {
        // Fallback simulate save toast
        toast.success(`Extra Service "${title}" added to billing at LKR ${price.toFixed(2)}`);
      }
      toast.success("Certificate saved & added to Extra Services!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save certificate service");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card text-card-foreground border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Issue Medical & Fitness Certificate</h2>
              <p className="text-xs text-muted-foreground">
                Pre-configured certified templates under Hospital Extra Services
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Template Switcher Pills */}
            <div className="flex bg-muted p-1 rounded-xl border">
              <button
                type="button"
                data-testid="tab-leave-cert"
                onClick={() => {
                  setCertType("LEAVE");
                  setServicePrice("650");
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  certType === "LEAVE"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Medical Leave
              </button>
              <button
                type="button"
                data-testid="tab-fitness-cert"
                onClick={() => {
                  setCertType("FITNESS");
                  setServicePrice("1200");
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  certType === "FITNESS"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                General Fitness
              </button>
            </div>

            <button
              onClick={onClose}
              data-testid="close-cert-modal"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Mode Toggle (Mobile / Split) */}
        <div className="px-6 py-2.5 border-b bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <span className="font-semibold text-muted-foreground">Active Template:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              {certType === "LEAVE" ? "Medical Leave Certificate" : "Certificate of Medical Fitness"}
            </span>
            <span className="text-muted-foreground">Ref:</span>
            <span className="font-mono font-medium">{certSerial}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("FORM")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                activeTab === "FORM" ? "bg-primary text-primary-foreground font-medium" : "bg-muted text-muted-foreground"
              }`}
            >
              Edit Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PREVIEW")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                activeTab === "PREVIEW" ? "bg-primary text-primary-foreground font-medium" : "bg-muted text-muted-foreground"
              }`}
            >
              Document Preview
            </button>
          </div>
        </div>

        {/* Main Body: Two Columns on Large Screens */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls */}
          <div
            className={`space-y-4 lg:col-span-5 ${
              activeTab === "PREVIEW" ? "hidden lg:block" : "block"
            }`}
          >
            {/* Patient Information Section */}
            <div className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" /> Patient Details
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2">
                  <label className="text-muted-foreground block mb-1">Patient Full Name</label>
                  <input
                    type="text"
                    data-testid="input-patient-name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Age</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Gender</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">NIC / ID</label>
                  <input
                    type="text"
                    value={patientNic}
                    onChange={(e) => setPatientNic(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Template Specific Form Inputs */}
            {certType === "LEAVE" ? (
              <div className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" /> Medical Leave Details
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-muted-foreground block mb-1">Clinical Diagnosis</label>
                    <input
                      type="text"
                      data-testid="input-leave-diagnosis"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g. Acute bronchitis, Viral fever"
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-muted-foreground block mb-1">Leave From Date</label>
                      <input
                        type="date"
                        data-testid="input-leave-from"
                        value={leaveFrom}
                        onChange={(e) => setLeaveFrom(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground block mb-1">Leave To Date</label>
                      <input
                        type="date"
                        data-testid="input-leave-to"
                        value={leaveTo}
                        onChange={(e) => setLeaveTo(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="font-semibold text-primary">Total Recommended Leave:</span>
                    <span className="font-bold text-sm text-primary" data-testid="leave-days-count">
                      {calculatedDays} Days
                    </span>
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Fit to Resume Duties On</label>
                    <input
                      type="date"
                      value={resumeDate}
                      onChange={(e) => setResumeDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Doctor Remarks / Instructions</label>
                    <textarea
                      rows={2}
                      value={leaveRemarks}
                      onChange={(e) => setLeaveRemarks(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-primary" /> Examination & Fitness Details
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-muted-foreground block mb-1">Purpose of Certificate</label>
                    <input
                      type="text"
                      data-testid="input-fitness-purpose"
                      value={fitnessPurpose}
                      onChange={(e) => setFitnessPurpose(e.target.value)}
                      placeholder="e.g. Pre-employment, Driving License"
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                    />
                  </div>

                  {/* Vitals Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-muted-foreground block mb-1">Height (cm)</label>
                      <input
                        type="number"
                        data-testid="input-height"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-background text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground block mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        data-testid="input-weight"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-background text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground block mb-1">BMI (calc)</label>
                      <div className="w-full px-2.5 py-1.5 rounded-lg border bg-muted font-bold text-xs flex items-center justify-between" data-testid="bmi-display">
                        <span>{bmiInfo.value}</span>
                        <span className="text-[10px] text-primary">{bmiInfo.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-muted-foreground block mb-1">BP (mmHg)</label>
                      <input
                        type="text"
                        data-testid="input-bp"
                        value={bp}
                        onChange={(e) => setBp(e.target.value)}
                        placeholder="120/80"
                        className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground block mb-1">Pulse (bpm)</label>
                      <input
                        type="text"
                        value={pulse}
                        onChange={(e) => setPulse(e.target.value)}
                        placeholder="72"
                        className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Vision */}
                  <div className="border p-2.5 rounded-lg bg-muted/20 space-y-2">
                    <span className="font-semibold flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-primary" /> Visual Acuity
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground block">Left Eye</label>
                        <input
                          type="text"
                          value={visionLeft}
                          onChange={(e) => setVisionLeft(e.target.value)}
                          className="w-full px-2 py-1 rounded border bg-background text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block">Right Eye</label>
                        <input
                          type="text"
                          value={visionRight}
                          onChange={(e) => setVisionRight(e.target.value)}
                          className="w-full px-2 py-1 rounded border bg-background text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block">Correction</label>
                        <select
                          value={visionCorrection}
                          onChange={(e: any) => setVisionCorrection(e.target.value)}
                          className="w-full px-2 py-1 rounded border bg-background text-xs outline-none"
                        >
                          <option value="WITHOUT">Without Glasses</option>
                          <option value="WITH">With Glasses</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-1">Fitness Declaration</label>
                    <textarea
                      rows={2}
                      value={fitnessDeclaration}
                      onChange={(e) => setFitnessDeclaration(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Clinical Remarks</label>
                    <input
                      type="text"
                      value={fitnessRemarks}
                      onChange={(e) => setFitnessRemarks(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Doctor Info & Fee Setup */}
            <div className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Doctor & Billing Setup
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1">Doctor Name</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">SLMC Reg. No</label>
                  <input
                    type="text"
                    value={docSlmc}
                    onChange={(e) => setDocSlmc(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-muted-foreground block mb-1">Extra Service Fee (LKR)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                    <input
                      type="number"
                      data-testid="input-cert-fee"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg border bg-background text-sm font-semibold outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Printable Certificate Preview */}
          <div
            className={`lg:col-span-7 flex flex-col items-center justify-start ${
              activeTab === "FORM" ? "hidden lg:flex" : "flex"
            }`}
          >
            <div className="w-full flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-muted-foreground">Printable Certificate Output</span>
              <span className="text-[11px] text-muted-foreground italic">
                {certType === "FITNESS" ? "A4 Portrait Official Template" : "A5 Landscape Official Red Frame"}
              </span>
            </div>

            {/* Certificate Paper Container with Shadow and Border */}
            <div
              className="w-full bg-slate-100 dark:bg-slate-900 border rounded-xl p-4 overflow-auto flex flex-col items-center justify-start shadow-inner"
              data-testid="certificate-print-preview"
            >
              <div className="shadow-2xl border border-slate-300 dark:border-slate-800 bg-white rounded my-auto max-w-full overflow-hidden">
                {certType === "FITNESS" ? (
                  <PhysicalFitnessCertificateTemplate
                    ref={printRef}
                    data={{
                      patientName: patientName,
                      candidateTitle: patientGender === "Female" ? "Mrs" : "Mr",
                      idNo: patientNic,
                      height: heightCm ? `${heightCm} cm` : "",
                      weight: weightKg ? `${weightKg} kg` : "",
                      bp: bp,
                      pr: pulse,
                      visionR: visionRight,
                      visionL: visionLeft,
                      hearing: "Normal",
                      respiration: "Normal",
                      remarks: fitnessRemarks,
                      doctorName: docName,
                      date: todayStr
                    }}
                  />
                ) : (
                  <MedicalCertificateA5Template
                    ref={printRef}
                    data={{
                      serialNo: certSerial,
                      date: todayStr,
                      patientName: patientName,
                      patientAddress: `${patient?.address ? `${patient.address}, ` : ""}${patientAge ? `${patientAge} yrs, ${patientGender}` : ""}`,
                      diagnosis: diagnosis,
                      remarks: leaveRemarks || `Recommended leave from ${leaveFrom} to ${leaveTo} (${calculatedDays} day(s))`,
                      recommended: `Medical rest for ${calculatedDays} days. Fit to resume on ${resumeDate}.`,
                      doctorName: docName,
                      doctorQualification: docQualifications,
                      doctorSlmcNo: docSlmc
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Service Fee:</span>
            <span className="text-sm font-bold text-primary">LKR {parseFloat(servicePrice || "0").toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              data-testid="cancel-cert-modal-btn"
              className="px-4 py-2 rounded-xl border hover:bg-muted text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              data-testid="print-certificate-btn"
              onClick={() => handlePrint()}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print Certificate
            </button>

            <button
              type="button"
              data-testid="save-extra-service-btn"
              disabled={isSaving}
              onClick={handleSaveAndBill}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save & Bill Extra Service"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
