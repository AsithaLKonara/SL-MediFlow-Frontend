"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  FilePlus2,
  Search,
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Download,
  Trash2,
  Eye,
  ExternalLink,
  Layers,
  Paperclip,
  Loader2
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

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

  const [orders, setOrders] = useState<ExtraServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusTab, setStatusTab] = useState<string>("ALL");

  // Upload & File View Modal
  const [selectedOrder, setSelectedOrder] = useState<ExtraServiceOrder | null>(null);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status Update state
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = statusTab === "ALL" 
        ? `${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders`
        : `${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders?status=${statusTab}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      toast.error("Failed to load extra service orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusTab, token]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatusId(orderId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
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

  const handleFileUpload = async () => {
    if (!selectedOrder || !fileToUpload) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("fileName", fileToUpload.name);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders/${selectedOrder.id}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      toast.success("Report file uploaded successfully!");
      setFileToUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Update selected order report files
      if (data.data) {
        setSelectedOrder(data.data);
      }
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileIndex: number) => {
    if (!selectedOrder) return;
    if (!confirm("Are you sure you want to delete this report file?")) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/orders/${selectedOrder.id}/files/${fileIndex}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("File deleted successfully");
        if (data.data) {
          setSelectedOrder(data.data);
        }
        fetchOrders();
      } else {
        toast.error(data.error || "Failed to delete file");
      }
    } catch (e) {
      toast.error("Error deleting file");
    }
  };

  const filteredOrders = orders.filter(o => {
    const q = searchTerm.toLowerCase();
    const orderMatch = (o.orderNumber || "").toLowerCase().includes(q);
    const patientMatch = (o.patient?.fullName || "").toLowerCase().includes(q);
    const serviceMatch = (o.service?.title || o.certificateType || "").toLowerCase().includes(q);
    const docMatch = (o.doctor?.fullName || "").toLowerCase().includes(q);
    return orderMatch || patientMatch || serviceMatch || docMatch;
  });

  const pendingCount = orders.filter(o => o.status === "PENDING").length;
  const inProgressCount = orders.filter(o => o.status === "IN_PROGRESS").length;
  const completedCount = orders.filter(o => o.status === "COMPLETED").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1"><Play className="w-3 h-3" /> In Progress</Badge>;
      case "PENDING":
        return <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50 gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FilePlus2 className="w-6 h-6 text-purple-600" />
            Extra Services & Procedures Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage clinical procedures, ECGs, dressings, certificates, and upload patient reports (supports any file type).
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
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
        <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full sm:w-auto">
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
            className="pl-9 h-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading extra service orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No extra service orders found.</div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40">
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
              <TableBody>
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
                        <div className="font-medium text-xs">{order.patient?.fullName || "—"}</div>
                        {order.patient?.phone && (
                          <div className="text-[10px] text-muted-foreground">{order.patient.phone}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-purple-950 dark:text-purple-200">{serviceDisplay}</div>
                        {order.notes && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[160px]" title={order.notes}>
                            {order.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {order.doctor?.fullName ? `Dr. ${order.doctor.fullName}` : "—"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs">
                        LKR {Number(order.finalPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsFileModalOpen(true);
                          }}
                          className={`h-7 px-2 text-xs gap-1 ${reportsCount > 0 ? "text-purple-600 font-semibold bg-purple-50" : "text-muted-foreground"}`}
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          {reportsCount} {reportsCount === 1 ? "file" : "files"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          {order.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(order.id, "IN_PROGRESS")}
                              disabled={updatingStatusId === order.id}
                              className="h-7 text-xs gap-1"
                            >
                              <Play className="w-3 h-3 text-blue-500" /> Start
                            </Button>
                          )}
                          {order.status === "IN_PROGRESS" && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, "COMPLETED")}
                              disabled={updatingStatusId === order.id}
                              className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Complete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsFileModalOpen(true);
                            }}
                            className="h-7 text-xs gap-1"
                          >
                            <Upload className="w-3 h-3" /> Upload Report
                          </Button>
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

      {/* Upload and View Reports Modal */}
      <Dialog open={isFileModalOpen} onOpenChange={setIsFileModalOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-purple-600" />
              Service Reports & Attachments
            </DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderNumber} • {selectedOrder?.patient?.fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* File Upload Form */}
            <div className="p-4 border-2 border-dashed rounded-lg bg-muted/20 flex flex-col items-center justify-center gap-3 text-center">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Upload Report / Result File</p>
                <p className="text-xs text-muted-foreground">Accepts ANY file type (PDF, PNG, JPG, DOCX, DICOM, etc.)</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setFileToUpload(e.target.files[0]);
                  }
                }}
                className="text-xs file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:cursor-pointer"
              />

              {fileToUpload && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono bg-card px-2 py-1 rounded border">
                    {fileToUpload.name} ({(fileToUpload.size / 1024).toFixed(1)} KB)
                  </span>
                  <Button
                    size="sm"
                    onClick={handleFileUpload}
                    disabled={uploading}
                    className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                    Confirm Upload
                  </Button>
                </div>
              )}
            </div>

            {/* Uploaded Files List */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Uploaded Files ({selectedOrder?.reportFiles?.length || 0})
              </h4>

              {(!selectedOrder?.reportFiles || selectedOrder.reportFiles.length === 0) ? (
                <p className="text-xs text-center py-4 text-muted-foreground border rounded-md">
                  No report files uploaded yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedOrder.reportFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border bg-card flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-purple-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold truncate max-w-[280px]" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Uploaded {new Date(file.uploadedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => window.open(file.url, "_blank")}
                          title="Open file"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteFile(idx)}
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick status update within modal */}
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-xs font-semibold">Change Order Status:</span>
              <div className="flex gap-2">
                {selectedOrder && selectedOrder.status !== "COMPLETED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "COMPLETED")}
                    className="h-7 text-xs bg-green-50 text-green-700 hover:bg-green-100 border-green-300"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Order Completed
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFileModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
