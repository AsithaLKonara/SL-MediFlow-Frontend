"use client";

import { useEffect, useState, use, useRef } from "react";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, Plus, Trash2, CheckCircle2, Save, FileText, Activity, User, Beaker, FlaskConical, FilePen, Printer, Loader2, ScanBarcode, FilePlus2, Award } from "lucide-react";
import Link from "next/link";
import { io } from "socket.io-client";
import { useReactToPrint } from "react-to-print";
import { PrescriptionPrintTemplate } from "@/components/printing/PrescriptionPrintTemplate";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/dashboard/SidebarProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateDispenseQuantity } from "@/lib/prescriptionUtils";
import { triggerPrinterAutoCut } from "@/lib/printerAutoCut";
import { LabTestsModal } from "@/components/doctor/LabTestsModal";
import { ExtraServicesModal, SelectedExtraService } from "@/components/doctor/ExtraServicesModal";
import { MedicalCertificateModal, CertificateType } from "@/components/doctor/MedicalCertificateModal";
import {
  PRESCRIPTION_FREQUENCIES,
  PRESCRIPTION_ROUTES,
  DOSE_UNITS,
  getFrequencyLabel,
  getRouteLabel,
  getFrequencyBadgeClass,
  getRouteBadgeClass
} from "@/lib/prescriptionConstants";

const formatSafeDate = (dateStr: string) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
};

interface MedicalHistory {
  date: string;
  doctor: string;
  diagnosis: string;
  prescription: string[];
}

interface LabResult {
  date: string;
  test: string;
  result: string;
  status: string;
}

interface Patient {
  id: string;
  name: string;
  dob: string;
  age: number;
  gender: string;
  contact: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  medicalHistory: MedicalHistory[];
  labResults: LabResult[];
  activeVisitId: string | null;
  activeTokenNumber?: string | null;
  activeVisitStartTime?: string | null;
  bookingReference?: string | null;
  masterBarcode?: string | null;
}



import { useParams, useSearchParams } from "next/navigation";

// Medicines are now fetched from the backend API

export default function ConsultationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const editPrescriptionId = searchParams.get("editPrescriptionId");
  const urlVisitId = searchParams.get("visitId");
  const [activeEditRxId, setActiveEditRxId] = useState<string | null>(editPrescriptionId);
  const patientId = params.patientId as string;
  const { isCollapsed } = useSidebar();
  const { user, token } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitCompleted, setVisitCompleted] = useState(false);
  const [createdPrescription, setCreatedPrescription] = useState<any>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editPatientData, setEditPatientData] = useState({ name: "", contact: "", age: "", gender: "", bloodGroup: "" });
  const [savingPatient, setSavingPatient] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef as any,
    documentTitle: `Prescription_${patientId}`,
    onAfterPrint: () => {
      triggerPrinterAutoCut();
    }
  });

  // Prescription state
  const [diagnosis, setDiagnosis] = useState("");
  const [rxVisitId, setRxVisitId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  
  const initialDrugState = {
    drug: "",
    strength: "",
    dosageAmount: "1",
    doseUnit: "tablet(s)",
    dosage: "",
    frequency: "OD",
    route: "ORAL",
    duration: "3 days",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    instructions: "",
    timing: "",
    medicineId: null as string | null,
    dispenseQty: null as number | null,
    quantity: null as number | null,
    timesPerDay: "",
    tabletsPerTime: ""
  };
  const [addedDrugs, setAddedDrugs] = useState<typeof initialDrugState[]>([]);
  const [currentDrug, setCurrentDrug] = useState(initialDrugState);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [savingDraft, setSavingDraft] = useState(false);
  const [activeDrugSearch, setActiveDrugSearch] = useState(false);

  // Lab request state
  const [selectedTests, setSelectedTests] = useState<any[]>([]);
  const [availableLabTests, setAvailableLabTests] = useState<any[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [labNotes, setLabNotes] = useState("");

  // Consultation Modals & Services
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [isExtraServicesModalOpen, setIsExtraServicesModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [availableExtraServices, setAvailableExtraServices] = useState<any[]>([]);
  const [selectedExtraServices, setSelectedExtraServices] = useState<SelectedExtraService[]>([]);
  const [customDocFee, setCustomDocFee] = useState<number>(2500);

  const [availableMedicines, setAvailableMedicines] = useState<any[]>([]);

  const handleSavePatientDetails = async () => {
    if (!patient) return;
    setSavingPatient(true);
    try {
      const res = await fetch(`/api/doctor/patients/${patientId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: editPatientData.name,
          phone: editPatientData.contact,
          age: editPatientData.age,
          gender: editPatientData.gender,
          bloodGroup: editPatientData.bloodGroup
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setPatient(prev => prev ? { ...prev, name: updated.fullName, contact: updated.phone, age: updated.ageFallback, gender: updated.gender, bloodGroup: updated.bloodGroup } : null);
        setIsEditingPatient(false);
        toast.success("Patient details updated");
      } else {
        toast.error("Failed to update patient details");
      }
    } catch (error) {
      toast.error("Error updating patient");
    } finally {
      setSavingPatient(false);
    }
  };

  useEffect(() => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
    fetch(`/api/doctor/patients/${patientId}`, {
      headers: { Authorization: `Bearer ${activeToken}` }
    })
      .then((r) => r.json())
      .then((d) => { 
        setPatient(d); 
        setEditPatientData({
          name: d.name || "",
          contact: d.contact || "",
          age: d.age?.toString() || "",
          gender: d.gender || "",
          bloodGroup: d.bloodGroup || ""
        });
        setLoading(false); 

        // Auto-update the appointment status to IN_PROGRESS so Customer Display knows the doctor is busy
        if (d.activeVisitId && user?.id) {
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/tokens/status`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
              patientId: patientId,
              doctorId: user.id,
              status: 'IN_PROGRESS'
            })
          }).catch(console.error);
        }

        // Auto-detect if patient already has an active prescription for this specific visit
        const targetVisitId = urlVisitId || d.activeVisitId;
        if (!editPrescriptionId && targetVisitId) {
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions?visitId=${targetVisitId}&patientId=${patientId}`, {
            headers: { Authorization: `Bearer ${activeToken}` }
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((rxList) => {
              const items = Array.isArray(rxList) ? rxList : rxList?.data || [];
              const activeRx = items.find((p: any) => 
                p.patientId === patientId && 
                p.visitId === targetVisitId && 
                p.status !== "DISPENSED" && 
                p.status !== "CANCELLED"
              );
              if (activeRx) {
                setActiveEditRxId(activeRx.id);
                setDiagnosis(activeRx.diagnosis || "");
                setRxVisitId(activeRx.visitId || null);
                setNotes(activeRx.clinicalNotes || "");
                setCreatedPrescription(activeRx);
                toast.info(`Active prescription #${activeRx.id.slice(0, 8)} for this visit loaded for review and update.`);
              }
            })
            .catch(() => {});
        }
      });

    const activeAuthToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/pharmacy/medicines?limit=1000`, {
      headers: { Authorization: `Bearer ${activeAuthToken}` }
    })
      .then((r) => r.json())
      .then((data) => {
        const meds = data.data || data;
        const mappedItems = (Array.isArray(meds) ? meds : []).map((med: any) => {
          const stock = med.stockBatches?.reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0) || 0;
          return { ...med, stock };
        });
        setAvailableMedicines(mappedItems);
      })
      .catch((e) => console.error("Failed to load medicines", e));

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/catalog`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => setAvailableLabTests(Array.isArray(data) ? data : (data.data || [])))
      .catch((e) => console.error("Failed to load lab catalog", e));

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => setAvailableExtraServices(Array.isArray(data) ? data : (data.data || [])))
      .catch((e) => console.error("Failed to load extra services catalog", e));

    if ((user as any)?.consultationFee) {
      setCustomDocFee((user as any).consultationFee);
    }

    const socketUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace('/api', '');
    const socket = io(socketUrl);

    socket.on("connect", () => {
      console.log("Doctor connected to websocket");
    });

    socket.on("lab_result_ready", (data) => {
      if (data.patientId === patientId) {
        toast.info(`New Lab Result Ready for ${data.testName}`, {
          duration: 10000,
          action: { label: "View", onClick: () => window.open(`/labtech/results/${data.requestId}`) }
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [patientId]);

  useEffect(() => {
    const rxIdToLoad = activeEditRxId || editPrescriptionId;
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
    if (rxIdToLoad && activeToken) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${rxIdToLoad}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
        .then(res => res.json())
        .then(rx => {
          if (rx) {
            setDiagnosis(rx.diagnosis || "");
            setRxVisitId(rx.visitId || null);
            setNotes(rx.clinicalNotes || "");
            setCreatedPrescription(rx);
            const parsedDrugs = (rx.items || []).map((item: any) => {
              const freq = (item.frequency || "OD").trim().toUpperCase();
              const route = (item.route || "ORAL").trim().toUpperCase();
              
              const resolvedQty = calculateDispenseQuantity({
                dispenseQty: item.dispenseQty,
                quantity: item.quantity,
                dosageAmount: item.dosageAmount,
                frequency: freq,
                duration: item.duration,
                timesPerDay: item.timesPerDay,
                tabletsPerTime: item.tabletsPerTime
              });

              return {
                drug: item.drugName || item.medicine?.name || "",
                strength: item.strength || "",
                dosageAmount: item.dosageAmount || "1",
                doseUnit: item.doseUnit || "tablet(s)",
                dosage: item.dosage || "",
                frequency: freq,
                route: route,
                duration: item.duration || "3 days",
                startDate: item.startDate ? new Date(item.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                endDate: item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "",
                instructions: item.instructions || "",
                timing: "",
                medicineId: item.medicineId || item.medicine?.id || null,
                dispenseQty: item.dispenseQty || item.quantity || resolvedQty,
                quantity: item.quantity || null,
                timesPerDay: "",
                tabletsPerTime: ""
              };
            });
            setAddedDrugs(parsedDrugs);
          }
        })
        .catch(err => console.error("Failed to load prescription for edit:", err));
    }
  }, [activeEditRxId, editPrescriptionId, token]);

  const handleAddOrUpdateDrug = () => {
    if (!currentDrug.drug.trim()) return toast.error("Medication name is required.");
    
    const computedQty = calculateDispenseQuantity(currentDrug);
    const drugToSave = {
      ...currentDrug,
      dispenseQty: currentDrug.quantity != null ? Number(currentDrug.quantity) : computedQty
    };

    if (editingIndex !== null) {
      setAddedDrugs(prev => prev.map((d, i) => i === editingIndex ? drugToSave : d));
      setEditingIndex(null);
    } else {
      setAddedDrugs(prev => [...prev, drugToSave]);
    }
    setCurrentDrug(initialDrugState);
  };

  const handleEditDrug = (idx: number) => {
    setCurrentDrug(addedDrugs[idx]);
    setEditingIndex(idx);
    document.getElementById('medication-builder')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleRemoveDrug = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setAddedDrugs(prev => prev.filter((_, i) => i !== idx));
    if (editingIndex === idx) {
      setCurrentDrug(initialDrugState);
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > idx) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const updateCurrentDrug = (field: string, value: string) => {
    setCurrentDrug(prev => ({ ...prev, [field]: value }));
  };

  const selectDrug = (medicine: any) => {
    let parsedDosage = medicine.unit || "";
    let finalDrugName = medicine.name;
    let strength = "";

    const strengthMatch = medicine.name.match(/(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu|%))/i);
    if (strengthMatch) {
      strength = strengthMatch[1];
    }

    if (medicine.genericName && medicine.name.toLowerCase().includes(medicine.genericName.toLowerCase())) {
      const extracted = medicine.name.substring(medicine.genericName.length).trim();
      if (extracted) {
        parsedDosage = extracted;
        finalDrugName = medicine.genericName;
      }
    }

    let defaultUnit = "tablet(s)";
    const catOrUnit = `${medicine.category || ""} ${medicine.unit || ""} ${medicine.name || ""}`.toLowerCase();
    if (catOrUnit.includes("syrup") || catOrUnit.includes("susp") || catOrUnit.includes("liquid") || catOrUnit.includes("ml")) {
      defaultUnit = "ml";
    } else if (catOrUnit.includes("cap")) {
      defaultUnit = "capsule(s)";
    } else if (catOrUnit.includes("inj")) {
      defaultUnit = "ml";
    } else if (catOrUnit.includes("drop")) {
      defaultUnit = "drops";
    }

    let defaultRoute = "ORAL";
    if (catOrUnit.includes("iv")) {
      defaultRoute = "IV";
    } else if (catOrUnit.includes("im") || catOrUnit.includes("inj")) {
      defaultRoute = "IM";
    } else if (catOrUnit.includes("supp")) {
      defaultRoute = "SUPPOSITORY";
    }

    setCurrentDrug(prev => ({
      ...prev,
      drug: finalDrugName,
      strength: strength || prev.strength,
      dosage: parsedDosage || prev.dosage,
      doseUnit: defaultUnit,
      route: defaultRoute,
      medicineId: medicine.id
    }));
    setActiveDrugSearch(false);
    
    if (medicine.stock === 0) {
      toast.warning(`${medicine.name} is currently OUT OF STOCK in the pharmacy.`, { duration: 5000 });
    }
  };

  const toggleTest = (test: any) =>
    setSelectedTests((prev) =>
      prev.some(t => t.id === test.id) ? prev.filter((t) => t.id !== test.id) : [...prev, test]
    );

  const handleSaveCertificateAsOrder = async (certData: any) => {
    try {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
      const finalVisitId = urlVisitId || patient?.activeVisitId || rxVisitId || createdPrescription?.visitId || patient?.id;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          orders: [{
            patientId: patient?.id,
            doctorId: user?.id,
            visitId: finalVisitId,
            customPrice: certData.customPrice,
            certificateType: certData.certificateType,
            certificateData: certData.certificateData,
            notes: certData.notes
          }]
        })
      });
      if (res.ok) {
        toast.success("Medical Certificate saved and added to billing!");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to record certificate order");
      }
    } catch (err) {
      toast.error("Failed to save certificate order");
    }
  };

  const savePrescription = async (navigateNext: boolean = false) => {
    const finalVisitId = urlVisitId || patient?.activeVisitId || rxVisitId || createdPrescription?.visitId;
    if (!finalVisitId) {
      toast.error("No active visit found for this patient.");
      return;
    }
    if (!user?.id) {
      toast.error("Doctor profile not found.");
      return;
    }

    try {
      if (navigateNext) {
        setIsCompleting(true);
      } else {
        setSavingDraft(true);
      }

      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");

      const payload = {
        patientId: patient?.id,
        patientName: patient?.name,
        visitId: finalVisitId,
        doctorId: user.id,
        doctorName: user.fullName || "Doctor",
        diagnosis,
        clinicalNotes: notes,
        customConsultationFee: customDocFee ? Number(customDocFee) : undefined,
        items: addedDrugs.map(d => {
          const dispenseQty = calculateDispenseQuantity(d);
          const resolvedMedId = d.medicineId || availableMedicines.find(m => m.name === d.drug || m.genericName === d.drug)?.id || null;

          const mealTiming = d.timing === "before" ? "Before meals" : d.timing === "after" ? "After meals" : "";
          const combinedInstructions = [mealTiming, d.instructions?.trim()].filter(Boolean).join(" • ");

          return {
            medicineId: resolvedMedId,
            drugName: d.drug,
            strength: d.strength || null,
            dosageAmount: d.dosageAmount || null,
            doseUnit: d.doseUnit || null,
            dosage: d.dosage || (d.dosageAmount && d.doseUnit ? `${d.dosageAmount} ${d.doseUnit}` : (d.dosageAmount || "")),
            frequency: d.frequency || "OD",
            route: d.route || "ORAL",
            duration: d.duration || null,
            startDate: d.startDate ? new Date(d.startDate).toISOString() : null,
            endDate: d.endDate ? new Date(d.endDate).toISOString() : null,
            instructions: combinedInstructions || null,
            quantity: d.quantity != null ? Number(d.quantity) : dispenseQty,
            dispenseQty
          };
        })
      };

      const targetRxId = activeEditRxId || editPrescriptionId || createdPrescription?.id;
      const method = targetRxId ? "PUT" : "POST";
      const url = targetRxId 
        ? `${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${targetRxId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/prescriptions`;

      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const rx = await res.json();
        setCreatedPrescription(rx);
        setActiveEditRxId(rx.id);
        toast.success(targetRxId ? "Prescription updated and sent to pharmacy." : "Prescription completed and sent to pharmacy.");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to save prescription.");
        return;
      }
    } catch (e) {
      console.error("Failed to save prescription", e);
      toast.error("Failed to save prescription.");
      return;
    } finally {
      setIsCompleting(false);
      setSavingDraft(false);
    }
    
    if (selectedTests.length > 0) {
      try {
        const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
        const labRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/requests`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`
          },
          body: JSON.stringify({
            patientId: patient?.id,
            visitId: finalVisitId,
            testIds: selectedTests.map(t => t.id),
            doctorId: user.id,
            priority: isUrgent ? "URGENT" : "ROUTINE"
          })
        });
        if (labRes.ok) {
          toast.success("Lab orders forwarded to Laboratory.");
          setSelectedTests([]);
        } else {
          const labErr = await labRes.json().catch(() => ({}));
          toast.error(labErr.error || "Failed to send lab requests.");
        }
      } catch (e) {
        console.error("Failed to send lab requests", e);
      }
    }

    if (selectedExtraServices.length > 0) {
      try {
        const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
        const extraRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`
          },
          body: JSON.stringify({
            orders: selectedExtraServices.map(s => ({
              serviceId: s.id,
              patientId: patient?.id,
              doctorId: user.id,
              visitId: finalVisitId,
              customPrice: s.customPrice,
              notes: s.notes
            }))
          })
        });
        if (extraRes.ok) {
          toast.success("Extra services ordered successfully.");
          setSelectedExtraServices([]);
        } else {
          const extraErr = await extraRes.json().catch(() => ({}));
          toast.error(extraErr.error || "Failed to send extra services.");
        }
      } catch (e) {
        console.error("Failed to send extra services", e);
      }
    }

    if (navigateNext) {
      // Update Token Status if completing consultation
      try {
        const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tokens/status`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`
          },
          body: JSON.stringify({
            patientId: patient?.id,
            doctorId: user.id,
            status: "COMPLETED"
          })
        });
      } catch (e) {
        console.error("Failed to update token status", e);
      }

      setVisitCompleted(true);
      setTimeout(() => {
        window.location.href = "/doctor/queue";
      }, 1000);
    }
  };

  if (loading || !patient) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const leftMargin = isCollapsed ? "left-[80px]" : "left-64";

  return (
    <div className="pb-32 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* 1. TOP COMMAND BAR */}
      <div className="bg-card text-card-foreground border rounded-lg shadow-sm px-6 py-5 mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex gap-4 w-full md:w-auto flex-1">
            <Link href="/doctor/queue" className="shrink-0">
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10 mt-1">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1 space-y-5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 flex items-center gap-1.5 border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Active Consultation
                </span>
                {patient?.activeTokenNumber && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Token: {patient.activeTokenNumber}
                  </span>
                )}
                {(patient?.masterBarcode || patient?.bookingReference) && (
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 shadow-sm">
                    <ScanBarcode className="w-3.5 h-3.5" />
                    <span>Barcode: {patient.masterBarcode || patient.bookingReference}</span>
                  </span>
                )}

                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsLabModalOpen(true)}
                    className="h-7 gap-1 text-xs border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
                    Lab Tests {selectedTests.length > 0 && `(${selectedTests.length})`}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsExtraServicesModalOpen(true)}
                    className="h-7 gap-1 text-xs border-purple-200 text-purple-700 bg-purple-50/60 hover:bg-purple-100"
                  >
                    <FilePlus2 className="w-3.5 h-3.5 text-purple-600" />
                    Extra Services {selectedExtraServices.length > 0 && `(${selectedExtraServices.length})`}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCertificateModalOpen(true)}
                    className="h-7 gap-1 text-xs border-emerald-200 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    Certificate
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Patient Name</label>
                  <Input 
                    value={editPatientData.name} 
                    onChange={e => setEditPatientData(prev => ({...prev, name: e.target.value}))} 
                    className="h-9 text-sm font-bold border-transparent bg-muted/30 hover:border-input focus:border-input focus:bg-background transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Contact Number</label>
                  <Input 
                    value={editPatientData.contact} 
                    onChange={e => setEditPatientData(prev => ({...prev, contact: e.target.value}))} 
                    className="h-9 text-sm font-medium border-transparent bg-muted/30 hover:border-input focus:border-input focus:bg-background transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Age & Gender</label>
                  <div className="flex gap-2">
                    <Input 
                      value={editPatientData.age} 
                      onChange={e => setEditPatientData(prev => ({...prev, age: e.target.value}))} 
                      placeholder="Age"
                      className="h-9 w-16 text-sm font-medium border-transparent bg-muted/30 hover:border-input focus:border-input focus:bg-background transition-colors"
                    />
                    <select 
                      value={editPatientData.gender}
                      onChange={e => setEditPatientData(prev => ({...prev, gender: e.target.value}))}
                      className="h-9 flex-1 text-sm font-medium rounded-md border border-transparent bg-muted/30 px-2 outline-none hover:border-input focus:border-input focus:bg-background transition-colors cursor-pointer"
                    >
                      <option value="">Gender</option>
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                      <option value="OTHER">OTHER</option>
                      <option value="UNKNOWN">UNKNOWN</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Blood Group</label>
                  <div className="flex gap-2 items-center">
                    <select 
                      value={editPatientData.bloodGroup} 
                      onChange={e => setEditPatientData(prev => ({...prev, bloodGroup: e.target.value}))} 
                      className="h-9 flex-1 text-sm font-bold text-red-500 rounded-md border border-transparent bg-muted/30 px-2 outline-none hover:border-input focus:border-input focus:bg-background transition-colors cursor-pointer"
                    >
                      <option value="">Unknown</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                    <Button 
                      size="sm" 
                      onClick={handleSavePatientDetails} 
                      disabled={savingPatient || (
                        patient?.name === editPatientData.name && 
                        patient?.contact === editPatientData.contact && 
                        patient?.age?.toString() === editPatientData.age && 
                        patient?.gender === editPatientData.gender && 
                        patient?.bloodGroup === editPatientData.bloodGroup
                      )}
                      className="h-9 px-4 shrink-0 transition-opacity"
                    >
                      {savingPatient ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex flex-col items-end text-right text-sm shrink-0 border-l border-border pl-6 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Token Number</p>
            <p className="text-2xl font-black text-foreground tracking-tight">{patient.activeTokenNumber ? `Token #${patient.activeTokenNumber}` : "--"}</p>
            <div className="mt-2 flex items-center gap-1.5 bg-primary/5 border border-primary/20 px-2 py-1 rounded">
              <span className="text-[10px] uppercase font-bold text-primary">OPD Fee: Rs.</span>
              <Input
                type="number"
                min="0"
                value={customDocFee}
                onChange={e => setCustomDocFee(parseFloat(e.target.value) || 0)}
                className="h-6 w-20 text-right text-xs font-bold bg-background p-1"
              />
            </div>
            <p className="font-medium text-muted-foreground text-xs mt-2">{patient.activeVisitStartTime ? `Started ${new Date(patient.activeVisitStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Colombo'})}` : "Started --:--"}</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-1 opacity-50" title={patient.id}>ID: {patient.id ? patient.id.substring(0,8) : "N/A"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: PATIENT CONTEXT                              */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* CRITICAL ALERTS */}
          {(patient.allergies?.length > 0 || patient.chronicConditions?.length > 0) && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Critical Alerts
              </h3>
              
              {patient.allergies?.length > 0 && (
                <div className="bg-red-500/10 border-l-4 border-red-500 p-3 rounded-r-md">
                  <p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 tracking-wider mb-1">Allergies</p>
                  <p className="text-sm font-semibold text-red-900">{patient.allergies.join(", ")}</p>
                </div>
              )}

              {patient.chronicConditions?.length > 0 && (
                <div className="bg-amber-500/10 border-l-4 border-amber-500 p-3 rounded-r-md">
                  <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider mb-1">Conditions</p>
                  <p className="text-sm font-semibold text-amber-900">{patient.chronicConditions.join(", ")}</p>
                </div>
              )}
            </div>
          )}



          {/* LAB ORDERS */}
          <div className="bg-card text-card-foreground border rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5" /> Laboratory Orders
            </h3>
            
            <div className="flex flex-col gap-2">
              {availableLabTests.map((test) => {
                const isSelected = selectedTests.some(t => t.id === test.id);
                return (
                  <label
                    key={test.id}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-md border cursor-pointer transition-all",
                      isSelected ? "bg-blue-500/10 border-blue-500/20" : "bg-card text-card-foreground border-border/50 hover:bg-muted/30"
                    )}
                    onClick={(e) => { e.preventDefault(); toggleTest(test); }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "bg-primary border-blue-600 text-white" : "border-border bg-card text-card-foreground"
                      )}>
                        {isSelected && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <div>
                        <span className={cn("text-xs font-bold block", isSelected ? "text-blue-600 dark:text-blue-400" : "text-foreground/80")}>
                          {test.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase">{test.category}</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">LKR {test.price.toFixed(2)}</span>
                  </label>
                );
              })}
            </div>

            {selectedTests.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isUrgent} 
                    onChange={e => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-red-600 focus:ring-red-600 focus:ring-offset-background"
                  />
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    Mark Lab Request as URGENT
                  </span>
                </label>
              </div>
            )}
          </div>

        </div>


        {/* ========================================================= */}
        {/* RIGHT COLUMN: CLINICAL WORKSPACE                          */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* DIAGNOSIS */}
          <div className="bg-card text-card-foreground border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/90 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground/70" /> Assessment / Diagnosis
            </h2>
            <Input
              placeholder="Enter primary diagnosis or chief complaint..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="text-lg py-6 bg-muted/30 border-border focus-visible:ring-primary/20"
            />
          </div>

          {/* PRESCRIPTION BUILDER */}
          <div id="medication-builder" className="bg-card text-card-foreground border border-border rounded-lg p-6 shadow-sm">
            {/* CONTINUATION CONSULTATION BANNER */}
            {(activeEditRxId || editPrescriptionId) && (
              <div className="mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 p-3.5 rounded-lg flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2.5">
                  <FilePen className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <span>Resuming Consultation</span>
                      <span className="font-mono text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        Rx #{((activeEditRxId || editPrescriptionId) as string).slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Previous prescription items and clinical notes have been loaded for review following lab investigations. Adjust medications as needed and click Complete to update.
                    </p>
                  </div>
                </div>
                <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-2 py-1 rounded text-[10px] tracking-wider uppercase shrink-0">
                  Edit Mode
                </span>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/90 flex items-center gap-2">
                <Beaker className="w-4 h-4 text-muted-foreground/70" /> Medications
              </h2>
            </div>

            <div className="space-y-4">
              {/* Single Input Block */}
              <div className="relative bg-muted/30 border border-border rounded-lg p-4 group">
                <div className="absolute -left-3 -top-3 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                  {editingIndex !== null ? <FilePen className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                </div>
                
                <div className="space-y-4 ml-1">
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Medication Name</label>
                      <Input
                        placeholder="Search or enter drug name (e.g. Amlodipine)"
                        value={currentDrug.drug}
                        onChange={(e) => {
                          updateCurrentDrug("drug", e.target.value);
                          setActiveDrugSearch(true);
                        }}
                        onFocus={() => setActiveDrugSearch(true)}
                        onBlur={() => setTimeout(() => setActiveDrugSearch(false), 250)}
                        className="font-medium bg-card text-card-foreground border-border"
                      />
                      {activeDrugSearch && currentDrug.drug.trim().length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card text-card-foreground border border-border rounded-md shadow-lg max-h-56 overflow-y-auto">
                          {(() => {
                            const q = currentDrug.drug.trim().toLowerCase();
                            const matches = availableMedicines.filter((m) =>
                              (m.name && m.name.toLowerCase().includes(q)) ||
                              (m.genericName && m.genericName.toLowerCase().includes(q)) ||
                              (m.category && m.category.toLowerCase().includes(q))
                            );
                            if (matches.length === 0) {
                              return (
                                <div className="px-4 py-3 text-sm text-muted-foreground">
                                  <p className="font-medium">No pharmacy catalog matches found.</p>
                                  <p className="text-xs text-muted-foreground/80 mt-0.5">Press tab or continue typing to prescribe as an external medication.</p>
                                </div>
                              );
                            }
                            return matches.map((m, i) => {
                              const isOutOfStock = m.stock === 0;
                              const isLowStock = m.stock > 0 && m.stock <= (m.reorderLevel || 10);
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  className={cn(
                                    "w-full text-left px-4 py-2.5 text-sm hover:bg-muted/40 focus:bg-muted/40 focus:outline-none flex justify-between items-center border-b border-border/40 last:border-b-0 transition-colors",
                                    isOutOfStock && "bg-red-500/5 hover:bg-red-500/10"
                                  )}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    selectDrug(m);
                                  }}
                                >
                                  <div>
                                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                                      <span>{m.name}</span>
                                      {m.genericName && m.genericName.toLowerCase() !== m.name.toLowerCase() && (
                                        <span className="text-xs font-normal text-muted-foreground">({m.genericName})</span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.category}</span>
                                  </div>
                                  <div className="text-right shrink-0 ml-3">
                                    <span className="block text-muted-foreground text-xs">{m.unit}</span>
                                    {isOutOfStock ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                                        <AlertTriangle className="w-3 h-3" /> OUT OF STOCK
                                      </span>
                                    ) : isLowStock ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                        ⚠️ {m.stock} LOW STOCK
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30">
                                        ✓ {m.stock} IN STOCK
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            });
                          })()}
                        </div>
                      )}

                      {/* Persistent Stock Alert Banners for Selected/Typed Medication */}
                      {(() => {
                        const med = availableMedicines.find((m) =>
                          (currentDrug.medicineId && m.id === currentDrug.medicineId) ||
                          m.name.toLowerCase() === currentDrug.drug.trim().toLowerCase() ||
                          (m.genericName && m.genericName.toLowerCase() === currentDrug.drug.trim().toLowerCase())
                        );
                        if (!currentDrug.drug.trim()) return null;

                        if (med && med.stock === 0) {
                          return (
                            <div className="mt-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-300 flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-top-1">
                              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold uppercase tracking-wider text-red-600 dark:text-red-400">OUT OF STOCK IN HOSPITAL PHARMACY</span>
                                <p className="mt-0.5">
                                  <strong>{med.name}</strong> currently has <strong>0 units</strong> in stock. You can still prescribe it for outside pharmacy dispensing, but it cannot be dispensed by the hospital pharmacy.
                                </p>
                              </div>
                            </div>
                          );
                        }

                        if (med && med.stock > 0 && med.stock <= (med.reorderLevel || 10)) {
                          return (
                            <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center gap-2 text-xs">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span><strong>Low Stock Warning:</strong> Only <strong>{med.stock} units</strong> remaining in hospital pharmacy.</span>
                            </div>
                          );
                        }

                        if (med && med.stock > (med.reorderLevel || 10)) {
                          return (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>In Stock: <strong>{med.stock} units</strong> available in pharmacy.</span>
                            </div>
                          );
                        }

                        if (!med && currentDrug.drug.trim().length > 1) {
                          return (
                            <div className="mt-2 p-2 rounded-lg bg-muted border border-border text-muted-foreground flex items-center gap-2 text-xs">
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span><strong>External / Non-Catalog Medicine:</strong> Not listed in hospital inventory. Patient will purchase externally.</span>
                            </div>
                          );
                        }

                        return null;
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                    <div className="md:col-span-3">
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Strength</label>
                      <Input
                        placeholder="e.g. 500mg, 10mg"
                        value={currentDrug.strength}
                        onChange={(e) => updateCurrentDrug("strength", e.target.value)}
                        className="bg-card text-card-foreground border-border text-sm"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Route of Admin</label>
                      <select
                        value={currentDrug.route}
                        onChange={(e) => updateCurrentDrug("route", e.target.value)}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {PRESCRIPTION_ROUTES.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Frequency</label>
                      <select
                        value={currentDrug.frequency}
                        onChange={(e) => updateCurrentDrug("frequency", e.target.value)}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                      >
                        {PRESCRIPTION_FREQUENCIES.map((f) => (
                          <option key={f.code} value={f.code}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Dose Amount & Unit</label>
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="e.g. 1"
                          value={currentDrug.dosageAmount}
                          onChange={(e) => updateCurrentDrug("dosageAmount", e.target.value)}
                          className="bg-card text-card-foreground border-border w-16 text-center text-sm font-semibold"
                        />
                        <select
                          value={currentDrug.doseUnit}
                          onChange={(e) => updateCurrentDrug("doseUnit", e.target.value)}
                          className="flex h-9 flex-1 items-center justify-between rounded-md border border-input bg-card px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {DOSE_UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                    <div className="md:col-span-3">
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Duration</label>
                      <Input
                        placeholder="e.g. 3 days, 1 month"
                        value={currentDrug.duration}
                        onChange={(e) => updateCurrentDrug("duration", e.target.value)}
                        className="bg-card text-card-foreground border-border text-sm"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Start Date</label>
                      <Input
                        type="date"
                        value={currentDrug.startDate}
                        onChange={(e) => updateCurrentDrug("startDate", e.target.value)}
                        className="bg-card text-card-foreground border-border text-sm"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">
                        Calculated Qty
                        {currentDrug.frequency === "STAT" && (
                          <span className="text-[10px] text-rose-500 ml-1 font-semibold">(Immediate dose)</span>
                        )}
                      </label>
                      <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/40">
                        <span className="font-mono font-bold text-primary text-sm">
                          {calculateDispenseQuantity(currentDrug)}
                        </span>
                        <span className="text-xs text-muted-foreground">units</span>
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Override Qty (Optional)</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Auto"
                        value={currentDrug.quantity ?? ""}
                        onChange={(e) => updateCurrentDrug("quantity", e.target.value ? e.target.value : "")}
                        className="bg-card text-card-foreground border-border text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between pt-1">
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-end gap-4">
                      <div className="flex-1">
                        <label className="block text-[11px] uppercase font-bold text-muted-foreground mb-1.5">Patient Instructions</label>
                        <Input
                          placeholder="e.g. Take with plenty of water after food"
                          value={currentDrug.instructions}
                          onChange={(e) => updateCurrentDrug("instructions", e.target.value)}
                          className="bg-card text-card-foreground border-border text-sm italic"
                        />
                      </div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <button
                          type="button"
                          onClick={() => updateCurrentDrug("timing", currentDrug.timing === "before" ? "" : "before")}
                          className={cn(
                            "px-3 py-2 rounded-md text-xs font-medium border transition-colors",
                            currentDrug.timing === "before" ? "bg-primary text-white border-slate-800" : "bg-card text-card-foreground border-border text-muted-foreground hover:bg-muted/30"
                          )}
                        >
                          Before Meals
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCurrentDrug("timing", currentDrug.timing === "after" ? "" : "after")}
                          className={cn(
                            "px-3 py-2 rounded-md text-xs font-medium border transition-colors",
                            currentDrug.timing === "after" ? "bg-primary text-white border-slate-800" : "bg-card text-card-foreground border-border text-muted-foreground hover:bg-muted/30"
                          )}
                        >
                          After Meals
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {editingIndex !== null && (
                        <Button type="button" variant="ghost" onClick={() => { setCurrentDrug(initialDrugState); setEditingIndex(null); }} className="h-10 text-muted-foreground">
                          Cancel
                        </Button>
                      )}
                      <Button type="button" onClick={handleAddOrUpdateDrug} className="h-10 min-w-[120px]">
                        {editingIndex !== null ? "Update Medicine" : "Add to Prescription"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              {addedDrugs.length > 0 && (
                <div className="mt-6 border border-border rounded-lg overflow-hidden bg-card shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[40px] text-center">#</TableHead>
                        <TableHead>Medication & Strength</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Dose & Frequency</TableHead>
                        <TableHead>Duration / Start</TableHead>
                        <TableHead>Instructions</TableHead>
                        <TableHead className="text-center">Total Qty</TableHead>
                        <TableHead className="w-[60px] text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {addedDrugs.map((d, i) => (
                        <TableRow 
                          key={i} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleEditDrug(i)}
                        >
                          <TableCell className="text-center font-medium text-muted-foreground">{i + 1}</TableCell>
                          <TableCell>
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              <span>{d.drug}</span>
                              {d.strength && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-normal text-muted-foreground border">
                                  {d.strength}
                                </span>
                              )}
                            </div>
                            <div className="mt-1">
                              {(() => {
                                const medItem = availableMedicines.find(
                                  (m) => (d.medicineId && m.id === d.medicineId) ||
                                         m.name.toLowerCase() === d.drug.trim().toLowerCase() ||
                                         (m.genericName && m.genericName.toLowerCase() === d.drug.trim().toLowerCase())
                                );
                                if (!medItem) {
                                  return (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 whitespace-nowrap">
                                      External Item
                                    </span>
                                  );
                                }
                                if (medItem.stock === 0) {
                                  return (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 inline-flex items-center gap-1 whitespace-nowrap">
                                      <AlertTriangle className="w-2.5 h-2.5" /> Out of Stock
                                    </span>
                                  );
                                }
                                if (medItem.stock <= (medItem.reorderLevel || 10)) {
                                  return (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                                      Low Stock ({medItem.stock})
                                    </span>
                                  );
                                }
                                return (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 whitespace-nowrap">
                                    In Stock ({medItem.stock})
                                  </span>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium inline-block", getRouteBadgeClass(d.route))}>
                              {getRouteLabel(d.route)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-xs text-foreground">
                              {d.dosageAmount} {d.doseUnit}
                            </div>
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold mt-1 inline-block", getFrequencyBadgeClass(d.frequency))}>
                              {getFrequencyLabel(d.frequency)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div>{d.duration || "-"}</div>
                            {d.startDate && (
                              <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                                From: {d.startDate}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                            {d.instructions || d.timing ? (
                              <span>
                                {d.timing ? `${d.timing === "before" ? "Before meals" : "After meals"} • ` : ""}
                                {d.instructions}
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-center font-bold text-foreground">
                            <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-mono">
                              {d.quantity != null ? d.quantity : calculateDispenseQuantity(d)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleRemoveDrug(e, i)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Prescription Out-of-Stock Summary Banner */}
              {(() => {
                const outOfStockItems = addedDrugs.filter(d => {
                  const m = availableMedicines.find(med =>
                    (d.medicineId && med.id === d.medicineId) ||
                    med.name.toLowerCase() === d.drug.trim().toLowerCase() ||
                    (med.genericName && med.genericName.toLowerCase() === d.drug.trim().toLowerCase())
                  );
                  return m && m.stock === 0;
                });
                if (outOfStockItems.length === 0) return null;
                return (
                  <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Prescription Inventory Alert:</span>{" "}
                      <span>{outOfStockItems.length} medication(s) ({outOfStockItems.map(d => d.drug).join(", ")}) are out of stock in the hospital pharmacy and cannot be dispensed internally.</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>



          {/* CLINICAL NOTES */}
          <div className="bg-card text-card-foreground border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/90 mb-4 flex items-center gap-2">
              <FilePen className="w-4 h-4 text-muted-foreground/70" /> Private Clinical Notes
            </h2>
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              placeholder="Enter private observations, follow-up plans, or internal notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* STICKY BOTTOM ACTION BAR                                  */}
      {/* ========================================================= */}
      <div className={cn("fixed bottom-0 right-0 border-t border-border/40 bg-background/80 backdrop-blur-md z-40 p-4 transition-all duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]", leftMargin)}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-sm font-medium text-muted-foreground">Consultation in progress...</span>
          </div>
          <div className="flex items-center gap-4">
            {createdPrescription && (
              <Button 
                variant="outline"
                className="border-primary text-primary"
                onClick={() => handlePrint()}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Rx Token
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => savePrescription(false)}
              disabled={savingDraft || isCompleting}
              className="bg-card text-card-foreground min-w-[120px]"
              data-testid="save-prescription-btn"
            >
              {savingDraft ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save</>}
            </Button>
            <Button 
              size="lg" 
              onClick={() => savePrescription(true)}
              disabled={isCompleting || savingDraft}
              className="bg-primary hover:bg-primary text-white min-w-[180px]"
              data-testid="next-patient-btn"
            >
              {isCompleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><CheckCircle2 className="w-5 h-5 mr-2" /> Next Patient</>}
            </Button>
          </div>
        </div>
      </div>
      
      <PrescriptionPrintTemplate ref={printRef} prescription={createdPrescription} />

      <LabTestsModal
        isOpen={isLabModalOpen}
        onClose={() => setIsLabModalOpen(false)}
        availableTests={availableLabTests}
        selectedTests={selectedTests}
        onSave={(tests, urgent, notes) => {
          setSelectedTests(tests);
          setIsUrgent(urgent);
          setLabNotes(notes);
        }}
        initialUrgent={isUrgent}
        initialNotes={labNotes}
      />

      <ExtraServicesModal
        isOpen={isExtraServicesModalOpen}
        onClose={() => setIsExtraServicesModalOpen(false)}
        availableServices={availableExtraServices}
        selectedServices={selectedExtraServices}
        onSave={(services) => {
          setSelectedExtraServices(services);
        }}
      />

      <MedicalCertificateModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        patient={patient ? {
          id: patient.id,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          contact: patient.contact,
          activeVisitId: patient.activeVisitId
        } : null}
        doctor={user ? {
          id: user.id,
          fullName: user.fullName,
          specialty: (user as any).specialty
        } : null}
        onSaveAsOrder={handleSaveCertificateAsOrder}
      />
    </div>
  );
}
