"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  ActivitySquare, 
  ScanBarcode, 
  Search, 
  CheckCircle2, 
  Clock, 
  User, 
  Phone, 
  Calendar, 
  UploadCloud, 
  FileText, 
  File, 
  FileCheck, 
  Download, 
  ExternalLink, 
  X, 
  Loader2, 
  AlertCircle, 
  Filter, 
  RefreshCw, 
  Stethoscope,
  Paperclip
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import MedicalCertificateModal, { CertificatePatientInfo } from "@/components/extra-services/MedicalCertificateModal";

export interface QueuedExtraService {
  id: string;
  tokenNumber: string;
  bookingReference?: string | null;
  status: string; // "BOOKED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED"
  serviceTitle: string;
  services?: any[];
  roomNumber: string;
  patient: {
    id: string;
    fullName: string;
    phone?: string;
    gender?: string;
    age?: number | string;
  };
  reportUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  notes?: string | null;
  appointmentDate?: string;
  completedAt?: string | null;
}

export default function ExtraServicesWorkstationPage() {
  const { token } = useAuth();
  const [queue, setQueue] = useState<QueuedExtraService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");

  // Barcode search
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);

  // Upload modal state
  const [selectedItemForUpload, setSelectedItemForUpload] = useState<QueuedExtraService | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Certificate Modal State
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [selectedPatientForCert, setSelectedPatientForCert] = useState<CertificatePatientInfo | undefined>(undefined);

  // Fetch today's queue
  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/queue`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setQueue(data);
        }
      }
    } catch (e) {
      console.error("Failed to load extra services queue", e);
      toast.error("Failed to load today's extra services queue.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [token]);

  // Handle hardware barcode scan
  const handleBarcodeScanned = (scannedCode: string) => {
    const code = scannedCode.trim();
    if (!code) return;
    setBarcodeInput(code);
    processBarcodeLookup(code);
  };

  useBarcodeScanner((barcode) => {
    handleBarcodeScanned(barcode);
  });

  const processBarcodeLookup = async (code: string) => {
    setIsSearchingBarcode(true);
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
      setSearchQuery(code);
      toast.success(`Scanned: ${json.type || "Barcode resolved"}`);
    } catch (e) {
      toast.error("Failed to resolve scanned barcode.");
    } finally {
      setIsSearchingBarcode(false);
    }
  };

  // Toggle procedure completion manually
  const handleToggleStatus = async (item: QueuedExtraService) => {
    const newStatus = item.status === "COMPLETED" ? "BOOKED" : "COMPLETED";
    try {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/appointments/${item.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setQueue(prev => prev.map(q => q.id === item.id ? { 
          ...q, 
          status: newStatus,
          completedAt: newStatus === "COMPLETED" ? new Date().toISOString() : null 
        } : q));
        toast.success(newStatus === "COMPLETED" ? "Procedure marked as COMPLETED!" : "Status reverted to PENDING.");
      } else {
        toast.error("Failed to update status.");
      }
    } catch (e) {
      toast.error("Error updating status.");
    }
  };

  // Handle file submission for report attachment
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForUpload) return;
    if (!uploadFile) {
      toast.error("Please select a report file to attach.");
      return;
    }

    try {
      setIsUploading(true);
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("appointmentId", selectedItemForUpload.id);
      if (uploadNotes.trim()) {
        formData.append("notes", uploadNotes.trim());
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeToken}`
        },
        body: formData
      });

      if (res.ok) {
        const json = await res.json();
        const updatedAppt = json.data;

        setQueue(prev => prev.map(q => q.id === selectedItemForUpload.id ? {
          ...q,
          status: "COMPLETED",
          reportUrl: updatedAppt.reportUrl,
          fileName: updatedAppt.fileName || uploadFile.name,
          fileType: updatedAppt.fileType || uploadFile.type,
          notes: updatedAppt.notes || uploadNotes,
          completedAt: updatedAppt.completedAt || new Date().toISOString()
        } : q));

        toast.success(`Report attached! Procedure marked as COMPLETED.`);
        setSelectedItemForUpload(null);
        setUploadFile(null);
        setUploadNotes("");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to upload report file.");
      }
    } catch (e) {
      console.error("Upload error:", e);
      toast.error("Failed to upload report.");
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered queue items
  const filteredQueue = useMemo(() => {
    return queue.filter(item => {
      // Status filter
      if (statusFilter === "PENDING" && item.status === "COMPLETED") return false;
      if (statusFilter === "COMPLETED" && item.status !== "COMPLETED") return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.tokenNumber.toLowerCase().includes(q) ||
        (item.bookingReference && item.bookingReference.toLowerCase().includes(q)) ||
        item.patient.fullName.toLowerCase().includes(q) ||
        (item.patient.phone && item.patient.phone.includes(q)) ||
        item.serviceTitle.toLowerCase().includes(q) ||
        item.roomNumber.toLowerCase().includes(q)
      );
    });
  }, [queue, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = queue.length;
    const completed = queue.filter(q => q.status === "COMPLETED").length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [queue]);

  const getFormatBadge = (fileName?: string | null, fileType?: string | null) => {
    if (!fileName && !fileType) return "FILE";
    const ext = fileName?.split('.').pop()?.toUpperCase() || "";
    if (ext) return ext;
    if (fileType?.includes("pdf")) return "PDF";
    if (fileType?.includes("image")) return "IMG";
    if (fileType?.includes("dicom")) return "DCM";
    if (fileType?.includes("word") || fileType?.includes("document")) return "DOCX";
    return "REPORT";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16 max-w-7xl mx-auto">
      {/* HEADER & QUICK SCANNER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card p-6 border rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold px-2.5 py-0.5">
              Workstation Active
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ScanBarcode className="w-3.5 h-3.5" /> Hardware Scanner Listening
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <ActivitySquare className="w-7 h-7 text-emerald-600" />
            Extra Services & Procedures Workstation
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Procedure queue for ECG, Wound Dressing, Nebulization, Injections, and Nursing procedures.
          </p>
        </div>

        {/* ACTIONS & SCANNER BOX */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setSelectedPatientForCert(undefined);
              setIsCertModalOpen(true);
            }}
            className="gap-1.5 font-bold h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm whitespace-nowrap"
            data-testid="issue-certificate-btn"
          >
            <FileText className="w-4 h-4" />
            + Issue Certificate
          </Button>

          {/* BARCODE SCANNER BOX */}
          <form 
            onSubmit={(e) => { e.preventDefault(); processBarcodeLookup(barcodeInput); }} 
            className="flex items-center gap-2 w-full lg:w-80"
          >
            <div className="relative flex-1">
              <ScanBarcode className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan Barcode (0123456789)..."
                className="pl-9 font-mono font-semibold text-xs h-9"
                data-testid="barcode-search-input"
                disabled={isSearchingBarcode}
              />
            </div>
            <Button 
              type="submit" 
              size="sm"
              disabled={isSearchingBarcode || !barcodeInput.trim()} 
              className="gap-1.5 font-bold h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="barcode-search-btn"
            >
              {isSearchingBarcode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Scan
            </Button>
          </form>
        </div>
      </div>

      {/* METRIC STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's Procedures</p>
              <p className="text-2xl font-black text-foreground mt-1" data-testid="stat-total">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <Stethoscope className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Execution</p>
              <p className="text-2xl font-black text-amber-600 mt-1" data-testid="stat-pending">{stats.pending}</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Completed & Reports</p>
              <p className="text-2xl font-black text-emerald-600 mt-1" data-testid="stat-completed">{stats.completed}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CONTROLS & FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 border rounded-xl">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by patient, phone, token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
              data-testid="queue-search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* STATUS TABS & REFRESH */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/40 text-xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              data-testid="filter-all"
              className={cn(
                "px-3 py-1 rounded-md font-medium transition-colors",
                statusFilter === "ALL" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              data-testid="filter-pending"
              className={cn(
                "px-3 py-1 rounded-md font-medium transition-colors",
                statusFilter === "PENDING" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setStatusFilter("COMPLETED")}
              data-testid="filter-completed"
              className={cn(
                "px-3 py-1 rounded-md font-medium transition-colors",
                statusFilter === "COMPLETED" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Completed ({stats.completed})
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueue}
            disabled={isLoading}
            className="h-9 gap-1 text-xs"
            data-testid="refresh-queue-btn"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* PROCEDURE QUEUE TABLE */}
      <Card className="border border-border/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border/80 uppercase font-bold text-muted-foreground">
              <tr>
                <th className="p-3.5 pl-4">Token #</th>
                <th className="p-3.5">Patient Details</th>
                <th className="p-3.5">Procedure / Extra Service</th>
                <th className="p-3.5">Room</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Attached Report</th>
                <th className="p-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading today's extra service procedures...
                  </td>
                </tr>
              ) : filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <ActivitySquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2 stroke-1" />
                    <p className="font-semibold text-foreground text-sm">No queued procedures found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {searchQuery ? "No matches for your search query." : "No patients booked or prescribed extra services today yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQueue.map(item => {
                  const isCompleted = item.status === "COMPLETED";
                  return (
                    <tr 
                      key={item.id}
                      data-testid={`queue-row-${item.id}`}
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        isCompleted ? "bg-emerald-500/[0.02]" : ""
                      )}
                    >
                      {/* Token # */}
                      <td className="p-3.5 pl-4">
                        <span 
                          data-testid={`queue-token-${item.id}`}
                          className="font-mono font-black text-sm px-2.5 py-1 rounded bg-muted text-foreground border border-border"
                        >
                          #{item.tokenNumber}
                        </span>
                        {item.bookingReference && (
                          <span className="block text-[10px] font-mono text-muted-foreground mt-1 truncate max-w-[100px]">
                            {item.bookingReference}
                          </span>
                        )}
                      </td>

                      {/* Patient */}
                      <td className="p-3.5">
                        <span className="font-bold text-foreground block text-sm">
                          {item.patient.fullName}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          {item.patient.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {item.patient.phone}
                            </span>
                          )}
                          {item.patient.age && (
                            <span>• {item.patient.age}y {item.patient.gender ? `(${item.patient.gender})` : ''}</span>
                          )}
                        </div>
                      </td>

                      {/* Service / Procedure */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <span 
                            data-testid={`queue-service-${item.id}`}
                            className="font-semibold text-foreground block text-xs"
                          >
                            {item.serviceTitle}
                          </span>
                          {item.services && item.services.length > 1 && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-medium">
                              +{item.services.length - 1} more items
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Room */}
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded font-mono font-medium text-[11px] bg-muted border border-border">
                          {item.roomNumber}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                          isCompleted 
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        )}>
                          {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {isCompleted ? "COMPLETED" : "PENDING"}
                        </span>
                      </td>

                      {/* Attached Report */}
                      <td className="p-3.5">
                        {item.reportUrl ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              {getFormatBadge(item.fileName, item.fileType)}
                            </span>
                            <a 
                              href={item.reportUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              data-testid={`view-report-${item.id}`}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline truncate max-w-[150px] inline-flex items-center gap-1"
                            >
                              <Paperclip className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.fileName || "View Report"}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px] italic">
                            No report attached
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPatientForCert({
                                id: item.patient.id,
                                fullName: item.patient.fullName,
                                phone: item.patient.phone,
                                gender: item.patient.gender,
                                age: item.patient.age
                              });
                              setIsCertModalOpen(true);
                            }}
                            data-testid={`issue-cert-for-${item.id}`}
                            className="h-8 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Cert
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedItemForUpload(item);
                              setUploadFile(null);
                              setUploadNotes(item.notes || "");
                            }}
                            data-testid={`open-upload-btn-${item.id}`}
                            className="h-8 text-xs font-semibold gap-1.5 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            {item.reportUrl ? "Replace File" : "Attach Report"}
                          </Button>

                          <Button
                            size="sm"
                            variant={isCompleted ? "outline" : "default"}
                            onClick={() => handleToggleStatus(item)}
                            data-testid={`toggle-status-btn-${item.id}`}
                            className={cn(
                              "h-8 text-xs font-bold gap-1",
                              isCompleted 
                                ? "text-muted-foreground hover:text-foreground" 
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
                          >
                            {isCompleted ? "Undo" : "Mark Done"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* UPLOAD REPORT MODAL (ANY FILE FORMAT SUPPORTED) */}
      {selectedItemForUpload && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          data-testid="upload-report-modal"
        >
          <div 
            className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Attach Procedure Report</h2>
                  <p className="text-xs text-muted-foreground">
                    Upload results for {selectedItemForUpload.patient.fullName} (Token #{selectedItemForUpload.tokenNumber})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItemForUpload(null)} 
                data-testid="close-upload-modal-btn"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Procedure: <strong className="text-emerald-600">{selectedItemForUpload.serviceTitle}</strong>
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Room: {selectedItemForUpload.roomNumber} • Patient: {selectedItemForUpload.patient.fullName}
                </p>
              </div>

              {/* ANY-FILE-TYPE DROPZONE */}
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">
                  Select Report / Scan File <span className="text-red-500">*</span>
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                    uploadFile 
                      ? "border-emerald-500 bg-emerald-500/5" 
                      : "border-border hover:border-emerald-500/50 hover:bg-muted/30"
                  )}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="*/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    data-testid="report-file-input"
                  />

                  {uploadFile ? (
                    <div className="space-y-1.5">
                      <FileCheck className="w-8 h-8 mx-auto text-emerald-600" />
                      <p className="text-xs font-bold text-foreground truncate max-w-xs mx-auto">
                        {uploadFile.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {(uploadFile.size / 1024).toFixed(1)} KB • {uploadFile.type || "Binary file"}
                      </p>
                      <span className="text-[10px] text-emerald-600 font-semibold underline block">
                        Click to choose another file
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground/60" />
                      <p className="text-xs font-semibold text-foreground">
                        Click to select or drag and drop any file
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Supports <strong>any file format</strong>: PDF, PNG, JPG, DOCX, DICOM scan (.dcm)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* TECHNICIAN NOTES */}
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">
                  Technician / Procedure Notes (Optional)
                </label>
                <Textarea
                  placeholder="Enter observations, pulse readings, dressing details..."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="text-xs min-h-[70px]"
                  data-testid="report-notes-input"
                />
              </div>

              {/* FOOTER ACTIONS */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItemForUpload(null)}
                  data-testid="cancel-upload-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!uploadFile || isUploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  data-testid="submit-upload-btn"
                >
                  {isUploading ? (
                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Uploading...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Upload & Mark Complete</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDICAL & FITNESS CERTIFICATES MODAL */}
      <MedicalCertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        patient={selectedPatientForCert}
        onSaveAsExtraService={async () => {
          fetchQueue();
        }}
      />
    </div>
  );
}
