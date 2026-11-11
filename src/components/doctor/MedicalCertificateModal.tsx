import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Printer, Save, FileText, CheckCircle2, Loader2 } from "lucide-react";
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

export type CertificateType = "GENERAL_MEDICAL" | "SICK_LEAVE" | "FITNESS";

interface MedicalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    id: string;
    name: string;
    age?: number;
    gender?: string;
    contact?: string;
    address?: string;
    nic?: string;
    activeVisitId?: string | null;
  } | null;
  doctor: {
    id: string;
    fullName?: string;
    specialty?: string;
  } | null;
  onSaveAsOrder?: (certData: {
    certificateType: CertificateType;
    certificateData: any;
    customPrice: number;
    notes: string;
  }) => void;
}

export function MedicalCertificateModal({
  isOpen,
  onClose,
  patient,
  doctor,
  onSaveAsOrder
}: MedicalCertificateModalProps) {
  const [certType, setCertType] = useState<CertificateType>("GENERAL_MEDICAL");
  const [isManualBlank, setIsManualBlank] = useState(false);

  // Common Fields
  const [certDate, setCertDate] = useState(new Date().toISOString().split("T")[0]);
  const [fee, setFee] = useState(1500);

  // Medical Certificate (A5 Landscape) Fields
  const [diagnosis, setDiagnosis] = useState("Acute Upper Respiratory Tract Infection");
  const [remarks, setRemarks] = useState("Advised warm saline gargle & complete bed rest.");
  const [recommended, setRecommended] = useState("Medical Leave for 3 days from date of examination.");
  const [patientAddress, setPatientAddress] = useState(patient?.address || "No. 123, Healthcare Blvd, Colombo 07");

  // Sick Leave Helpers
  const [leaveFrom, setLeaveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [leaveDays, setLeaveDays] = useState(3);
  const [resumeDate, setResumeDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  // Physical Fitness Certificate (A4 Portrait) Fields
  const [idNo, setIdNo] = useState(patient?.nic || "");
  const [height, setHeight] = useState("168 cm");
  const [weight, setWeight] = useState("64 kg");
  const [respiration, setRespiration] = useState("16 / min (Normal Vesicular)");
  const [bp, setBp] = useState("120/80 mmHg");
  const [rr, setRr] = useState("16 / min");
  const [dr, setDr] = useState("Normal");
  const [pr, setPr] = useState("72 bpm (Regular)");
  const [scars, setScars] = useState("None");
  const [lumps, setLumps] = useState("None");
  const [hearing, setHearing] = useState("Normal Bilaterally");
  const [visionR, setVisionR] = useState("6/6");
  const [visionL, setVisionL] = useState("6/6");
  const [ecg, setEcg] = useState("Normal Sinus Rhythm");
  const [fbc, setFbc] = useState("Within Normal Limits");
  const [ufr, setUfr] = useState("Normal (Alb: Nil, Sug: Nil)");
  const [bGroupRh, setBGroupRh] = useState("O Positive");
  const [etc, setEtc] = useState("NAD");
  const [sgotSgpt, setSgotSgpt] = useState("Normal");
  const [scr, setScr] = useState("0.9 mg/dL");
  const [esr, setEsr] = useState("12 mm/1st hr");
  const [sCholestol, setSCholestol] = useState("175 mg/dL");
  const [fbs, setFbs] = useState("88 mg/dL");
  const [allergy, setAllergy] = useState("No known drug allergies");
  const [otherRemarks, setOtherRemarks] = useState("Systemic examination normal. Clinically fit.");
  const [candidateTitle, setCandidateTitle] = useState<string>("Mr");

  // Dedicated Print Refs
  const certPrintRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: certPrintRef,
    documentTitle: `${certType === "FITNESS" ? "Physical_Fitness_Certificate" : "Medical_Certificate"}_${patient?.name || "Patient"}_${certDate}`,
    onAfterPrint: () => {
      triggerPrinterAutoCut();
    }
  });

  // Keep recommended updated if sick leave dates change
  const handleLeaveDaysChange = (days: number) => {
    setLeaveDays(days);
    const start = new Date(leaveFrom);
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    const endStr = end.toISOString().split("T")[0];
    setResumeDate(endStr);
    setRecommended(`Medical leave for ${days} day(s) from ${leaveFrom} to ${endStr}. Fit to resume on ${endStr}.`);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveOrder = async () => {
    if (isSaving) return;
    if (onSaveAsOrder) {
      setIsSaving(true);
      try {
        await onSaveAsOrder({
          certificateType: certType,
          certificateData: {
            patientName: patient?.name,
            patientAge: patient?.age,
            patientGender: patient?.gender,
            date: certDate,
            diagnosis,
            remarks,
            recommended,
            idNo,
            height,
            weight,
            bp,
            pr,
            rr,
            doctorName: doctor?.fullName || "Dr. V.K.P.A. Mahesh Lakshman",
            doctorSpecialty: doctor?.specialty
          },
          customPrice: fee,
          notes: `Official Certificate (${certType === "FITNESS" ? "A4 Fitness" : "A5 Medical"}) issued by ${doctor?.fullName || "Doctor"}`
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (!patient) return null;

  // Build Medical A5 Data
  const medicalA5Data: MedicalCertificateA5Data = {
    serialNo: `SLMF-MC-${Date.now().toString().slice(-6)}`,
    date: certDate,
    patientName: patient.name,
    patientAddress: patientAddress,
    diagnosis: diagnosis,
    remarks: remarks,
    recommended: recommended,
    doctorName: doctor?.fullName || "Dr. V.K.P.A. Mahesh Lakshman",
    doctorQualification: "MBBS - Karapitiya",
    doctorSlmcNo: "27337",
    isManualBlank
  };

  // Build Fitness A4 Data
  const fitnessData: PhysicalFitnessCertificateData = {
    patientName: patient.name,
    idNo: idNo || patient.nic || "—",
    height,
    weight,
    respiration,
    bp,
    dr,
    rr,
    pr,
    scars,
    lumps,
    hearing,
    visionR,
    visionL,
    ecg,
    fbc,
    ufr,
    bGroupRh,
    etc,
    sgotSgpt,
    scr,
    esr,
    sCholestol,
    fbs,
    allergy,
    remarks: otherRemarks,
    doctorName: doctor?.fullName || "Dr. V.K.P.A. Mahesh Lakshman",
    candidateTitle,
    date: certDate,
    isManualBlank
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="w-[96vw] max-w-7xl max-h-[95vh] flex flex-col p-5">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Award className="w-5 h-5 text-emerald-600" />
                Hospital Official Certificate Generator
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Official hospital print templates: A4 Physical Fitness Certificate & A5 Landscape Medical Certificate
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer bg-muted/50 px-2.5 py-1.5 rounded border border-border">
                <input
                  type="checkbox"
                  checked={isManualBlank}
                  onChange={e => setIsManualBlank(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                  data-testid="chk-blank-stationery"
                />
                Print as Blank Dot-line Stationery (Manual Fill)
              </label>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0 py-2 overflow-hidden">
          {/* Controls Column */}
          <div className="w-full lg:w-[380px] flex flex-col space-y-3 overflow-y-auto pr-1">
            <Tabs value={certType} onValueChange={v => setCertType(v as CertificateType)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="GENERAL_MEDICAL" className="text-xs font-semibold" data-testid="tab-medical-a5">
                  Medical Cert (A5)
                </TabsTrigger>
                <TabsTrigger value="FITNESS" className="text-xs font-semibold" data-testid="tab-fitness-a4">
                  Fitness Cert (A4)
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Patient Header Summary */}
            <div className="p-2.5 bg-muted/40 rounded-lg border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient:</span>
                <span className="font-bold">{patient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">NIC / Contact:</span>
                <span>{patient.nic || patient.contact || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Doctor:</span>
                <span>{doctor?.fullName || "Dr. V.K.P.A. Mahesh Lakshman"}</span>
              </div>
            </div>

            {/* Form Fields: Medical Certificate (A5 Landscape) */}
            {certType === "GENERAL_MEDICAL" && (
              <div className="space-y-2.5 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Issue Date</label>
                  <Input
                    type="date"
                    value={certDate}
                    onChange={e => setCertDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Patient Address</label>
                  <Input
                    value={patientAddress}
                    onChange={e => setPatientAddress(e.target.value)}
                    placeholder="No. 123, Healthcare Blvd, Colombo 07"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Diagnosis</label>
                  <Input
                    value={diagnosis}
                    onChange={e => setDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Viral Bronchitis"
                    className="h-8 text-xs"
                    data-testid="input-diagnosis"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Remarks</label>
                  <Input
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Clinical advice / symptoms"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Recommended (Duty/Leave Advice)</label>
                  <Textarea
                    value={recommended}
                    onChange={e => setRecommended(e.target.value)}
                    placeholder="e.g. Medical Leave for 3 days from 21/10/2026 to 24/10/2026"
                    rows={2}
                    className="text-xs"
                    data-testid="input-recommended"
                  />
                </div>

                <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/20 rounded border border-blue-200/60 dark:border-blue-900/40 text-[11px] space-y-1">
                  <span className="font-bold text-blue-900 dark:text-blue-300 block">Quick Sick Leave Duration:</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 5, 7].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleLeaveDaysChange(d)}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border rounded font-semibold text-xs hover:border-blue-500"
                      >
                        {d} Day{d > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Form Fields: Physical Fitness Certificate (A4 Portrait) */}
            {certType === "FITNESS" && (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="font-semibold text-muted-foreground text-[11px]">Title</label>
                    <select
                      value={candidateTitle}
                      onChange={e => setCandidateTitle(e.target.value)}
                      className="w-full h-7 text-xs border rounded bg-background px-1"
                    >
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Miss">Miss</option>
                      <option value="Rev">Rev</option>
                    </select>
                  </div>
                  <div className="space-y-0.5">
                    <label className="font-semibold text-muted-foreground text-[11px]">ID / NIC No</label>
                    <Input
                      value={idNo}
                      onChange={e => setIdNo(e.target.value)}
                      placeholder="NIC No"
                      className="h-7 text-xs"
                      data-testid="input-fitness-id"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="font-semibold text-muted-foreground text-[11px]">Height</label>
                    <Input value={height} onChange={e => setHeight(e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-0.5">
                    <label className="font-semibold text-muted-foreground text-[11px]">Weight</label>
                    <Input value={weight} onChange={e => setWeight(e.target.value)} className="h-7 text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="font-semibold text-muted-foreground text-[11px]">BP</label>
                    <Input value={bp} onChange={e => setBp(e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-0.5">
                    <label className="font-semibold text-muted-foreground text-[11px]">PR (Pulse)</label>
                    <Input value={pr} onChange={e => setPr(e.target.value)} className="h-7 text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="font-semibold text-muted-foreground text-[11px]">Vision (R)</label>
                    <Input value={visionR} onChange={e => setVisionR(e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-0.5">
                    <label className="font-semibold text-muted-foreground text-[11px]">Vision (L)</label>
                    <Input value={visionL} onChange={e => setVisionL(e.target.value)} className="h-7 text-xs" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <label className="font-semibold text-muted-foreground text-[11px]">Hearing / Respiration</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={hearing} onChange={e => setHearing(e.target.value)} placeholder="Hearing" className="h-7 text-xs" />
                    <Input value={respiration} onChange={e => setRespiration(e.target.value)} placeholder="Respiration" className="h-7 text-xs" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <label className="font-semibold text-muted-foreground text-[11px]">Key Investigations</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input value={ecg} onChange={e => setEcg(e.target.value)} placeholder="ECG" className="h-6 text-[11px]" />
                    <Input value={fbc} onChange={e => setFbc(e.target.value)} placeholder="FBC" className="h-6 text-[11px]" />
                    <Input value={bGroupRh} onChange={e => setBGroupRh(e.target.value)} placeholder="Blood Group" className="h-6 text-[11px]" />
                    <Input value={fbs} onChange={e => setFbs(e.target.value)} placeholder="FBS" className="h-6 text-[11px]" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <label className="font-semibold text-muted-foreground text-[11px]">Allergies / Remarks</label>
                  <Input value={allergy} onChange={e => setAllergy(e.target.value)} placeholder="Allergies" className="h-7 text-xs" />
                  <Input value={otherRemarks} onChange={e => setOtherRemarks(e.target.value)} placeholder="Remarks" className="h-7 text-xs mt-1" />
                </div>
              </div>
            )}

            {/* Fee input */}
            <div className="pt-2 border-t flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">Fee Charge (LKR)</label>
              <Input
                type="number"
                min="0"
                value={fee}
                onChange={e => setFee(parseFloat(e.target.value) || 0)}
                className="w-24 h-7 text-xs font-bold text-right"
              />
            </div>
          </div>

          {/* Certificate Live Preview Box */}
          <div className="flex-1 bg-slate-100 dark:bg-slate-900 border rounded-xl p-4 overflow-auto flex flex-col items-center justify-start shadow-inner">
            <div className="mb-2 text-[11px] font-semibold text-muted-foreground flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              <span>
                {certType === "FITNESS" ? "A4 Portrait Preview (Exact Hospital Template)" : "A5 Landscape Preview (Official Hospital Red Frame)"}
              </span>
            </div>

            {/* Scrollable Container with White Sheet Shadow */}
            <div className="shadow-2xl border border-slate-300 dark:border-slate-800 bg-white rounded my-auto max-w-full overflow-hidden" data-testid="certificate-preview-container">
              {certType === "FITNESS" ? (
                <PhysicalFitnessCertificateTemplate ref={certPrintRef} data={fitnessData} />
              ) : (
                <MedicalCertificateA5Template ref={certPrintRef} data={medicalA5Data} />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            Print ready with zero margin collisions (via isolated react-to-print).
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleSaveOrder} disabled={isSaving} className="gap-1.5 text-xs">
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaving ? "Saving..." : "Save to Billing"}
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="print-certificate-btn"
            >
              <Printer className="w-3.5 h-3.5" /> Print Certificate
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
