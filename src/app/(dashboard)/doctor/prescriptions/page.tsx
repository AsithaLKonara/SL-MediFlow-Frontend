"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  FileText,
  Printer,
  Search,
  Loader2,
  Edit,
  Trash2,
  Calendar,
  Filter,
  Plus,
  Pill,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  RefreshCw,
  Copy,
  Check
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useReactToPrint } from "react-to-print";
import { PrescriptionPrintTemplate } from "@/components/printing/PrescriptionPrintTemplate";
import { triggerPrinterAutoCut } from "@/lib/printerAutoCut";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  PRESCRIPTION_FREQUENCIES,
  PRESCRIPTION_ROUTES,
  DOSE_UNITS,
  getFrequencyLabel,
  getRouteLabel,
  getFrequencyBadgeClass,
  getRouteBadgeClass
} from "@/lib/prescriptionConstants";
import { calculateDispenseQuantity } from "@/lib/prescriptionUtils";

interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicineId?: string | null;
  drugName: string;
  strength?: string | null;
  dosageAmount?: string | null;
  doseUnit?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  route?: string | null;
  duration?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  instructions?: string | null;
  quantity?: number | null;
  dispenseQty: number;
  status: string;
  medicine?: {
    id: string;
    name: string;
    stockBatches?: any[];
  } | null;
}

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string | null;
  doctorId: string;
  doctorName: string;
  visitId?: string | null;
  bookingReference?: string | null;
  diagnosis?: string | null;
  clinicalNotes?: string | null;
  status: string;
  createdAt: string;
  items: PrescriptionItem[];
}

export default function PrescriptionDashboardPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [medicineFilter, setMedicineFilter] = useState("");

  // Print support
  const [selectedRxForPrint, setSelectedRxForPrint] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Expanded prescription cards state (all expanded by default for readability)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Pharmacy catalog for autocomplete
  const [catalogMedicines, setCatalogMedicines] = useState<any[]>([]);

  // Item Modal state (Add / Edit)
  const [activeModal, setActiveModal] = useState<"ADD" | "EDIT" | null>(null);
  const [targetRx, setTargetRx] = useState<Prescription | null>(null);
  const [editingItem, setEditingItem] = useState<PrescriptionItem | null>(null);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [itemValidationError, setItemValidationError] = useState<string | null>(null);

  // Form fields for modal
  const [itemForm, setItemForm] = useState({
    drugName: "",
    strength: "",
    dosageAmount: "1",
    doseUnit: "tablet(s)",
    frequency: "OD",
    route: "ORAL",
    duration: "3 days",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    instructions: "",
    quantity: "" as string | number,
    medicineId: null as string | null
  });
  const [drugSearchOpen, setDrugSearchOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPrescriptions = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
      const url = user?.id
        ? `${process.env.NEXT_PUBLIC_API_URL}/prescriptions?doctorId=${user.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/prescriptions`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setPrescriptions(data);
        // Expand all by default
        const initExpand: Record<string, boolean> = {};
        data.forEach(rx => {
          initExpand[rx.id] = true;
        });
        setExpandedCards(initExpand);
      } else {
        const errorMsg = data?.error || "Failed to load prescriptions from server.";
        setFetchError(errorMsg);
        toast.error(errorMsg);
        setPrescriptions([]);
      }
    } catch (e: any) {
      console.error("Failed to load prescriptions", e);
      const msg = e?.message || "Network error loading prescriptions";
      setFetchError(msg);
      toast.error(msg);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();

    // Fetch catalog medicines for item addition
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/pharmacy/medicines?limit=1000`, {
      headers: { Authorization: `Bearer ${activeToken}` }
    })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : d.data || [];
        setCatalogMedicines(list);
      })
      .catch(err => console.error("Catalog fetch error:", err));
  }, [user]);

  const handlePrint = useReactToPrint({
    contentRef: printRef as any,
    documentTitle: `Prescription_${selectedRxForPrint?.patientName || 'Record'}`,
    onAfterPrint: () => {
      triggerPrinterAutoCut();
    }
  });

  const handlePrintClick = (rx: any) => {
    setSelectedRxForPrint(rx);
    setTimeout(() => {
      handlePrint();
    }, 150);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("Prescription ID copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (rxId: string) => {
    setExpandedCards(prev => ({ ...prev, [rxId]: !prev[rxId] }));
  };

  const handleConsultationRedirect = (rx: Prescription) => {
    if (rx.status === "DISPENSED") {
      toast.error("Cannot edit a prescription that has already been dispensed.");
      return;
    }
    const patientParam = rx.patientId;
    if (!patientParam) {
      toast.error("Patient profile not linked to this prescription.");
      return;
    }
    const query = new URLSearchParams();
    query.set("editPrescriptionId", rx.id);
    if (rx.visitId) query.set("visitId", rx.visitId);
    router.push(`/doctor/consultation/${patientParam}?${query.toString()}`);
  };

  const handleDeletePrescription = async (rx: Prescription) => {
    if (rx.status === "DISPENSED") {
      toast.error("Cannot delete a prescription that has already been dispensed.");
      return;
    }

    if (window.confirm(`Are you sure you want to delete the prescription for ${rx.patientName}? This action cannot be undone.`)) {
      try {
        const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${rx.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        if (res.ok) {
          toast.success("Prescription deleted successfully");
          setPrescriptions(prev => prev.filter(p => p.id !== rx.id));
        } else {
          const data = await res.json();
          toast.error(data.error || "Failed to delete prescription");
        }
      } catch {
        toast.error("An error occurred while deleting prescription");
      }
    }
  };

  // Open modal to add medicine
  const handleOpenAddModal = (rx: Prescription) => {
    if (rx.status === "DISPENSED") {
      toast.error("Cannot add medicines to an already dispensed prescription.");
      return;
    }
    setTargetRx(rx);
    setEditingItem(null);
    setItemForm({
      drugName: "",
      strength: "",
      dosageAmount: "1",
      doseUnit: "tablet(s)",
      frequency: "OD",
      route: "ORAL",
      duration: "3 days",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      instructions: "",
      quantity: "",
      medicineId: null
    });
    setItemValidationError(null);
    setActiveModal("ADD");
  };

  // Open modal to edit single medicine item
  const handleOpenEditModal = (rx: Prescription, item: PrescriptionItem) => {
    if (rx.status === "DISPENSED") {
      toast.error("Cannot edit medicines on an already dispensed prescription.");
      return;
    }
    setTargetRx(rx);
    setEditingItem(item);
    setItemForm({
      drugName: item.drugName,
      strength: item.strength || "",
      dosageAmount: item.dosageAmount || "1",
      doseUnit: item.doseUnit || "tablet(s)",
      frequency: item.frequency || "OD",
      route: item.route || "ORAL",
      duration: item.duration || "3 days",
      startDate: item.startDate ? new Date(item.startDate).toISOString().split("T")[0] : "",
      endDate: item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "",
      instructions: item.instructions || "",
      quantity: item.quantity != null ? String(item.quantity) : (item.dispenseQty != null ? String(item.dispenseQty) : ""),
      medicineId: item.medicineId || null
    });
    setItemValidationError(null);
    setActiveModal("EDIT");
  };

  // Delete single medicine item
  const handleDeleteItem = async (rx: Prescription, item: PrescriptionItem) => {
    if (rx.status === "DISPENSED") {
      toast.error("Cannot remove medicines from a dispensed prescription.");
      return;
    }

    if (window.confirm(`Remove ${item.drugName} from this prescription?`)) {
      try {
        const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${rx.id}/items/${item.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        if (res.ok) {
          toast.success(`${item.drugName} removed from prescription.`);
          setPrescriptions(prev =>
            prev.map(p => {
              if (p.id !== rx.id) return p;
              return {
                ...p,
                items: p.items.filter(i => i.id !== item.id)
              };
            })
          );
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || "Failed to remove medicine item.");
        }
      } catch {
        toast.error("Error removing medicine item.");
      }
    }
  };

  // Save Add/Edit Medicine Modal
  const handleSaveItemModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRx) return;
    if (!itemForm.drugName.trim()) {
      setItemValidationError("Medicine name is required.");
      return;
    }

    setIsSubmittingItem(true);
    setItemValidationError(null);

    const calcQty = calculateDispenseQuantity({
      dosageAmount: itemForm.dosageAmount,
      frequency: itemForm.frequency,
      duration: itemForm.duration,
      quantity: itemForm.quantity ? Number(itemForm.quantity) : null
    });

    const payload = {
      drugName: itemForm.drugName.trim(),
      strength: itemForm.strength.trim() || null,
      dosageAmount: itemForm.dosageAmount.trim() || null,
      doseUnit: itemForm.doseUnit.trim() || null,
      dosage: itemForm.dosageAmount && itemForm.doseUnit ? `${itemForm.dosageAmount} ${itemForm.doseUnit}` : itemForm.dosageAmount || null,
      frequency: itemForm.frequency,
      route: itemForm.route,
      duration: itemForm.duration.trim() || null,
      startDate: itemForm.startDate ? new Date(itemForm.startDate).toISOString() : null,
      endDate: itemForm.endDate ? new Date(itemForm.endDate).toISOString() : null,
      instructions: itemForm.instructions.trim() || null,
      quantity: itemForm.quantity ? Number(itemForm.quantity) : calcQty,
      dispenseQty: calcQty,
      medicineId: itemForm.medicineId || null
    };

    try {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
      let url = `${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${targetRx.id}/items`;
      let method = "POST";

      if (activeModal === "EDIT" && editingItem) {
        url = `${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${targetRx.id}/items/${editingItem.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedItem = await res.json();
        toast.success(activeModal === "ADD" ? "Medicine added to prescription." : "Medicine updated successfully.");

        setPrescriptions(prev =>
          prev.map(p => {
            if (p.id !== targetRx.id) return p;
            if (activeModal === "ADD") {
              return { ...p, items: [...p.items, savedItem] };
            } else {
              return {
                ...p,
                items: p.items.map(i => (i.id === savedItem.id ? savedItem : i))
              };
            }
          })
        );
        setActiveModal(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setItemValidationError(err.error || "Failed to save medicine item.");
      }
    } catch {
      setItemValidationError("A network error occurred while saving.");
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // Select drug from autocomplete catalog
  const handleSelectCatalogMed = (med: any) => {
    let parsedStrength = "";
    const strengthMatch = med.name.match(/(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu|%))/i);
    if (strengthMatch) parsedStrength = strengthMatch[1];

    let defaultUnit = "tablet(s)";
    const text = `${med.category || ""} ${med.unit || ""} ${med.name || ""}`.toLowerCase();
    if (text.includes("syrup") || text.includes("susp") || text.includes("liquid") || text.includes("ml")) {
      defaultUnit = "ml";
    } else if (text.includes("cap")) {
      defaultUnit = "capsule(s)";
    } else if (text.includes("inj")) {
      defaultUnit = "ml";
    } else if (text.includes("drop")) {
      defaultUnit = "drops";
    }

    let defaultRoute = "ORAL";
    if (text.includes("iv")) {
      defaultRoute = "IV";
    } else if (text.includes("im") || text.includes("inj")) {
      defaultRoute = "IM";
    } else if (text.includes("supp")) {
      defaultRoute = "SUPPOSITORY";
    }

    setItemForm(prev => ({
      ...prev,
      drugName: med.name,
      strength: parsedStrength || prev.strength,
      doseUnit: defaultUnit,
      route: defaultRoute,
      medicineId: med.id
    }));
    setDrugSearchOpen(false);
  };

  // Filtered prescriptions list
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(rx => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        rx.patientName?.toLowerCase().includes(q) ||
        rx.id.toLowerCase().includes(q) ||
        rx.diagnosis?.toLowerCase().includes(q) ||
        rx.items.some(i => i.drugName.toLowerCase().includes(q));

      let matchesDate = true;
      if (dateFilter) {
        const rxDate = new Date(rx.createdAt).toISOString().split("T")[0];
        matchesDate = rxDate === dateFilter;
      }

      let matchesStatus = true;
      if (statusFilter !== "ALL") {
        matchesStatus = rx.status === statusFilter;
      }

      let matchesMedicine = true;
      if (medicineFilter.trim()) {
        const medQ = medicineFilter.toLowerCase().trim();
        matchesMedicine = rx.items.some(i => i.drugName.toLowerCase().includes(medQ));
      }

      return matchesSearch && matchesDate && matchesStatus && matchesMedicine;
    });
  }, [prescriptions, searchQuery, dateFilter, statusFilter, medicineFilter]);

  // Overall statistics
  const totalPrescriptions = prescriptions.length;
  const totalMedicinesPrescribed = useMemo(() => {
    return prescriptions.reduce((sum, rx) => sum + (rx.items?.length || 0), 0);
  }, [prescriptions]);
  const pendingCount = useMemo(() => {
    return prescriptions.filter(rx => rx.status === "PENDING" || rx.status === "IN_PROGRESS").length;
  }, [prescriptions]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Pill className="w-8 h-8 text-primary" />
            Prescription Management Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Medicine-wise clinical ledger displaying dosage, frequency, administration routes, and prescription controls.
          </p>
        </div>

        {/* Quick summary stats */}
        <div className="flex items-center gap-3">
          <div className="bg-card border rounded-lg px-3.5 py-2 text-center shadow-sm">
            <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider block">Prescriptions</span>
            <span className="text-lg font-extrabold text-foreground">{totalPrescriptions}</span>
          </div>
          <div className="bg-card border rounded-lg px-3.5 py-2 text-center shadow-sm">
            <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider block">Total Meds</span>
            <span className="text-lg font-extrabold text-primary">{totalMedicinesPrescribed}</span>
          </div>
          <div className="bg-card border rounded-lg px-3.5 py-2 text-center shadow-sm">
            <span className="text-[11px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider block">Active Queue</span>
            <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{pendingCount}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchPrescriptions}
            title="Refresh prescriptions"
            className="h-11 w-11 shrink-0"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-primary")} />
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Patient, ID, or Diagnosis..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-background text-sm"
            />
          </div>

          <div className="md:col-span-3 relative">
            <Pill className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter by Medicine name..."
              value={medicineFilter}
              onChange={e => setMedicineFilter(e.target.value)}
              className="pl-9 bg-background text-sm"
            />
          </div>

          <div className="md:col-span-3 relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="pl-9 bg-background text-sm"
            />
          </div>

          <div className="md:col-span-2 relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DISPENSED">Dispensed</option>
            </select>
          </div>
        </div>

        {(searchQuery || dateFilter || statusFilter !== "ALL" || medicineFilter) && (
          <div className="flex items-center justify-between text-xs pt-1 border-t text-muted-foreground">
            <span>
              Showing {filteredPrescriptions.length} of {prescriptions.length} prescriptions
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setDateFilter("");
                setStatusFilter("ALL");
                setMedicineFilter("");
              }}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-card border rounded-xl">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading prescription records & medicine details...</p>
        </div>
      ) : fetchError ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 mx-auto" />
          <h3 className="font-bold text-lg">Failed to Load Prescriptions</h3>
          <p className="text-sm text-destructive/80 max-w-md mx-auto">{fetchError}</p>
          <Button variant="outline" onClick={fetchPrescriptions} className="mt-2">
            Try Again
          </Button>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center space-y-3 shadow-sm">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-bold text-lg text-foreground">No Prescriptions Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery || dateFilter || statusFilter !== "ALL" || medicineFilter
              ? "No prescriptions match the filters currently applied. Try clearing some filters."
              : "No prescriptions have been recorded yet."}
          </p>
          {(searchQuery || dateFilter || statusFilter !== "ALL" || medicineFilter) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setDateFilter("");
                setStatusFilter("ALL");
                setMedicineFilter("");
              }}
              className="mt-2"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPrescriptions.map(rx => {
            const isExpanded = expandedCards[rx.id] !== false;
            const isDispensed = rx.status === "DISPENSED";
            const itemCount = rx.items?.length || 0;

            return (
              <div
                key={rx.id}
                className="bg-card border border-border rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                {/* Prescription Header */}
                <div className="p-5 bg-muted/20 border-b border-border/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-lg text-foreground">{rx.patientName || "Walk-in Patient"}</span>
                        {rx.patientPhone && (
                          <span className="text-xs text-muted-foreground">({rx.patientPhone})</span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <Badge
                        variant={isDispensed ? "default" : "secondary"}
                        className={cn(
                          "uppercase text-[10px] font-bold px-2 py-0.5 tracking-wider",
                          isDispensed
                            ? "bg-green-600 text-white dark:bg-green-700"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                        )}
                      >
                        {rx.status}
                      </Badge>

                      {/* Rx ID Pill with Copy */}
                      <button
                        type="button"
                        onClick={() => handleCopyId(rx.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono bg-background border px-2 py-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="Click to copy full Rx ID"
                      >
                        <span>Rx: #{rx.id.slice(0, 8)}</span>
                        {copiedId === rx.id ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>

                      {rx.bookingReference && (
                        <span className="text-[11px] font-mono bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded">
                          Token: #{rx.bookingReference}
                        </span>
                      )}
                    </div>

                    {/* Metadata line: Prescribing doctor, date, diagnosis */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>Prescribed by <strong>Dr. {rx.doctorName || "Doctor"}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(rx.createdAt).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" })} at {new Date(rx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {rx.diagnosis && (
                        <div className="flex items-center gap-1.5 bg-background border px-2 py-0.5 rounded text-foreground font-medium">
                          <span>Diagnosis: {rx.diagnosis}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAddModal(rx)}
                      disabled={isDispensed}
                      className="h-8 text-xs font-semibold gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Medicine
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintClick(rx)}
                      className="h-8 text-xs gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConsultationRedirect(rx)}
                      disabled={isDispensed}
                      className="h-8 text-xs gap-1.5 text-amber-600 hover:text-amber-700 dark:text-amber-400"
                      title="Open full consultation page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Consultation
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePrescription(rx)}
                      disabled={isDispensed}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete prescription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleExpand(rx.id)}
                      className="h-8 w-8 text-muted-foreground"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Medicine-Wise List / Table */}
                {isExpanded && (
                  <div className="p-0">
                    {itemCount === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No medicines recorded for this prescription. Click <strong>+ Add Medicine</strong> above to add items.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="min-w-[850px]">
                          <TableHeader className="bg-muted/40">
                            <TableRow className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              <TableHead className="w-[45px] text-center">#</TableHead>
                              <TableHead className="min-w-[180px]">Medicine & Strength</TableHead>
                              <TableHead className="min-w-[130px]">Route of Admin</TableHead>
                              <TableHead className="min-w-[130px]">Dose & Unit</TableHead>
                              <TableHead className="min-w-[150px]">Frequency</TableHead>
                              <TableHead className="min-w-[120px]">Duration / Dates</TableHead>
                              <TableHead className="min-w-[150px]">Instructions</TableHead>
                              <TableHead className="text-center w-[90px]">Total Qty</TableHead>
                              <TableHead className="text-right w-[100px] pr-4">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rx.items.map((item, idx) => {
                              const calcQty = calculateDispenseQuantity(item);
                              const finalQty = item.quantity != null ? item.quantity : (item.dispenseQty || calcQty);

                              return (
                                <TableRow key={item.id || idx} className="hover:bg-muted/30 transition-colors">
                                  <TableCell className="text-center font-bold text-xs text-muted-foreground">
                                    {idx + 1}
                                  </TableCell>

                                  {/* Medicine & Strength */}
                                  <TableCell>
                                    <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                                      <span>{item.drugName}</span>
                                      {item.strength && (
                                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-normal border">
                                          {item.strength}
                                        </span>
                                      )}
                                    </div>
                                    {item.medicine?.name && item.medicine.name.toLowerCase() !== item.drugName.toLowerCase() && (
                                      <div className="text-[11px] text-muted-foreground mt-0.5">
                                        Catalog: {item.medicine.name}
                                      </div>
                                    )}
                                  </TableCell>

                                  {/* Route of Administration */}
                                  <TableCell>
                                    <span
                                      className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-semibold inline-block",
                                        getRouteBadgeClass(item.route)
                                      )}
                                    >
                                      {getRouteLabel(item.route)}
                                    </span>
                                  </TableCell>

                                  {/* Dose per administration & unit */}
                                  <TableCell>
                                    <div className="font-bold text-xs text-foreground">
                                      {item.dosageAmount ? item.dosageAmount : (item.dosage || "1")}{" "}
                                      <span className="font-normal text-muted-foreground">
                                        {item.doseUnit || "unit(s)"}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground/80 block">per dose</span>
                                  </TableCell>

                                  {/* Frequency */}
                                  <TableCell>
                                    <span
                                      className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-semibold inline-block",
                                        getFrequencyBadgeClass(item.frequency)
                                      )}
                                    >
                                      {getFrequencyLabel(item.frequency)}
                                    </span>
                                    {item.frequency === "STAT" && (
                                      <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold mt-0.5">
                                        Immediate single dose
                                      </span>
                                    )}
                                    {item.frequency === "EOD" && (
                                      <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-medium mt-0.5">
                                        Alternate days
                                      </span>
                                    )}
                                  </TableCell>

                                  {/* Duration & Start / End dates */}
                                  <TableCell className="text-xs text-muted-foreground">
                                    <div className="font-medium text-foreground">{item.duration || "N/A"}</div>
                                    {item.startDate && (
                                      <div className="text-[10px] text-muted-foreground mt-0.5">
                                        Start: {new Date(item.startDate).toLocaleDateString("en-LK")}
                                      </div>
                                    )}
                                    {item.endDate && (
                                      <div className="text-[10px] text-muted-foreground">
                                        End: {new Date(item.endDate).toLocaleDateString("en-LK")}
                                      </div>
                                    )}
                                  </TableCell>

                                  {/* Instructions */}
                                  <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                                    {item.instructions ? (
                                      <span className="italic">{item.instructions}</span>
                                    ) : (
                                      <span className="text-muted-foreground/50">-</span>
                                    )}
                                  </TableCell>

                                  {/* Total Dispense Qty */}
                                  <TableCell className="text-center font-bold">
                                    <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-mono text-xs">
                                      {finalQty}
                                    </span>
                                  </TableCell>

                                  {/* Actions */}
                                  <TableCell className="text-right pr-4">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenEditModal(rx, item)}
                                        disabled={isDispensed}
                                        className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
                                        title="Edit medicine details"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteItem(rx, item)}
                                        disabled={isDispensed}
                                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                                        title="Remove medicine"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Clinical Notes footer if present */}
                    {rx.clinicalNotes && (
                      <div className="px-5 py-3 bg-muted/10 border-t text-xs text-muted-foreground flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <strong>Clinical Notes:</strong> {rx.clinicalNotes}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Medicine Dialog Modal */}
      {activeModal && targetRx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">
                  {activeModal === "ADD" ? "Add Medicine to Prescription" : "Edit Prescribed Medicine"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveItemModal} className="p-6 space-y-4">
              {itemValidationError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{itemValidationError}</span>
                </div>
              )}

              {/* Medicine Name with Catalog Autocomplete */}
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Medication Name *
                </label>
                <Input
                  placeholder="Type drug name or search pharmacy inventory (e.g. Paracetamol)..."
                  value={itemForm.drugName}
                  onChange={e => {
                    setItemForm(prev => ({ ...prev, drugName: e.target.value }));
                    setDrugSearchOpen(true);
                  }}
                  onFocus={() => setDrugSearchOpen(true)}
                  className="font-medium bg-background"
                  required
                />

                {drugSearchOpen && itemForm.drugName.trim().length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-52 overflow-y-auto">
                    {(() => {
                      const q = itemForm.drugName.toLowerCase().trim();
                      const matches = catalogMedicines.filter(
                        m =>
                          (m.name && m.name.toLowerCase().includes(q)) ||
                          (m.genericName && m.genericName.toLowerCase().includes(q))
                      );
                      if (matches.length === 0) {
                        return (
                          <div className="p-3 text-xs text-muted-foreground">
                            No inventory match found. Will be saved as an external prescription item.
                          </div>
                        );
                      }
                      return matches.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onMouseDown={e => {
                            e.preventDefault();
                            handleSelectCatalogMed(m);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs hover:bg-muted/50 border-b border-border/40 last:border-b-0 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-foreground">{m.name}</span>
                            {m.genericName && (
                              <span className="text-[11px] text-muted-foreground ml-1.5">({m.genericName})</span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{m.category}</span>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Strength and Route of Admin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Strength
                  </label>
                  <Input
                    placeholder="e.g. 500mg, 10mg, 2.5ml"
                    value={itemForm.strength}
                    onChange={e => setItemForm(prev => ({ ...prev, strength: e.target.value }))}
                    className="bg-background"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Route of Administration *
                  </label>
                  <select
                    value={itemForm.route}
                    onChange={e => setItemForm(prev => ({ ...prev, route: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                  >
                    {PRESCRIPTION_ROUTES.map(r => (
                      <option key={r.code} value={r.code}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Frequency & Dosage per administration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Prescription Frequency *
                  </label>
                  <select
                    value={itemForm.frequency}
                    onChange={e => setItemForm(prev => ({ ...prev, frequency: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                  >
                    {PRESCRIPTION_FREQUENCIES.map(f => (
                      <option key={f.code} value={f.code}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Dose Per Administration *
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 1"
                      value={itemForm.dosageAmount}
                      onChange={e => setItemForm(prev => ({ ...prev, dosageAmount: e.target.value }))}
                      className="bg-background w-20 text-center font-semibold"
                    />
                    <select
                      value={itemForm.doseUnit}
                      onChange={e => setItemForm(prev => ({ ...prev, doseUnit: e.target.value }))}
                      className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                    >
                      {DOSE_UNITS.map(u => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Duration & Start Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Duration
                  </label>
                  <Input
                    placeholder="e.g. 3 days, 1 week, 1 month"
                    value={itemForm.duration}
                    onChange={e => setItemForm(prev => ({ ...prev, duration: e.target.value }))}
                    className="bg-background"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={itemForm.startDate}
                    onChange={e => setItemForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Quantity calculation */}
              <div className="p-3 bg-muted/30 border rounded-lg flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Calculated Dispense Quantity:{" "}
                    <span className="font-mono text-primary font-extrabold text-sm">
                      {calculateDispenseQuantity({
                        dosageAmount: itemForm.dosageAmount,
                        frequency: itemForm.frequency,
                        duration: itemForm.duration,
                        quantity: itemForm.quantity ? Number(itemForm.quantity) : null
                      })}{" "}
                      units
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {itemForm.frequency === "STAT"
                      ? "STAT is a one-time immediate dose (not multiplied by days)."
                      : itemForm.frequency === "EOD"
                      ? "EOD calculates alternate days schedule."
                      : "Standard clinical duration schedule."}
                  </span>
                </div>

                <div className="w-32">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Override Qty
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Auto"
                    value={itemForm.quantity}
                    onChange={e => setItemForm(prev => ({ ...prev, quantity: e.target.value }))}
                    className="bg-background h-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Additional Instructions */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Clinical / Patient Instructions
                </label>
                <Input
                  placeholder="e.g. Take after food with warm water, avoid dairy"
                  value={itemForm.instructions}
                  onChange={e => setItemForm(prev => ({ ...prev, instructions: e.target.value }))}
                  className="bg-background text-sm"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveModal(null)}
                  disabled={isSubmittingItem}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingItem} className="gap-2">
                  {isSubmittingItem && <Loader2 className="w-4 h-4 animate-spin" />}
                  {activeModal === "ADD" ? "Add to Prescription" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden print area */}
      <div className="hidden">
        {selectedRxForPrint && (
          <PrescriptionPrintTemplate ref={printRef} prescription={selectedRxForPrint} />
        )}
      </div>
    </div>
  );
}
