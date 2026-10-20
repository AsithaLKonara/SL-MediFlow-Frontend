"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Award, Printer, Save, CheckCircle2, FileText, Calendar } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { triggerPrinterAutoCut } from "@/lib/printerAutoCut";

export type CertificateType = "GENERAL_MEDICAL" | "SICK_LEAVE" | "FITNESS";

interface MedicalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    id: string;
    name: string;
    age?: number | string;
    gender?: string;
    contact?: string;
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

  // Form Fields
  const [certDate, setCertDate] = useState(new Date().toISOString().split("T")[0]);
  const [diagnosis, setDiagnosis] = useState("");
  const [remarks, setRemarks] = useState("");
  const [fee, setFee] = useState(1500);

  // Sick Leave Specific
  const [leaveFrom, setLeaveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [leaveDays, setLeaveDays] = useState(3);
  const [resumeDate, setResumeDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  // Fitness Specific
  const [purpose, setPurpose] = useState("Employment / Duty");
  const [fitnessRemarks, setFitnessRemarks] = useState("Patient is clinically examined and found physically and mentally FIT.");

  const certPrintRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: certPrintRef,
    documentTitle: `Medical_Certificate_${patient?.name || "Patient"}_${certDate}`,
    onAfterPrint: () => {
      triggerPrinterAutoCut();
    }
  });

  const handleSaveOrder = () => {
    if (onSaveAsOrder) {
      onSaveAsOrder({
        certificateType: certType,
        certificateData: {
          patientName: patient?.name,
          patientAge: patient?.age,
          patientGender: patient?.gender,
          date: certDate,
          diagnosis,
          remarks,
          leaveFrom,
          leaveDays,
          resumeDate,
          purpose,
          fitnessRemarks,
          doctorName: doctor?.fullName,
          doctorSpecialty: doctor?.specialty
        },
        customPrice: fee,
        notes: `Medical Certificate (${certType}) issued by ${doctor?.fullName || "Doctor"}`
      });
      toast.success("Certificate recorded to patient services & billing!");
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[92vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Award className="w-5 h-5 text-emerald-600" />
            Medical & Fitness Certificate Generator
          </DialogTitle>
          <DialogDescription>
            Generate and print official verified medical, sick leave, or fitness certificates.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0 py-2 overflow-y-auto">
          {/* Controls Column */}
          <div className="w-full md:w-96 flex flex-col space-y-4">
            <Tabs value={certType} onValueChange={v => setCertType(v as CertificateType)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="GENERAL_MEDICAL" className="text-xs">Medical</TabsTrigger>
                <TabsTrigger value="SICK_LEAVE" className="text-xs">Sick Leave</TabsTrigger>
                <TabsTrigger value="FITNESS" className="text-xs">Fitness</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="p-3 bg-muted/30 rounded-lg border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient:</span>
                <span className="font-semibold">{patient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Age / Gender:</span>
                <span>{patient.age || "—"} Yrs / {patient.gender || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Doctor:</span>
                <span>{doctor?.fullName || "Consultant"}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Certificate Date</label>
                <Input
                  type="date"
                  value={certDate}
                  onChange={e => setCertDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {certType === "GENERAL_MEDICAL" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Diagnosis / Illness</label>
                    <Input
                      placeholder="e.g. Acute Viral Pharyngitis"
                      value={diagnosis}
                      onChange={e => setDiagnosis(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Clinical Advice / Notes</label>
                    <Textarea
                      placeholder="Advised complete rest and hydration for 3 days..."
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      rows={3}
                      className="text-xs"
                    />
                  </div>
                </>
              )}

              {certType === "SICK_LEAVE" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Illness / Reason</label>
                    <Input
                      placeholder="e.g. Bronchitis & Fever"
                      value={diagnosis}
                      onChange={e => setDiagnosis(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Leave From</label>
                      <Input
                        type="date"
                        value={leaveFrom}
                        onChange={e => setLeaveFrom(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Days of Leave</label>
                      <Input
                        type="number"
                        min="1"
                        value={leaveDays}
                        onChange={e => setLeaveDays(parseInt(e.target.value) || 1)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Fit to Resume Duty On</label>
                    <Input
                      type="date"
                      value={resumeDate}
                      onChange={e => setResumeDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </>
              )}

              {certType === "FITNESS" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Purpose of Certificate</label>
                    <Input
                      placeholder="e.g. Employment / Sports / School"
                      value={purpose}
                      onChange={e => setPurpose(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Fitness Declaration</label>
                    <Textarea
                      value={fitnessRemarks}
                      onChange={e => setFitnessRemarks(e.target.value)}
                      rows={3}
                      className="text-xs"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1 pt-2 border-t">
                <label className="text-xs font-semibold text-muted-foreground">Certificate Charge (Rs.)</label>
                <Input
                  type="number"
                  min="0"
                  value={fee}
                  onChange={e => setFee(parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Certificate Live Preview Box */}
          <div className="flex-1 border-2 border-dashed border-muted rounded-xl p-6 bg-white text-black shadow-inner overflow-y-auto flex flex-col justify-between">
            <div ref={certPrintRef} className="p-4 print:p-8 space-y-6 bg-white text-black font-serif">
              {/* Letterhead Header */}
              <div className="text-center border-b-2 border-black pb-4 space-y-1">
                <h1 className="text-2xl font-black tracking-wider uppercase font-sans text-emerald-800">
                  AMAZ HOSPITAL
                </h1>
                <p className="text-xs text-gray-700 font-sans font-medium">
                  Debarawewa, Tissamaharama • Tel: 0472239090 • www.amazhospital.com
                </p>
                <div className="inline-block border border-black px-4 py-1 mt-2 text-xs font-sans font-bold uppercase tracking-widest bg-gray-50">
                  {certType === "GENERAL_MEDICAL" && "MEDICAL CERTIFICATE"}
                  {certType === "SICK_LEAVE" && "MEDICAL SICK LEAVE CERTIFICATE"}
                  {certType === "FITNESS" && "CERTIFICATE OF MEDICAL FITNESS"}
                </div>
              </div>

              {/* Date & Ref */}
              <div className="flex justify-between text-xs font-sans">
                <span>Date: <span className="font-semibold underline">{certDate}</span></span>
                <span>Ref #: <span className="font-mono">AMAZ-MC-{Date.now().toString().slice(-6)}</span></span>
              </div>

              {/* Body Content */}
              <div className="space-y-4 text-sm leading-relaxed pt-2">
                <p>
                  To Whom It May Concern,
                </p>
                <p>
                  This is to certify that <span className="font-bold underline uppercase">{patient.name}</span>,
                  aged <span className="font-bold underline">{patient.age || "—"}</span> years, 
                  residing at Debarawewa, was examined by me at AMAZ Hospital on <span className="font-bold underline">{certDate}</span>.
                </p>

                {certType === "GENERAL_MEDICAL" && (
                  <div className="p-3 border rounded bg-gray-50/50 space-y-2">
                    <p>
                      <strong>Clinical Findings / Diagnosis:</strong> {diagnosis || "[Diagnosis specified by doctor]"}
                    </p>
                    {remarks && (
                      <p>
                        <strong>Medical Advice:</strong> {remarks}
                      </p>
                    )}
                  </div>
                )}

                {certType === "SICK_LEAVE" && (
                  <div className="p-3 border rounded bg-gray-50/50 space-y-2">
                    <p>
                      The patient was found to be suffering from <strong>{diagnosis || "[Specified Illness]"}</strong> and is advised to take medical rest for a duration of <strong>{leaveDays} day(s)</strong>, commencing from <strong>{leaveFrom}</strong>.
                    </p>
                    <p>
                      The patient is expected to be fit to resume normal duties on <strong>{resumeDate}</strong>.
                    </p>
                  </div>
                )}

                {certType === "FITNESS" && (
                  <div className="p-3 border rounded bg-gray-50/50 space-y-2">
                    <p>
                      This examination was performed for the purpose of <strong>{purpose}</strong>.
                    </p>
                    <p className="font-medium">
                      {fitnessRemarks}
                    </p>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-16 flex justify-between items-end text-xs font-sans">
                <div className="text-center w-40 border-t border-black pt-2">
                  <p className="font-bold">Hospital Seal</p>
                  <p className="text-[10px] text-gray-500">Debarawewa Branch</p>
                </div>
                <div className="text-center w-48 border-t border-black pt-2">
                  <p className="font-bold text-sm">{doctor?.fullName || "Medical Officer"}</p>
                  <p className="text-[10px] text-gray-600">{doctor?.specialty || "Medical Practitioner"}</p>
                  <p className="text-[10px] text-gray-500 font-mono">Reg #: SLMC-{doctor?.id?.slice(0, 5) || "00000"}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between items-center bg-gray-50 p-3 rounded">
              <span className="text-xs text-muted-foreground">Letterhead verified format ready for print</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleSaveOrder} className="gap-1.5 text-xs">
                  <Save className="w-3.5 h-3.5" /> Save to Billing
                </Button>
                <Button size="sm" onClick={handlePrint} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Printer className="w-3.5 h-3.5" /> Print Certificate
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
