"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Printer,
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  User,
  Stethoscope,
  ShoppingBag,
  Info,
  FlaskConical,
  Activity,
  Check,
  X
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { CartItem, RxMetaPayload } from "../hooks/useCartSync";
import { ExternalPrescriptionReceipt, ExternalPrescriptionMed } from "./PrintTemplates/ExternalPrescriptionReceipt";
import { PrescriptionReceipt } from "./PrintTemplates/PrescriptionReceipt";
import { calculateDispenseQuantity } from "@/lib/prescriptionUtils";
import { triggerPrinterAutoCut } from "@/lib/printerAutoCut";

export interface PrescriptionItem {
  id: string;
  medicineId: string | null;
  drugName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  dispenseQty: number | null;
  totalStock?: number;
  unitPrice?: number;
  medicine?: {
    id: string;
    name: string;
    unit?: string;
    stockBatches?: { unitPrice: number; currentQuantity?: number }[];
  } | null;
}

export interface Prescription {
  id: string;
  patientName: string;
  patientAge?: string | number;
  patientPhone?: string;
  doctorName: string;
  diagnosis?: string;
  createdAt: string;
  status: string;
  items: PrescriptionItem[];
  labRequests?: { id: string; tests: string[] }[];
  visitId?: string;
  patientId?: string;
  bookingReference?: string | null;
  doctor?: any;
  consultationPaid?: boolean;
  consultationFee?: number;
}

interface FrontdeskRxEditModalProps {
  prescription: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
  onSendToPOS: (
    items: CartItem[],
    rxId: string,
    doctor?: any,
    consultationPaid?: boolean,
    visitId?: string,
    patientId?: string,
    meta?: RxMetaPayload
  ) => void;
  isInPos: boolean;
}

export function FrontdeskRxEditModal({
  prescription,
  isOpen,
  onClose,
  onSendToPOS,
  isInPos
}: FrontdeskRxEditModalProps) {
  const [selectedHospitalIds, setSelectedHospitalIds] = useState<Set<string>>(new Set());
  const [draftInvoice, setDraftInvoice] = useState<any>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  // Print refs
  const externalPrintRef = useRef<HTMLDivElement>(null);
  const hospitalPrintRef = useRef<HTMLDivElement>(null);
  const fullPrintRef = useRef<HTMLDivElement>(null);

  const printExternal = useReactToPrint({
    contentRef: externalPrintRef,
    documentTitle: `External_Rx_${prescription?.patientName || "Patient"}`,
    onAfterPrint: () => {
      triggerPrinterAutoCut().catch(e => console.warn("Auto cut error:", e));
    }
  });

  const printHospital = useReactToPrint({
    contentRef: hospitalPrintRef,
    documentTitle: `Hospital_Rx_${prescription?.patientName || "Patient"}`,
    onAfterPrint: () => {
      triggerPrinterAutoCut().catch(e => console.warn("Auto cut error:", e));
    }
  });

  const printFull = useReactToPrint({
    contentRef: fullPrintRef,
    documentTitle: `Full_Rx_${prescription?.patientName || "Patient"}`,
    onAfterPrint: () => {
      triggerPrinterAutoCut().catch(e => console.warn("Auto cut error:", e));
    }
  });

  // Fetch visit draft invoice (for lab tests and extra services under the master barcode)
  useEffect(() => {
    if (!prescription?.visitId || !isOpen) {
      setDraftInvoice(null);
      return;
    }

    let isMounted = true;
    setIsLoadingInvoice(true);

    const token = typeof window !== "undefined" ? localStorage.getItem("amaz_token") : null;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/invoices?visitId=${prescription.visitId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (isMounted && data && data.status === "DRAFT") {
          setDraftInvoice(data);
        }
      })
      .catch(err => {
        console.error("Failed to fetch visit invoice in Rx modal:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingInvoice(false);
      });

    return () => {
      isMounted = false;
    };
  }, [prescription?.visitId, isOpen]);

  // Segregate items into Hospital In-Stock vs External / Non-Inventory
  const { hospitalItems, externalItems } = useMemo(() => {
    if (!prescription?.items) return { hospitalItems: [], externalItems: [] };

    const hospital: PrescriptionItem[] = [];
    const external: PrescriptionItem[] = [];

    for (const item of prescription.items) {
      const stock = item.totalStock ?? (
        item.medicine?.stockBatches?.reduce(
          (sum: number, b: any) => sum + (b.currentQuantity || 0),
          0
        ) ?? 0
      );

      const hasMedicine = Boolean(item.medicineId && item.medicine);
      const isAvailableInHospital = hasMedicine && stock > 0;

      if (isAvailableInHospital) {
        hospital.push({ ...item, totalStock: stock });
      } else {
        external.push({ ...item, totalStock: stock });
      }
    }

    return { hospitalItems: hospital, externalItems: external };
  }, [prescription]);

  // Reset selected hospital items when modal opens
  useEffect(() => {
    if (prescription && isOpen) {
      setSelectedHospitalIds(new Set(hospitalItems.map(i => i.id)));
    }
  }, [prescription, isOpen, hospitalItems]);

  if (!prescription) return null;

  const toggleHospitalItem = (id: string) => {
    setSelectedHospitalIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllHospital = () => {
    setSelectedHospitalIds(new Set(hospitalItems.map(i => i.id)));
  };

  const deselectAllHospital = () => {
    setSelectedHospitalIds(new Set());
  };

  // Consultation and service totals
  const doctorFee = prescription.consultationFee ?? prescription.doctor?.consultationFee ?? 2500;
  const isConsultationPaid = Boolean(prescription.consultationPaid);
  const consultFeeAmount = isConsultationPaid ? 0 : doctorFee;

  // Lab tests and services from draft invoice or prescription
  const invoiceLabItems = (draftInvoice?.lineItems || []).filter((li: any) => li.department === "LAB");
  const invoiceServiceItems = (draftInvoice?.lineItems || []).filter((li: any) => li.department === "SERVICE" || li.department === "EXTRA_SERVICE");
  
  const selectedPharmacyItems = hospitalItems.filter(i => selectedHospitalIds.has(i.id));
  const pharmacySubtotal = selectedPharmacyItems.reduce((sum, item) => {
    const unitPrice = item.unitPrice ?? item.medicine?.stockBatches?.[0]?.unitPrice ?? 0;
    const qty = item.dispenseQty || calculateDispenseQuantity(item) || 1;
    return sum + (unitPrice * qty);
  }, 0);

  const labSubtotal = invoiceLabItems.reduce((sum: number, li: any) => sum + (Number(li.total) || 0), 0);
  const servicesSubtotal = invoiceServiceItems.reduce((sum: number, li: any) => sum + (Number(li.total) || 0), 0);
  const totalHospitalEstimate = pharmacySubtotal + consultFeeAmount + labSubtotal + servicesSubtotal;

  const handleSendSelectedToPOS = () => {
    const selectedItems = hospitalItems.filter(i => selectedHospitalIds.has(i.id));

    const cartItems: CartItem[] = selectedItems.map(item => {
      const unitPrice = item.unitPrice ?? item.medicine?.stockBatches?.[0]?.unitPrice ?? 0;
      const qty = item.dispenseQty || calculateDispenseQuantity(item) || 1;
      return {
        id: item.medicine!.id,
        name: item.medicine!.name,
        qty,
        price: unitPrice,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
      };
    });

    onSendToPOS(
      cartItems,
      prescription.id,
      prescription.doctor,
      prescription.consultationPaid,
      prescription.visitId,
      prescription.patientId,
      {
        doctorName: prescription.doctor?.fullName || prescription.doctorName || "Doctor",
        patientName: prescription.patientName || "Walk-in",
        bookingReference: prescription.bookingReference || undefined,
        consultationFee: prescription.consultationFee ?? prescription.doctor?.consultationFee ?? 2500,
      }
    );

    if (cartItems.length > 0) {
      toast.success(`${cartItems.length} hospital medicine(s) and consultation fee sent to POS.`);
    } else {
      toast.success(`Consultation fee and visit services sent to POS.`);
    }

    if (externalItems.length > 0) {
      toast.info(
        `Prescription contains ${externalItems.length} external item(s). Click "Print External Prescription" to give the slip to the patient.`
      );
    }

    onClose();
  };

  // Convert external items to format expected by ExternalPrescriptionReceipt
  const externalPrintMedicines: ExternalPrescriptionMed[] = externalItems.map(i => ({
    name: i.drugName || i.medicine?.name || "Medication",
    dosage: i.dosage,
    frequency: i.frequency,
    duration: i.duration,
    instructions: i.instructions,
    qty: i.dispenseQty || calculateDispenseQuantity(i)
  }));

  // Convert hospital items to format expected by PrescriptionReceipt
  const hospitalPrintMedicines = hospitalItems
    .filter(i => selectedHospitalIds.has(i.id))
    .map(i => ({
      name: i.drugName || i.medicine?.name || "Medication",
      dosage: i.dosage,
      frequency: i.frequency,
      duration: i.duration,
      instructions: i.instructions,
      dispenseQty: i.dispenseQty || calculateDispenseQuantity(i) || 1,
    }));

  // All items for full print
  const fullPrintMedicines = (prescription.items || []).map(i => ({
    name: i.drugName || i.medicine?.name || "Medication",
    dosage: i.dosage,
    frequency: i.frequency,
    duration: i.duration,
    instructions: i.instructions,
    dispenseQty: i.dispenseQty || calculateDispenseQuantity(i) || 1,
  }));

  const formattedDate = new Date(prescription.createdAt).toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  const formatClinicalSummary = (item: { dosage?: string; frequency?: string; duration?: string }) => {
    const parts: string[] = [];
    if (item.frequency) parts.push(item.frequency);
    if (item.dosage) parts.push(`(${item.dosage})`);
    if (item.duration) parts.push(`for ${item.duration}`);
    return parts.join(" ");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-6xl w-[96vw] h-[86vh] max-h-[820px] flex flex-col p-0 overflow-hidden bg-card text-card-foreground border-border shadow-2xl">
          {/* Patient Details Header */}
          <DialogHeader className="p-4 px-6 border-b border-border bg-muted/20 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                    Prescription & Visit Details
                  </DialogTitle>
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 border-primary/30 text-primary bg-primary/5">
                    RX-{prescription.id.slice(-6).toUpperCase()}
                  </Badge>
                  {prescription.bookingReference && (
                    <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 bg-secondary text-secondary-foreground">
                      #{prescription.bookingReference}
                    </Badge>
                  )}
                  {isInPos && (
                    <Badge className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5">
                      ✓ Active in POS
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <User className="w-3.5 h-3.5 text-primary" /> {prescription.patientName}
                    {prescription.patientAge ? ` (${prescription.patientAge} yrs)` : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" /> Dr. {prescription.doctorName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {formattedDate}
                  </span>
                  {prescription.diagnosis && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-[11px] font-medium text-foreground">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      {prescription.diagnosis}
                    </span>
                  )}
                </div>
              </div>

              {/* Header Right Action: Print Full Rx Button */}
              <div className="flex items-center gap-2 shrink-0 pr-6">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => printFull()}
                  className="h-9 px-3.5 text-xs font-bold border-2 border-primary/40 text-primary hover:bg-primary/10 gap-2 shadow-sm transition-all"
                  title="Print complete official medical prescription slip"
                >
                  <Printer className="w-4 h-4" />
                  Print Full Rx Slip
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* 2-Column Clean Layout with Vertical Divider */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border min-h-0 overflow-hidden bg-background">
            
            {/* COLUMN 1: External / Non-Inventory Items */}
            <div className="flex flex-col min-h-0 h-full bg-card">
              {/* Header */}
              <div className="p-3.5 px-5 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  External / Non-Inventory Items
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {externalItems.length}
                </span>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                {externalItems.length === 0 ? (
                  <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                    <p className="font-semibold text-sm text-foreground">No External Medicines</p>
                    <p className="text-xs mt-1">All medications are available in hospital pharmacy inventory.</p>
                  </div>
                ) : (
                  externalItems.map((item) => {
                    const qty = item.dispenseQty || calculateDispenseQuantity(item) || 1;
                    const clinical = formatClinicalSummary(item);

                    return (
                      <div
                        key={item.id}
                        className="py-2.5 px-3 rounded-lg border border-border/70 bg-card hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span className="font-bold text-sm text-foreground truncate">
                              {item.drugName}
                            </span>
                            {clinical && (
                              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                                | {clinical}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border shrink-0">
                            QTY {qty}
                          </span>
                        </div>
                        {clinical && (
                          <div className="text-xs text-muted-foreground mt-0.5 sm:hidden pl-3.5">
                            {clinical}
                          </div>
                        )}
                        {item.instructions && (
                          <div className="text-[11px] text-muted-foreground italic pl-3.5 mt-0.5">
                            {item.instructions}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Column 1 Footer: Print External Prescription */}
              <div className="p-3.5 px-5 border-t border-border bg-card shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => printExternal()}
                  disabled={externalItems.length === 0}
                  className="w-full h-11 text-xs sm:text-sm font-bold border-2 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 gap-2 shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Print External Prescription {externalItems.length > 0 ? `(${externalItems.length})` : ""}
                </Button>
              </div>
            </div>

            {/* COLUMN 2: Hospital Pharmacy & Services */}
            <div className="flex flex-col min-h-0 h-full bg-card">
              {/* Header */}
              <div className="p-3.5 px-5 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Hospital Pharmacy & Services
                </h3>
                {hospitalItems.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllHospital}
                      className="text-primary hover:underline font-bold"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={deselectAllHospital}
                      className="text-muted-foreground hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                )}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                {/* Medicines */}
                {hospitalItems.map((item) => {
                  const isChecked = selectedHospitalIds.has(item.id);
                  const qty = item.dispenseQty || calculateDispenseQuantity(item) || 1;
                  const unitPrice = item.unitPrice ?? item.medicine?.stockBatches?.[0]?.unitPrice ?? 0;
                  const lineTotal = unitPrice * qty;
                  const clinical = formatClinicalSummary(item);

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleHospitalItem(item.id)}
                      className={`py-2.5 px-3 rounded-lg border transition-colors cursor-pointer ${
                        isChecked
                          ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                          : "border-border/60 bg-muted/10 opacity-60 hover:opacity-80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleHospitalItem(item.id)}
                            className="shrink-0"
                          />
                          <span className="font-bold text-sm text-foreground truncate">
                            {item.drugName}
                          </span>
                          {clinical && (
                            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                              | {clinical}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            QTY {qty}
                          </span>
                          <span className="font-mono font-bold text-xs text-foreground min-w-[70px] text-right">
                            LKR {lineTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      {clinical && (
                        <div className="text-xs text-muted-foreground mt-0.5 sm:hidden pl-6">
                          {clinical}
                        </div>
                      )}
                      {item.instructions && (
                        <div className="text-[11px] text-muted-foreground italic pl-6 mt-0.5">
                          {item.instructions}
                        </div>
                      )}
                    </div>
                  );
                })}

                {hospitalItems.length === 0 && (
                  <div className="py-2 px-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground bg-muted/10">
                    No hospital pharmacy medicines prescribed.
                  </div>
                )}

                {/* Doctor Fee */}
                <div className="py-2.5 px-3 rounded-lg border border-border/70 bg-card flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="font-semibold text-sm text-foreground">
                      Doctor Consultation Fee
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      isConsultationPaid ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    }`}>
                      {isConsultationPaid ? "PAID" : "DUE"}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-xs text-foreground">
                    LKR {doctorFee.toFixed(2)}
                  </span>
                </div>

                {/* Lab Tests Fee */}
                {invoiceLabItems.map((li: any, idx: number) => (
                  <div key={`inv-lab-${idx}`} className="py-2.5 px-3 rounded-lg border border-border/70 bg-card flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="font-semibold text-sm text-foreground truncate">
                        Lab Test: {li.description}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-xs text-foreground shrink-0">
                      LKR {Number(li.total).toFixed(2)}
                    </span>
                  </div>
                ))}
                {invoiceLabItems.length === 0 && (prescription.labRequests || []).flatMap((lr, lrIdx) => 
                  (lr.tests || []).map((t, tIdx) => (
                    <div key={`rx-lab-${lrIdx}-${tIdx}`} className="py-2.5 px-3 rounded-lg border border-border/70 bg-card flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="font-semibold text-sm text-foreground truncate">
                          Lab Test: {t}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium shrink-0">Billed at Checkout</span>
                    </div>
                  ))
                )}

                {/* Extra Services Fee */}
                {invoiceServiceItems.map((li: any, idx: number) => (
                  <div key={`inv-svc-${idx}`} className="py-2.5 px-3 rounded-lg border border-border/70 bg-card flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      <span className="font-semibold text-sm text-foreground truncate">
                        Service: {li.description}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-xs text-foreground shrink-0">
                      LKR {Number(li.total).toFixed(2)}
                    </span>
                  </div>
                ))}

                {/* Total Line */}
                <div className="pt-3 mt-2 border-t-2 border-dashed border-border flex items-center justify-between px-1">
                  <span className="font-bold text-base text-foreground">Total</span>
                  <span className="font-mono font-bold text-lg text-primary">
                    LKR {totalHospitalEstimate.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Column 2 Footer: Print Hospital RX & Send To POS */}
              <div className="p-3.5 px-5 border-t border-border bg-card flex items-center gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => printHospital()}
                  disabled={selectedHospitalIds.size === 0}
                  className="flex-1 h-11 text-xs sm:text-sm font-bold border-2 border-primary/40 text-primary hover:bg-primary/10 gap-2 shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Print Hospital RX {selectedHospitalIds.size > 0 ? `(${selectedHospitalIds.size})` : ""}
                </Button>

                <Button
                  type="button"
                  size="lg"
                  onClick={handleSendSelectedToPOS}
                  disabled={isInPos}
                  className="flex-1 h-11 text-sm font-bold bg-primary hover:bg-primary/90 text-white gap-2 shadow-md transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {isInPos ? "Active in POS" : "Send To POS"}
                </Button>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden React-To-Print Templates */}
      <div className="hidden">
        <ExternalPrescriptionReceipt
          ref={externalPrintRef}
          prescriptionId={prescription.id}
          patientName={prescription.patientName}
          patientAge={prescription.patientAge}
          patientPhone={prescription.patientPhone}
          doctorName={prescription.doctorName}
          diagnosis={prescription.diagnosis}
          medicines={externalPrintMedicines}
          date={formattedDate}
          bookingReference={prescription.bookingReference}
        />
        <PrescriptionReceipt
          ref={hospitalPrintRef}
          prescriptionId={prescription.id}
          patientName={prescription.patientName}
          patientAge={prescription.patientAge?.toString() || ""}
          patientPhone={prescription.patientPhone || ""}
          doctorName={prescription.doctorName}
          medicines={hospitalPrintMedicines}
          date={formattedDate}
        />
        <PrescriptionReceipt
          ref={fullPrintRef}
          prescriptionId={prescription.id}
          patientName={prescription.patientName}
          patientAge={prescription.patientAge?.toString() || ""}
          patientPhone={prescription.patientPhone || ""}
          doctorName={prescription.doctorName}
          medicines={fullPrintMedicines}
          date={formattedDate}
        />
      </div>
    </>
  );
}
