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
  Paperclip,
  Layers,
  Play,
  Trash2,
  Eye,
  XCircle,
  FilePlus2,
  Upload
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface ReportFile {
  name: string;
  url: string;
  uploadedAt: string;
  size?: number;
  mimetype?: string;
}

interface ExtraServiceOrder {
  id: string;
  orderNumber: string;
  serviceId?: string;
  service?: {
    title: string;
    description?: string;
    category?: string;
  };
  patientId: string;
  patient?: {
    fullName: string;
    phone?: string;
    ageFallback?: number;
    gender?: string;
  };
  doctorId?: string;
  doctor?: {
    fullName: string;
    specialty?: string;
  };
  visitId?: string;
  customPrice?: number;
  finalPrice: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  notes?: string;
  certificateType?: string;
  certificateData?: any;
  reportFiles?: ReportFile[];
  completedAt?: string;
  createdAt: string;
}

export default function ExtraServicesDashboard() {
  const { token, user } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState<"workstation" | "orders">("workstation");

  // ==========================================
  // Workstation Queue State (Developer 1)
  // ==========================================
  const [queue, setQueue] = useState<QueuedExtraService[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  const [isSearchingBarcode, setIsSearchingBarcode] = useState<boolean>(false);

  // File Upload State
  const [selectedItemForUpload, setSelectedItemForUpload] = useState<QueuedExtraService | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Medical Certificate Modal State
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [selectedPatientForCert, setSelectedPatientForCert] = useState<CertificatePatientInfo | null>(null);

  // ==========================================
  // Orders Manifest State (Developer 2)
  // ==========================================
  const [orders, setOrders] = useState<ExtraServiceOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(true);
  const [orderSearchTerm, setOrderSearchTerm] = useState<string>("");
  const [orderStatusTab, setOrderStatusTab] = useState<string>("ALL");

  // Order Upload & File View Modal
  const [selectedOrder, setSelectedOrder] = useState<ExtraServiceOrder | null>(null);
  const [isFileModalOpen, setIsFileModalOpen] = useState<boolean>(false);
  const [orderFileToUpload, setOrderFileToUpload] = useState<File | null>(null);
  const [orderUploading, setOrderUploading] = useState<boolean>(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const orderFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Workstation Queue
  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/queue`, {
        headers: {
          Authorization: `Bearer ${activeToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(Array.isArray(data) ? data : data.data || []);
      } else {
        toast.error("Failed to load extra services queue.");
      }
    } catch (e) {
      toast.error("Failed to load today's extra services queue.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Orders Manifest
  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      const url = orderStatusTab === "ALL" 
        ? `${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders`
        : `${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders?status=${orderStatusTab}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : (data.orders || data.data || []));
      }
    } catch (err) {
      // Gracefully handle if orders table is not yet seeded
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [token]);

  useEffect(() => {
    if (activeMainTab === "orders") {
      fetchOrders();
    }
  }, [activeMainTab, orderStatusTab, token]);

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
      toast.error("Failed to upload report.");
    } finally {
      setIsUploading(false);
    }
  };

  // Order status update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatusId(orderId);
    try {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Order marked as ${newStatus.replace('_', ' ')}`);
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update order status");
      }
    } catch (e) {
      toast.error("Error updating status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Order file upload
  const handleOrderFileUpload = async () => {
    if (!selectedOrder || !orderFileToUpload) return;
    setOrderUploading(true);
    try {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      const formData = new FormData();
      formData.append("file", orderFileToUpload);
      formData.append("fileName", orderFileToUpload.name);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders/${selectedOrder.id}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeToken}`
        },
        body: formData
      });

      if (res.ok) {
        toast.success("File uploaded successfully");
        setOrderFileToUpload(null);
        if (orderFileInputRef.current) orderFileInputRef.current.value = "";
        fetchOrders();
        
        const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders/${selectedOrder.id}`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        if (refreshRes.ok) {
          const updated = await refreshRes.json();
          setSelectedOrder(updated.data || updated);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to upload file");
      }
    } catch (e) {
      toast.error("Upload error occurred");
    } finally {
      setOrderUploading(false);
    }
  };

  const handleOrderDeleteFile = async (fileIndex: number) => {
    if (!selectedOrder) return;
    try {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders/${selectedOrder.id}/files/${fileIndex}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        toast.success("File deleted");
        fetchOrders();
        setSelectedOrder(prev => {
          if (!prev) return null;
          const updatedFiles = [...(prev.reportFiles || [])];
          updatedFiles.splice(fileIndex, 1);
          return { ...prev, reportFiles: updatedFiles };
        });
      } else {
        toast.error("Failed to delete file");
      }
    } catch (e) {
      toast.error("Delete file failed");
    }
  };

  // Available Rooms for filtering
  const availableRooms = useMemo(() => {
    const rooms = new Set<string>();
    queue.forEach(item => {
      if (item.roomNumber) rooms.add(item.roomNumber);
    });
    return Array.from(rooms).sort();
  }, [queue]);

  // Filtered queue items
  const filteredQueue = useMemo(() => {
    return queue.filter(item => {
      if (selectedRoom !== "ALL" && item.roomNumber !== selectedRoom) {
        return false;
      }
      if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING" && item.status === "COMPLETED") return false;
        if (statusFilter === "COMPLETED" && item.status !== "COMPLETED") return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesPatient = item.patient.fullName.toLowerCase().includes(query);
        const matchesToken = item.tokenNumber.toLowerCase().includes(query);
        const matchesBooking = (item.bookingReference || "").toLowerCase().includes(query);
        const matchesPhone = (item.patient.phone || "").toLowerCase().includes(query);
        const matchesService = item.serviceTitle.toLowerCase().includes(query);

        return matchesPatient || matchesToken || matchesBooking || matchesPhone || matchesService;
      }
      return true;
    });
  }, [queue, selectedRoom, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = queue.length;
    const completed = queue.filter(q => q.status === "COMPLETED").length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [queue]);

  // Order Filtered & Counts
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (!orderSearchTerm.trim()) return true;
      const q = orderSearchTerm.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        (order.patient?.fullName || "").toLowerCase().includes(q) ||
        (order.service?.title || "").toLowerCase().includes(q) ||
        (order.doctor?.fullName || "").toLowerCase().includes(q)
      );
    });
  }, [orders, orderSearchTerm]);

  const pendingCount = orders.filter(o => o.status === "PENDING").length;
  const inProgressCount = orders.filter(o => o.status === "IN_PROGRESS").length;
  const completedCount = orders.filter(o => o.status === "COMPLETED").length;

  const getFormatBadge = (name?: string | null, type?: string | null) => {
    const ext = name ? name.split('.').pop()?.toUpperCase() : (type ? type.split('/')[1]?.toUpperCase() : "DOC");
    return ext || "FILE";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 p-4 sm:p-6" data-testid="extra-services-workstation">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <ActivitySquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Extra Services & Procedures Workstation
              </h1>
              <p className="text-xs text-muted-foreground">
                Workstation procedure execution, zero-restriction report uploads, and order dispatch tracking
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 text-xs">
            <button
              onClick={() => setActiveMainTab("workstation")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5",
                activeMainTab === "workstation" 
                  ? "bg-background text-foreground shadow-xs" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ActivitySquare className="w-4 h-4 text-emerald-600" />
              Workstation Queue
            </button>
            <button
              onClick={() => setActiveMainTab("orders")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5",
                activeMainTab === "orders" 
                  ? "bg-background text-foreground shadow-xs" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="w-4 h-4 text-purple-600" />
              Service Orders Manifest
            </button>
          </div>

          <Button
            onClick={() => {
              setSelectedPatientForCert({
                id: "walkin-cert",
                fullName: "Walk-in Patient",
                phone: "",
                gender: "MALE",
                age: 30
              });
              setIsCertModalOpen(true);
            }}
            data-testid="issue-certificate-btn"
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs"
          >
            <FileText className="w-4 h-4" />
            Issue Certificate
          </Button>
        </div>
      </div>

      {activeMainTab === "workstation" ? (
        <>
          {/* HARDWARE BARCODE SCANNER BANNER */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-background to-teal-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg shrink-0">
                <ScanBarcode className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Hardware Barcode Scanner Active
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Scan patient wristband or token barcode to instantly isolate procedure
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                type="text"
                placeholder="Scan or type barcode..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && barcodeInput.trim()) {
                    processBarcodeLookup(barcodeInput.trim());
                  }
                }}
                className="h-8 text-xs font-mono max-w-[200px]"
                data-testid="barcode-manual-input"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => processBarcodeLookup(barcodeInput.trim())}
                disabled={isSearchingBarcode || !barcodeInput.trim()}
                className="h-8 text-xs font-semibold gap-1"
                data-testid="barcode-search-btn"
              >
                {isSearchingBarcode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                Lookup
              </Button>
            </div>
          </div>

          {/* SUMMARY KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-border/60 bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's Total Procedures</p>
                  <p className="text-2xl font-black text-foreground mt-1" data-testid="stat-total">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                  <ActivitySquare className="w-6 h-6" />
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

            {/* ROOM FILTER */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Filter Room:</span>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                data-testid="room-filter-select"
              >
                <option value="ALL">All Station Rooms</option>
                {availableRooms.map(room => (
                  <option key={room} value={room}>Room {room}</option>
                ))}
              </select>
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
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        Loading extra services queue...
                      </td>
                    </tr>
                  ) : filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground/60" />
                        No extra services or procedures match your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((item) => {
                      const isCompleted = item.status === "COMPLETED";

                      return (
                        <tr 
                          key={item.id} 
                          className={cn(
                            "hover:bg-muted/30 transition-colors",
                            isCompleted && "bg-emerald-500/5 dark:bg-emerald-950/10"
                          )}
                          data-testid={`queue-row-${item.id}`}
                        >
                          {/* Token Number */}
                          <td className="p-3.5 pl-4">
                            <span className="font-mono font-black text-sm text-foreground px-2 py-1 rounded bg-muted/80 border border-border">
                              {item.tokenNumber}
                            </span>
                            {item.bookingReference && (
                              <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                                {item.bookingReference}
                              </p>
                            )}
                          </td>

                          {/* Patient Details */}
                          <td className="p-3.5">
                            <div className="font-bold text-foreground text-xs">
                              {item.patient.fullName}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              {item.patient.phone && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Phone className="w-3 h-3 text-muted-foreground" />
                                  {item.patient.phone}
                                </span>
                              )}
                              {item.patient.gender && (
                                <span>• {item.patient.gender}</span>
                              )}
                              {item.patient.age != null && (
                                <span>• {item.patient.age} yrs</span>
                              )}
                            </div>
                          </td>

                          {/* Procedure */}
                          <td className="p-3.5">
                            <span className="font-semibold text-foreground block">
                              {item.serviceTitle}
                            </span>
                            {item.notes && (
                              <p className="text-[11px] text-muted-foreground italic truncate max-w-[200px] mt-0.5">
                                Note: {item.notes}
                              </p>
                            )}
                          </td>

                          {/* Room */}
                          <td className="p-3.5">
                            <Badge variant="outline" className="font-mono text-[11px] font-bold">
                              {item.roomNumber || "General"}
                            </Badge>
                          </td>

                          {/* Status */}
                          <td className="p-3.5">
                            {isCompleted ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 gap-1 font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                COMPLETED
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 gap-1 font-bold">
                                <Clock className="w-3 h-3" />
                                PENDING
                              </Badge>
                            )}
                            {item.completedAt && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
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
              >
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Attach Procedure Report</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Patient: <strong>{selectedItemForUpload.patient.fullName}</strong> • Token: <strong>{selectedItemForUpload.tokenNumber}</strong>
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedItemForUpload(null)}
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <form onSubmit={handleUploadSubmit} className="p-4 space-y-4">
                  {/* DROPZONE AREA */}
                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">
                      Select Report File (Any format: PDF, images, DOCX, DICOM, etc.)
                    </label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                        uploadFile 
                          ? "border-emerald-500 bg-emerald-500/5" 
                          : "border-border hover:border-emerald-500/60 hover:bg-muted/40"
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
            patient={selectedPatientForCert || undefined}
            onSaveAsExtraService={async () => {
              fetchQueue();
            }}
          />
        </>
      ) : (
        /* ========================================================
           SERVICE ORDERS MANIFEST (Developer 2 View)
           ======================================================== */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Total Orders</p>
                  <h3 className="text-2xl font-bold mt-1">{orders.length}</h3>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
                  <Layers className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Pending</p>
                  <h3 className="text-2xl font-bold mt-1 text-amber-600">{pendingCount}</h3>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">In Progress</p>
                  <h3 className="text-2xl font-bold mt-1 text-blue-600">{inProgressCount}</h3>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                  <Play className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Completed</p>
                  <h3 className="text-2xl font-bold mt-1 text-green-600">{completedCount}</h3>
                </div>
                <div className="p-3 bg-green-500/10 rounded-xl text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Tabs value={orderStatusTab} onValueChange={setOrderStatusTab} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="ALL">All ({orders.length})</TabsTrigger>
                <TabsTrigger value="PENDING">Pending ({pendingCount})</TabsTrigger>
                <TabsTrigger value="IN_PROGRESS">In Progress ({inProgressCount})</TabsTrigger>
                <TabsTrigger value="COMPLETED">Completed ({completedCount})</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search order, patient, service..."
                className="pl-9 h-9 text-xs"
                value={orderSearchTerm}
                onChange={e => setOrderSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Orders Table */}
          <Card>
            <CardContent className="p-0">
              {ordersLoading ? (
                <div className="p-12 text-center text-muted-foreground text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                  Loading extra service orders...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-xs">No extra service orders found.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/40 text-xs">
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Service / Certificate</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount (LKR)</TableHead>
                      <TableHead className="text-center">Reports</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {filteredOrders.map(order => {
                      const reportsCount = order.reportFiles?.length || 0;
                      const serviceDisplay = order.service?.title || (order.certificateType ? `Certificate (${order.certificateType})` : "Clinical Service");

                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs font-semibold">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(order.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{order.patient?.fullName || "Unknown"}</div>
                            <div className="text-[11px] text-muted-foreground">{order.patient?.phone}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-medium">
                              {serviceDisplay}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {order.doctor?.fullName || "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={cn(
                                "text-[11px] font-semibold",
                                order.status === "PENDING" && "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
                                order.status === "IN_PROGRESS" && "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300",
                                order.status === "COMPLETED" && "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300",
                                order.status === "CANCELLED" && "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300"
                              )}
                              variant="outline"
                            >
                              {order.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {Number(order.finalPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            {reportsCount > 0 ? (
                              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => {
                                setSelectedOrder(order);
                                setIsFileModalOpen(true);
                              }}>
                                <Paperclip className="w-3 h-3 text-purple-600" />
                                {reportsCount} File{reportsCount > 1 ? "s" : ""}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px] italic">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setIsFileModalOpen(true);
                                }}
                              >
                                <Upload className="w-3.5 h-3.5 mr-1" /> Files
                              </Button>

                              {order.status === "PENDING" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-blue-600"
                                  disabled={updatingStatusId === order.id}
                                  onClick={() => handleUpdateOrderStatus(order.id, "IN_PROGRESS")}
                                >
                                  Start
                                </Button>
                              )}

                              {order.status !== "COMPLETED" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-green-600"
                                  disabled={updatingStatusId === order.id}
                                  onClick={() => handleUpdateOrderStatus(order.id, "COMPLETED")}
                                >
                                  Complete
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Orders Upload & View Modal */}
          <Dialog open={isFileModalOpen} onOpenChange={setIsFileModalOpen}>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Order Files & Reports
                </DialogTitle>
                <DialogDescription>
                  Upload or inspect procedure reports, scans, or documentation for Order #{selectedOrder?.orderNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <input
                    type="file"
                    ref={orderFileInputRef}
                    className="hidden"
                    accept="*/*"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setOrderFileToUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs font-medium">Upload any report or procedure file</p>
                  <p className="text-[11px] text-muted-foreground mb-3">PDF, Images, DOCX, DICOM (.dcm), etc.</p>
                  
                  {orderFileToUpload ? (
                    <div className="flex items-center justify-between p-2 bg-muted rounded text-xs mb-3">
                      <span className="truncate max-w-[300px] font-semibold">{orderFileToUpload.name}</span>
                      <Button
                        size="sm"
                        disabled={orderUploading}
                        onClick={handleOrderFileUpload}
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {orderUploading ? "Uploading..." : "Save Upload"}
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                      onClick={() => orderFileInputRef.current?.click()}
                    >
                      Select File to Upload
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">Attached Files</h4>
                  {(!selectedOrder?.reportFiles || selectedOrder.reportFiles.length === 0) ? (
                    <p className="text-xs text-muted-foreground italic">No reports attached yet.</p>
                  ) : (
                    <div className="divide-y divide-border border rounded-lg overflow-hidden">
                      {selectedOrder.reportFiles.map((file, idx) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/30">
                          <div className="flex items-center gap-2 truncate max-w-[300px]">
                            <Paperclip className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="font-medium truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(file.url, "_blank")}>
                              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleOrderDeleteFile(idx)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFileModalOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
