"use client";

import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Stethoscope,
  PlusCircle,
  RefreshCw,
  Printer,
  CheckCircle,
  Clock,
  CheckCheck,
  CreditCard,
  Banknote,
  Building,
  TrendingUp,
  FileText,
  DollarSign,
  Calendar,
  Users,
  Search,
  Filter,
  Eye,
  Trash2,
  AlertCircle,
  UploadCloud,
  ExternalLink,
  Paperclip
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { useReactToPrint } from "react-to-print";
import {
  DoctorPaymentReceiptTemplate,
  DoctorDailySheetData
} from "@/components/printing/DoctorPaymentReceiptTemplate";

export default function FundOfficePage() {
  const { token, user } = useAuth();
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const [activeTab, setActiveTab] = useState<"sheets" | "reports" | "history">("sheets");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Metrics state
  const [metrics, setMetrics] = useState({
    todayDoctorPayments: 0,
    pendingDoctorPayments: 0,
    pendingCount: 0,
    approvedPayments: 0,
    approvedCount: 0,
    paidPayments: 0,
    paidCount: 0,
    hospitalCommission: 0,
    totalDailyRevenue: 0,
    todayPatientsCount: 0
  });

  // Daily Sheets list
  const [dailySheets, setDailySheets] = useState<DoctorDailySheetData[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  // Filter state
  const [filterDoctorId, setFilterDoctorId] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");

  // Report state
  const [reports, setReports] = useState<any[]>([]);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportDoctorId, setReportDoctorId] = useState("ALL");

  // Synchronized Payment History Ledger state
  const [paymentHistory, setPaymentHistory] = useState<DoctorDailySheetData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMethod, setHistoryMethod] = useState("ALL");
  const [historyDoctor, setHistoryDoctor] = useState("ALL");
  const [historySearch, setHistorySearch] = useState("");

  // Create / Record Daily Sheet Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newSheet, setNewSheet] = useState({
    doctorId: "",
    date: new Date().toISOString().split("T")[0] || "",
    sessionName: "All Day",
    consultationFee: 3000,
    commissionRate: 20,
    otherAdjustments: 0,
    remarks: "",
    entryMode: "batch" as "batch" | "itemized",
    batchPatientCount: 25,
    patientItems: [
      { patientName: "", tokenNumber: "", consultationFee: 3000 }
    ]
  });

  // Disbursement / Payment Modal
  const [payingSheet, setPayingSheet] = useState<DoctorDailySheetData | null>(null);
  const [disbursementForm, setDisbursementForm] = useState({
    paymentMethod: "BANK_TRANSFER",
    paymentReference: "",
    paymentDate: new Date().toISOString().split("T")[0] || ""
  });
  const [disbursementSlipFile, setDisbursementSlipFile] = useState<File | null>(null);
  const [disbursementSlipUrl, setDisbursementSlipUrl] = useState<string>("");
  const [uploadingDisbursementSlip, setUploadingDisbursementSlip] = useState(false);
  const [disbursing, setDisbursing] = useState(false);

  // View Details Modal
  const [selectedSheet, setSelectedSheet] = useState<DoctorDailySheetData | null>(null);

  // Printing state
  const [printSheet, setPrintSheet] = useState<DoctorDailySheetData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Doctor_Payment_Receipt_${printSheet?.receiptNumber || "voucher"}`,
    onAfterPrint: () => setPrintSheet(null)
  });

  const triggerPrintReceipt = (sheet: DoctorDailySheetData) => {
    setPrintSheet(sheet);
    setTimeout(() => {
      handlePrint();
    }, 200);
  };

  // Fetch initial data
  useEffect(() => {
    if (token) {
      loadInitialData();
    }
  }, [token]);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchMetrics(),
      fetchDailySheets(),
      fetchDoctors(),
      fetchReports()
    ]);
    setLoading(false);
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API}/fund-office/metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (err) {
      console.error("Error fetching fund office metrics:", err);
    }
  };

  const fetchDailySheets = async () => {
    try {
      let query = `${API}/fund-office/daily-sheets?`;
      if (filterDoctorId !== "ALL") query += `doctorId=${filterDoctorId}&`;
      if (filterStatus !== "ALL") query += `status=${filterStatus}&`;
      if (filterDate) query += `date=${filterDate}&`;

      const res = await fetch(query, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDailySheets(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching daily sheets:", err);
      toast.error("Failed to load doctor daily records");
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${API}/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const staff = data.data || [];
        const docList = staff.filter(
          (u: any) =>
            u.specialty ||
            u.Role?.name?.toUpperCase() === "DOCTOR" ||
            u.role?.toUpperCase() === "DOCTOR" ||
            u.Role?.name?.toLowerCase().includes("doc")
        );
        setDoctors(docList);
      }
    } catch (err) {
      console.error("Error fetching doctor staff:", err);
    }
  };

  const fetchReports = async () => {
    try {
      let query = `${API}/fund-office/reports?`;
      if (reportDoctorId !== "ALL") query += `doctorId=${reportDoctorId}&`;
      if (reportStartDate) query += `startDate=${reportStartDate}&`;
      if (reportEndDate) query += `endDate=${reportEndDate}&`;

      const res = await fetch(query, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReports(data.data?.doctorReports || []);
      }
    } catch (err) {
      console.error("Error fetching doctor reports:", err);
    }
  };

  const fetchPaymentHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (historyDoctor && historyDoctor !== "ALL") params.append("doctorId", historyDoctor);
      if (historyMethod && historyMethod !== "ALL") params.append("paymentMethod", historyMethod);

      const res = await fetch(`${API}/fund-office/payment-history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPaymentHistory(data.data || []);
      }
    } catch (err) {
      console.error("fetchPaymentHistory error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history" && token) {
      fetchPaymentHistory();
    }
  }, [activeTab, token, historyDoctor, historyMethod]);

  // Re-fetch sheets when filters change
  useEffect(() => {
    if (token) {
      fetchDailySheets();
    }
  }, [filterDoctorId, filterStatus, filterDate]);

  // Handle doctor selection in Create Sheet modal
  const handleDoctorSelect = (doctorId: string) => {
    const selected = doctors.find((d) => d.id === doctorId);
    setNewSheet((prev) => ({
      ...prev,
      doctorId,
      consultationFee: selected?.consultationFee || prev.consultationFee || 3000,
      commissionRate: selected?.commissionRate !== null && selected?.commissionRate !== undefined
        ? selected.commissionRate
        : 20
    }));
  };

  // Live calculation for the new sheet modal
  const calcNewSheetSummary = () => {
    let patientCount = 0;
    let grossRevenue = 0;

    if (newSheet.entryMode === "batch") {
      patientCount = Number(newSheet.batchPatientCount) || 0;
      grossRevenue = patientCount * (Number(newSheet.consultationFee) || 0);
    } else {
      patientCount = newSheet.patientItems.filter((i) => i.patientName.trim()).length;
      grossRevenue = newSheet.patientItems.reduce(
        (sum, item) => sum + (Number(item.consultationFee) || 0),
        0
      );
    }

    const commRate = Number(newSheet.commissionRate) || 0;
    const commAmount = (grossRevenue * commRate) / 100;
    const adjustments = Number(newSheet.otherAdjustments) || 0;
    const netDoctorPayment = Math.max(0, grossRevenue - commAmount - adjustments);

    return { patientCount, grossRevenue, commAmount, netDoctorPayment };
  };

  // Create or sync daily sheet
  const handleCreateSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheet.doctorId) {
      toast.error("Please select a doctor");
      return;
    }
    if (!newSheet.date) {
      toast.error("Please select a clinic date");
      return;
    }

    setSubmitting(true);
    try {
      let patientItemsPayload: any[] = [];
      if (newSheet.entryMode === "batch") {
        // Generate batch patient items with the specified fee
        const count = Number(newSheet.batchPatientCount) || 0;
        const fee = Number(newSheet.consultationFee) || 0;
        const commRate = Number(newSheet.commissionRate) || 0;
        const docShare = fee * (1 - commRate / 100);
        const hospShare = fee * (commRate / 100);

        for (let i = 1; i <= count; i++) {
          patientItemsPayload.push({
            patientName: `Patient #${i}`,
            tokenNumber: `T-${String(i).padStart(3, "0")}`,
            consultationFee: fee,
            hospitalShare: hospShare,
            doctorShare: docShare,
            remarks: "Standard Clinic Consultation"
          });
        }
      } else {
        patientItemsPayload = newSheet.patientItems.filter((i) => i.patientName.trim());
      }

      const res = await fetch(`${API}/fund-office/daily-sheets/sync-or-create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          doctorId: newSheet.doctorId,
          date: newSheet.date,
          sessionName: newSheet.sessionName,
          consultationFee: Number(newSheet.consultationFee),
          commissionRate: Number(newSheet.commissionRate),
          otherAdjustments: Number(newSheet.otherAdjustments) || 0,
          remarks: newSheet.remarks,
          patientItems: patientItemsPayload
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Daily patient record sheet created successfully!");
        setShowCreateModal(false);
        // Reset form
        setNewSheet({
          doctorId: "",
          date: new Date().toISOString().split("T")[0] || "",
          sessionName: "All Day",
          consultationFee: 3000,
          commissionRate: 20,
          otherAdjustments: 0,
          remarks: "",
          entryMode: "batch",
          batchPatientCount: 25,
          patientItems: [{ patientName: "", tokenNumber: "", consultationFee: 3000 }]
        });
        await Promise.all([fetchDailySheets(), fetchMetrics(), fetchReports()]);
      } else {
        toast.error(data.error || "Failed to create daily sheet");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // Verify Daily Sheet (DRAFT -> VERIFIED)
  const handleVerify = async (id: string) => {
    try {
      const res = await fetch(`${API}/fund-office/daily-sheets/${id}/verify`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Daily record verified by Fund Office");
        fetchDailySheets();
        fetchMetrics();
      } else {
        toast.error(data.error || "Failed to verify sheet");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    }
  };

  // Approve Daily Sheet (VERIFIED -> APPROVED)
  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`${API}/fund-office/daily-sheets/${id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Payment calculation approved. Ready for disbursement.");
        fetchDailySheets();
        fetchMetrics();
      } else {
        toast.error(data.error || "Failed to approve sheet");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    }
  };

  // Helper to ensure private S3 slips open via secure pre-signed redirect
  const getSlipViewUrl = (url?: string) => {
    if (!url) return "#";
    if (url.includes("X-Amz-Signature") || url.includes("Signature=")) return url;
    return `${API}/fund-office/view-slip?url=${encodeURIComponent(url)}`;
  };

  // Upload Payment Slip to S3
  const handleDisbursementSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size exceeds 15MB limit");
      return;
    }

    setDisbursementSlipFile(file);
    setUploadingDisbursementSlip(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/fund-office/upload-slip`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success && data.fileUrl) {
        setDisbursementSlipUrl(data.presignedUrl || data.fileUrl);
        toast.success("Payment slip uploaded successfully!");
      } else {
        toast.error(data.error || "Failed to upload payment slip");
      }
    } catch (err: any) {
      toast.error("Network error uploading payment slip");
    } finally {
      setUploadingDisbursementSlip(false);
    }
  };

  // Disburse Payment (APPROVED -> PAID)
  const handleDisbursePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSheet) return;

    setDisbursing(true);
    try {
      const res = await fetch(`${API}/fund-office/daily-sheets/${payingSheet.id}/pay`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentMethod: disbursementForm.paymentMethod,
          paymentReference: disbursementForm.paymentReference.trim() || undefined,
          paymentSlipUrl: disbursementSlipUrl.trim() || undefined,
          paymentDate: disbursementForm.paymentDate
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          `Payment disbursed successfully! Receipt #${data.data.receiptNumber} generated.`
        );
        const updatedSheet = data.data;
        setPayingSheet(null);
        await Promise.all([fetchDailySheets(), fetchMetrics(), fetchReports()]);

        // Prompt to print immediately
        triggerPrintReceipt(updatedSheet);
      } else {
        toast.error(data.error || "Failed to record payment disbursement");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setDisbursing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-slate-100 text-slate-700">DRAFT</Badge>;
      case "VERIFIED":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">VERIFIED</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">APPROVED</Badge>;
      case "PAID":
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">PAID</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">CANCELLED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const liveSummary = calcNewSheetSummary();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hidden print template */}
      <DoctorPaymentReceiptTemplate ref={printRef} sheet={printSheet} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fund Office</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Doctor Payments
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Daily patient consultation records, hospital commission deductions, and payment disbursement vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setRefreshing(true);
              try {
                for (const d of doctors) {
                  await fetch(`${API}/fund-office/doctor-summary?doctorId=${d.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                }
                await Promise.all([fetchMetrics(), fetchDailySheets(), fetchReports()]);
                toast.success("Synced all completed consultations with daily sheets!");
              } catch (e) {
                console.error(e);
              } finally {
                setRefreshing(false);
              }
            }}
            disabled={refreshing}
            className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Sync Consultations
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setRefreshing(true);
              await Promise.all([fetchMetrics(), fetchDailySheets(), fetchReports()]);
              setRefreshing(false);
              toast.info("Data refreshed");
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Record Doctor Daily Sheet
          </Button>
        </div>
      </div>

      {/* 7 KPI Dashboard Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Doctor Payments */}
        <Card className="border-l-4 border-l-blue-600 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Today's Doctor Payments
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center justify-between">
              <span>LKR {metrics.todayDoctorPayments.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Net doctor disbursements today
          </CardContent>
        </Card>

        {/* Card 2: Pending Doctor Payments */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Doctor Payments
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-700 flex items-center justify-between">
              <span>LKR {metrics.pendingDoctorPayments.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              <Clock className="w-5 h-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex justify-between items-center">
            <span>Awaiting verification & approval</span>
            <Badge variant="outline" className="bg-amber-50 text-amber-700">{metrics.pendingCount} Sheets</Badge>
          </CardContent>
        </Card>

        {/* Card 3: Approved Payments */}
        <Card className="border-l-4 border-l-indigo-600 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Approved Payments
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-700 flex items-center justify-between">
              <span>LKR {metrics.approvedPayments.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              <CheckCircle className="w-5 h-5 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex justify-between items-center">
            <span>Ready for payout disbursement</span>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700">{metrics.approvedCount} Ready</Badge>
          </CardContent>
        </Card>

        {/* Card 4: Paid Payments */}
        <Card className="border-l-4 border-l-emerald-600 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paid Doctor Payments
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700 flex items-center justify-between">
              <span>LKR {metrics.paidPayments.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              <CheckCheck className="w-5 h-5 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex justify-between items-center">
            <span>Disbursed & receipted</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{metrics.paidCount} Completed</Badge>
          </CardContent>
        </Card>

        {/* Card 5: Hospital Commission */}
        <Card className="border-l-4 border-l-rose-600 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hospital Commission
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-700 flex items-center justify-between">
              <span>LKR {metrics.hospitalCommission.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              <Building className="w-5 h-5 text-rose-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Hospital retained operational revenue
          </CardContent>
        </Card>

        {/* Card 6: Total Daily Revenue */}
        <Card className="border-l-4 border-l-teal-600 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Daily Revenue
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-teal-800 flex items-center justify-between">
              <span>LKR {metrics.totalDailyRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              <TrendingUp className="w-5 h-5 text-teal-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex justify-between items-center">
            <span>Gross patient consultation revenue</span>
            <Badge variant="outline" className="bg-teal-50 text-teal-700">{metrics.todayPatientsCount} Patients</Badge>
          </CardContent>
        </Card>

        {/* Card 7: Doctor-Wise Reports Quick Action */}
        <Card className="border-l-4 border-l-purple-600 shadow-sm sm:col-span-2 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Doctor-Wise Payment Reports
            </CardDescription>
            <CardTitle className="text-xl font-bold text-purple-900 flex items-center justify-between">
              <span>Financial Statements & Breakdowns</span>
              <FileText className="w-5 h-5 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center pt-0">
            <span className="text-xs text-muted-foreground">
              View individual doctor revenues, commissions, and disbursement history.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="text-purple-700 border-purple-200 hover:bg-purple-50"
              onClick={() => setActiveTab(activeTab === "sheets" ? "reports" : "sheets")}
            >
              {activeTab === "sheets" ? "Switch to Reports" : "Back to Daily Sheets"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b space-x-6 text-sm font-semibold">
        <button
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "sheets"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("sheets")}
        >
          Daily Doctor Patient Records & Payments
        </button>
        <button
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "reports"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("reports")}
        >
          Doctor-Wise Financial Reports
        </button>
        <button
          className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "history"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("history")}
        >
          <Clock className="h-4 w-4" />
          Synchronized Payment History Ledger
        </button>
      </div>

      {/* TAB 1: DAILY DOCTOR SHEETS */}
      {activeTab === "sheets" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-card p-4 rounded-lg border shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Doctor Filter */}
              <div className="w-56">
                <Select value={filterDoctorId} onValueChange={(val) => val && setFilterDoctorId(val)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Doctors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Doctors</SelectItem>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.fullName || d.name || "Doctor"} ({d.specialty || "General"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="w-40">
                <Select value={filterStatus} onValueChange={(val) => val && setFilterStatus(val)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="VERIFIED">Verified</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filter */}
              <div className="w-44">
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="h-9"
                />
              </div>

              {filterDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterDate("")}
                  className="h-9 text-xs"
                >
                  Clear Date
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Showing <span className="font-bold text-slate-800">{dailySheets.length}</span> daily sheets
            </div>
          </div>

          {/* Daily Sheets Table */}
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Date & Session</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-center">Patients & Fee</TableHead>
                    <TableHead className="text-right">Consultation Revenue</TableHead>
                    <TableHead className="text-right">Hospital Commission</TableHead>
                    <TableHead className="text-right font-bold text-emerald-800">
                      Doctor Net Payment
                    </TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Receipt / Ref</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySheets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Loading doctor sheets...
                          </div>
                        ) : (
                          "No doctor daily sheets found for the selected criteria."
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    dailySheets.map((sheet) => (
                      <TableRow key={sheet.id} className="hover:bg-slate-50/80">
                        <TableCell>
                          <div className="font-semibold text-slate-800">
                            {new Date(sheet.date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">{sheet.sessionName}</div>
                        </TableCell>

                        <TableCell>
                          <div className="font-bold text-slate-900">
                            {sheet.doctor?.fullName || sheet.doctor?.name || "Doctor"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sheet.doctor?.specialty || sheet.doctor?.specialization || "Consultant"}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="font-semibold text-slate-800">{sheet.totalPatients}</span>
                          <span className="text-xs text-muted-foreground block">
                            @ LKR {sheet.consultationFee.toLocaleString()}
                          </span>
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          LKR {sheet.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>

                        <TableCell className="text-right text-rose-700 font-medium">
                          - LKR {sheet.hospitalCommission.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          <span className="text-xs text-muted-foreground block">({sheet.commissionRate}%)</span>
                        </TableCell>

                        <TableCell className="text-right font-black text-emerald-800 text-sm">
                          LKR {sheet.netDoctorPayment.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          {(sheet.cashDoctorShare !== undefined || sheet.bankDoctorShare !== undefined) && (
                            <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                              <span className="text-emerald-700 font-semibold">Cash: LKR {(sheet.cashDoctorShare || 0).toLocaleString()}</span>
                              {" • "}
                              <span className="text-blue-700 font-semibold">Bank: LKR {(sheet.bankDoctorShare || 0).toLocaleString()}</span>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {getStatusBadge(sheet.status)}
                        </TableCell>

                        <TableCell>
                          {sheet.receiptNumber ? (
                            <span className="font-mono text-xs font-bold text-slate-800 block">
                              {sheet.receiptNumber}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                          {sheet.paymentReference && (
                            <span className="text-[11px] text-muted-foreground font-mono block">
                              Ref: {sheet.paymentReference}
                            </span>
                          )}
                          {(sheet.paymentSlipUrl || (sheet.bankDetails as any)?.slipUrl) && (
                            <a
                              href={getSlipViewUrl(sheet.paymentSlipUrl || (sheet.bankDetails as any)?.slipUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline mt-0.5 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"
                              title="Open Payment Slip"
                            >
                              <Paperclip className="h-2.5 w-2.5" />
                              Slip
                              <ExternalLink className="h-2 w-2 ml-0.5" />
                            </a>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Details */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="View Patient Breakdown"
                              onClick={() => setSelectedSheet(sheet)}
                            >
                              <Eye className="w-4 h-4 text-slate-600" />
                            </Button>

                            {/* Step 5: Verify (DRAFT -> VERIFIED) */}
                            {sheet.status === "DRAFT" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                                onClick={() => handleVerify(sheet.id)}
                              >
                                Verify
                              </Button>
                            )}

                            {/* Step 6: Approve (VERIFIED -> APPROVED) */}
                            {sheet.status === "VERIFIED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                                onClick={() => handleApprove(sheet.id)}
                              >
                                Approve
                              </Button>
                            )}

                            {/* Step 7: Make Payment (APPROVED -> PAID) */}
                            {sheet.status === "APPROVED" && (
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => {
                                  setPayingSheet(sheet);
                                  setDisbursementSlipFile(null);
                                  setDisbursementSlipUrl(sheet.paymentSlipUrl || (sheet.bankDetails as any)?.slipUrl || "");
                                  setDisbursementForm({
                                    paymentMethod: "BANK_TRANSFER",
                                    paymentReference: sheet.paymentReference || "",
                                    paymentDate: new Date().toISOString().split("T")[0] || ""
                                  });
                                }}
                              >
                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                Make Payment
                              </Button>
                            )}

                            {/* Step 8: Print Receipt / Voucher (PAID) */}
                            {sheet.status === "PAID" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                                onClick={() => triggerPrintReceipt(sheet)}
                              >
                                <Printer className="w-3.5 h-3.5 mr-1" />
                                Receipt
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: DOCTOR-WISE PAYMENT REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          {/* Reports Filter */}
          <div className="bg-card p-4 rounded-lg border shadow-sm flex flex-wrap gap-4 items-center">
            <div className="w-56">
              <label className="text-xs text-muted-foreground block mb-1">Doctor</label>
              <Select value={reportDoctorId} onValueChange={(val) => val && setReportDoctorId(val)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Doctors</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.fullName || d.name || "Doctor"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-44">
              <label className="text-xs text-muted-foreground block mb-1">From Date</label>
              <Input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="w-44">
              <label className="text-xs text-muted-foreground block mb-1">To Date</label>
              <Input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="pt-5">
              <Button size="sm" onClick={fetchReports} className="h-9">
                <Search className="w-4 h-4 mr-1.5" />
                Generate Report
              </Button>
            </div>
          </div>

          {/* Reports Table */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-base font-bold text-slate-800">
                Doctor-Wise Financial Settlement Report
              </CardTitle>
              <CardDescription className="text-xs">
                Breakdown of consultations, hospital commissions, paid amounts, and outstanding balances.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor Name</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead className="text-center">Sessions</TableHead>
                    <TableHead className="text-center">Total Patients</TableHead>
                    <TableHead className="text-right">Consultation Revenue</TableHead>
                    <TableHead className="text-right">Hospital Commission</TableHead>
                    <TableHead className="text-right font-bold">Doctor Total Earnings</TableHead>
                    <TableHead className="text-right text-emerald-700">Paid Amount</TableHead>
                    <TableHead className="text-right text-amber-700">Pending Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        No financial report records for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((rep) => (
                      <TableRow key={rep.doctorId} className="hover:bg-slate-50/80">
                        <TableCell className="font-bold text-slate-900">{rep.doctorName}</TableCell>
                        <TableCell className="text-slate-600 text-xs">{rep.specialty || "Consultant"}</TableCell>
                        <TableCell className="text-center font-medium">{rep.totalSheets}</TableCell>
                        <TableCell className="text-center font-semibold">{rep.totalPatients}</TableCell>
                        <TableCell className="text-right font-medium">
                          LKR {rep.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-rose-700 font-medium">
                          LKR {rep.hospitalCommission.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900">
                          LKR {rep.doctorEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-700">
                          LKR {rep.paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-amber-700">
                          LKR {rep.pendingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: SHARED PAYMENT HISTORY LEDGER */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="py-4 px-6 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Synchronized Payment History Ledger</CardTitle>
                <CardDescription>
                  Real-time ledger of all doctor share disbursements issued across Front Desk and Fund Office / Super Admin
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search receipt #, doctor..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-8 bg-white h-9"
                  />
                </div>

                <Select value={historyMethod} onValueChange={(val) => val && setHistoryMethod(val)}>
                  <SelectTrigger className="w-36 bg-white h-9">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Methods</SelectItem>
                    <SelectItem value="CASH">Cash Drawer</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="SPLIT">Split Payout</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPaymentHistory}
                  disabled={historyLoading}
                  className="h-9 flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-4 w-4 ${historyLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {historyLoading ? (
                <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                  <p>Loading payment ledger...</p>
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <CheckCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No payment records found</p>
                  <p className="text-xs text-slate-500 mt-1">Disbursements made at Front Desk or Fund Office will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Receipt / Voucher #</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead className="text-center">Patients</TableHead>
                        <TableHead className="text-right">Consultation Revenue</TableHead>
                        <TableHead className="text-right font-bold">Disbursed Amount</TableHead>
                        <TableHead className="text-center">Method</TableHead>
                        <TableHead className="text-center">Disbursed By</TableHead>
                        <TableHead>Reference / Bank Info</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y">
                      {paymentHistory
                        .filter((item) => {
                          if (historySearch) {
                            const term = historySearch.toLowerCase();
                            const docName = item.doctor?.fullName?.toLowerCase() || "";
                            const rcp = item.receiptNumber?.toLowerCase() || "";
                            const ref = item.paymentReference?.toLowerCase() || "";
                            if (!docName.includes(term) && !rcp.includes(term) && !ref.includes(term)) {
                              return false;
                            }
                          }
                          return true;
                        })
                        .map((item) => {
                          const isCash = (item.cashDisbursed || 0) > 0;
                          const isBank = (item.bankDisbursed || 0) > 0;
                          const roleBadgeColor = item.disbursedByRole === "SUPERADMIN" ? "bg-purple-100 text-purple-800 border-purple-300" : "bg-emerald-100 text-emerald-800 border-emerald-300";

                          return (
                            <TableRow key={item.id} className="hover:bg-slate-50/60">
                              <TableCell className="font-mono font-bold text-slate-900 text-xs">
                                {item.receiptNumber || `DOC-RCP-${item.id.slice(0, 8).toUpperCase()}`}
                              </TableCell>

                              <TableCell className="text-xs text-slate-600">
                                {item.paidAt ? new Date(item.paidAt).toLocaleString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                }) : new Date(item.date).toLocaleDateString()}
                              </TableCell>

                              <TableCell>
                                <p className="font-semibold text-slate-900 text-sm">Dr. {item.doctor?.fullName || "Doctor"}</p>
                                <p className="text-xs text-muted-foreground">{item.doctor?.specialty || "Doctor"}</p>
                              </TableCell>

                              <TableCell className="text-center font-semibold text-slate-700">
                                {item.totalPatients}
                              </TableCell>

                              <TableCell className="text-right text-slate-700 font-medium">
                                LKR {item.totalRevenue.toLocaleString()}
                              </TableCell>

                              <TableCell className="text-right font-black text-slate-900 text-sm">
                                LKR {((item.cashDisbursed || 0) + (item.bankDisbursed || 0) || item.netDoctorPayment).toLocaleString()}
                              </TableCell>

                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  {isCash && isBank ? (
                                    <Badge className="bg-amber-600 text-white text-[10px]">SPLIT</Badge>
                                  ) : isCash ? (
                                    <Badge className="bg-emerald-600 text-white text-[10px] flex items-center gap-1">
                                      <Banknote className="h-2.5 w-2.5" /> CASH
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-blue-600 text-white text-[10px] flex items-center gap-1">
                                      <CreditCard className="h-2.5 w-2.5" /> BANK
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell className="text-center">
                                <Badge variant="outline" className={`text-[10px] font-semibold ${roleBadgeColor}`}>
                                  {item.disbursedByRole || "FRONTDESK"}
                                </Badge>
                              </TableCell>

                              <TableCell className="text-xs">
                                {item.paymentReference && (
                                  <p className="font-mono text-slate-800 font-semibold">{item.paymentReference}</p>
                                )}
                                {(item.doctor?.bankAccountNumber || (item.bankDetails as any)?.bankAccountNumber) && (
                                  <p className="text-slate-500 text-[11px] mt-0.5">
                                    {(item.bankDetails as any)?.bankName || item.doctor?.bankName} • {(item.bankDetails as any)?.bankAccountNumber || item.doctor?.bankAccountNumber}
                                  </p>
                                )}
                                {(item.paymentSlipUrl || (item.bankDetails as any)?.slipUrl) && (
                                  <a
                                    href={getSlipViewUrl(item.paymentSlipUrl || (item.bankDetails as any)?.slipUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                                    title="Open Payment Slip"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    Payment Slip
                                    <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                                  </a>
                                )}
                              </TableCell>

                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => triggerPrintReceipt(item)}
                                    className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-700"
                                    title="Print Official Voucher"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedSheet(item)}
                                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                                    title="View Details"
                                  >
                                    <Eye className="h-4 w-4" />
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 1: RECORD DOCTOR DAILY SHEET */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
              Record Doctor Daily Sheet
            </DialogTitle>
            <DialogDescription>
              Record the patients treated by the doctor to automatically calculate consultation revenue, hospital commission, and net doctor payment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSheet} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Doctor Select */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Doctor <span className="text-red-500">*</span>
                </label>
                <Select value={newSheet.doctorId} onValueChange={(val) => val && handleDoctorSelect(val)} required>
                <SelectTrigger>
                    <SelectValue placeholder="Select Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.fullName || d.name || "Doctor"} ({d.specialty || "General"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Clinic Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={newSheet.date}
                  onChange={(e) => setNewSheet({ ...newSheet, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Session Name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Session</label>
                <Input
                  placeholder="e.g. Morning Clinic"
                  value={newSheet.sessionName}
                  onChange={(e) => setNewSheet({ ...newSheet, sessionName: e.target.value })}
                />
              </div>

              {/* Consultation Fee per Patient */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Fee per Patient (LKR) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={newSheet.consultationFee}
                  onChange={(e) =>
                    setNewSheet({ ...newSheet, consultationFee: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              {/* Hospital Commission Rate % */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Hospital Commission % <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={newSheet.commissionRate}
                  onChange={(e) =>
                    setNewSheet({ ...newSheet, commissionRate: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>
            </div>

            {/* Entry Mode Switcher */}
            <div className="p-3 bg-slate-50 rounded-lg border flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Patient Entry Mode</span>
                <span className="text-[11px] text-muted-foreground">
                  Choose quick batch calculation by patient count or itemize individual patients.
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={newSheet.entryMode === "batch" ? "default" : "outline"}
                  className={newSheet.entryMode === "batch" ? "bg-emerald-600" : ""}
                  onClick={() => setNewSheet({ ...newSheet, entryMode: "batch" })}
                >
                  Quick Count
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={newSheet.entryMode === "itemized" ? "default" : "outline"}
                  className={newSheet.entryMode === "itemized" ? "bg-emerald-600" : ""}
                  onClick={() => setNewSheet({ ...newSheet, entryMode: "itemized" })}
                >
                  Itemized Roster
                </Button>
              </div>
            </div>

            {/* Mode A: Batch Count */}
            {newSheet.entryMode === "batch" && (
              <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Total Patients Treated <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 25"
                  value={newSheet.batchPatientCount}
                  onChange={(e) =>
                    setNewSheet({
                      ...newSheet,
                      batchPatientCount: parseInt(e.target.value, 10) || 0
                    })
                  }
                  className="bg-white max-w-xs"
                  required
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  e.g., 25 patients @ LKR {newSheet.consultationFee.toLocaleString()} = LKR{" "}
                  {(
                    (newSheet.batchPatientCount || 0) * (newSheet.consultationFee || 0)
                  ).toLocaleString()}
                </p>
              </div>
            )}

            {/* Mode B: Itemized Roster */}
            {newSheet.entryMode === "itemized" && (
              <div className="space-y-2 border p-3 rounded-lg max-h-56 overflow-y-auto">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-800">Itemized Patients</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setNewSheet({
                        ...newSheet,
                        patientItems: [
                          ...newSheet.patientItems,
                          {
                            patientName: "",
                            tokenNumber: "",
                            consultationFee: newSheet.consultationFee
                          }
                        ]
                      })
                    }
                  >
                    + Add Patient
                  </Button>
                </div>

                {newSheet.patientItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                    <Input
                      placeholder="Patient Name"
                      value={item.patientName}
                      onChange={(e) => {
                        const updated = [...newSheet.patientItems];
                        updated[idx].patientName = e.target.value;
                        setNewSheet({ ...newSheet, patientItems: updated });
                      }}
                      className="h-8 text-xs flex-1"
                    />
                    <Input
                      placeholder="Token #"
                      value={item.tokenNumber}
                      onChange={(e) => {
                        const updated = [...newSheet.patientItems];
                        updated[idx].tokenNumber = e.target.value;
                        setNewSheet({ ...newSheet, patientItems: updated });
                      }}
                      className="h-8 text-xs w-28"
                    />
                    <Input
                      type="number"
                      placeholder="Fee"
                      value={item.consultationFee}
                      onChange={(e) => {
                        const updated = [...newSheet.patientItems];
                        updated[idx].consultationFee = parseFloat(e.target.value) || 0;
                        setNewSheet({ ...newSheet, patientItems: updated });
                      }}
                      className="h-8 text-xs w-24"
                    />
                    {newSheet.patientItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500"
                        onClick={() => {
                          const updated = newSheet.patientItems.filter((_, i) => i !== idx);
                          setNewSheet({ ...newSheet, patientItems: updated });
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Other Adjustments & Remarks */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Other Deductions / Adjustments (LKR)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={newSheet.otherAdjustments}
                  onChange={(e) =>
                    setNewSheet({ ...newSheet, otherAdjustments: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Remarks</label>
                <Input
                  placeholder="Optional clinic remarks"
                  value={newSheet.remarks}
                  onChange={(e) => setNewSheet({ ...newSheet, remarks: e.target.value })}
                />
              </div>
            </div>

            {/* Live Calculation Preview Banner */}
            <div className="bg-slate-900 text-white rounded-lg p-4 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Automatic Payment Calculation
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs border-b border-slate-700 pb-2">
                <div>
                  <span className="text-slate-400 block">Total Patients</span>
                  <span className="text-sm font-bold">{liveSummary.patientCount}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Total Revenue</span>
                  <span className="text-sm font-bold text-slate-200">
                    LKR {liveSummary.grossRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-rose-400 block">Hospital Commission ({newSheet.commissionRate}%)</span>
                  <span className="text-sm font-bold text-rose-300">
                    - LKR {liveSummary.commAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <div>
                  <span className="text-xs font-bold text-emerald-400 block">
                    NET DOCTOR PAYMENT = Total Revenue − Commission
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-400">
                    LKR {liveSummary.netDoctorPayment.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Save Daily Sheet (Draft)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: DISBURSE PAYMENT (Step 7) */}
      <Dialog open={!!payingSheet} onOpenChange={() => setPayingSheet(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Disburse Doctor Payment
            </DialogTitle>
            <DialogDescription>
              Record the payment disbursement details for {payingSheet?.doctor?.fullName || payingSheet?.doctor?.name}.
            </DialogDescription>
          </DialogHeader>

          {payingSheet && (
            <form onSubmit={handleDisbursePayment} className="space-y-4">
              <div className="bg-emerald-50 p-3.5 rounded-lg border border-emerald-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Doctor:</span>
                  <span className="font-bold text-slate-800">
                    {payingSheet.doctor?.fullName || payingSheet.doctor?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Clinic Date:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(payingSheet.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Patients:</span>
                  <span className="font-medium text-slate-800">{payingSheet.totalPatients}</span>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-1 text-sm font-bold text-emerald-900">
                  <span>Payable Amount:</span>
                  <span>
                    LKR {payingSheet.netDoctorPayment.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {(payingSheet.cashDoctorShare !== undefined || payingSheet.bankDoctorShare !== undefined) && (
                  <div className="flex justify-between text-[11px] text-slate-600 pt-1 border-t border-emerald-200/60">
                    <span>💵 Cash Share (Drawer): LKR {(payingSheet.cashDoctorShare || 0).toLocaleString()}</span>
                    <span>💳 Bank Share: LKR {(payingSheet.bankDoctorShare || 0).toLocaleString()}</span>
                  </div>
                )}
                {payingSheet.doctor?.bankAccountNumber && (
                  <div className="pt-1 text-[11px] text-blue-800 font-semibold border-t border-emerald-200/60 flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    Doctor Bank: {payingSheet.doctor.bankName} • {payingSheet.doctor.bankAccountNumber}
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <Select
                  value={disbursementForm.paymentMethod}
                  onValueChange={(val) => {
                    if (val) setDisbursementForm({ ...disbursementForm, paymentMethod: val });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Reference Number */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Payment Reference Number <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <Input
                  placeholder="e.g. BT-99881122 or CHQ-00445 (optional)"
                  value={disbursementForm.paymentReference}
                  onChange={(e) =>
                    setDisbursementForm({ ...disbursementForm, paymentReference: e.target.value })
                  }
                />
                <span className="text-[11px] text-muted-foreground">
                  Transaction ID or reference number (optional). Saved with the disbursement record.
                </span>
              </div>

              {/* Payment Slip Upload Box */}
              <div className="border border-dashed border-emerald-300 rounded-lg p-3 bg-emerald-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <UploadCloud className="h-4 w-4 text-emerald-600" />
                    Upload Payment Slip (Image or PDF)
                  </label>
                  {uploadingDisbursementSlip && (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Uploading to S3...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleDisbursementSlipUpload}
                    disabled={uploadingDisbursementSlip}
                    className="bg-white text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer"
                  />
                  {disbursementSlipUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDisbursementSlipFile(null);
                        setDisbursementSlipUrl("");
                      }}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Remove slip"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {disbursementSlipUrl && (
                  <div className="flex items-center justify-between bg-white border border-emerald-200 rounded p-2 text-xs">
                    <span className="text-emerald-900 font-medium truncate max-w-[280px] flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      {disbursementSlipFile?.name || "Payment Slip Attached"}
                    </span>
                    <a
                      href={getSlipViewUrl(disbursementSlipUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 hover:underline text-[11px]"
                    >
                      <ExternalLink className="h-3 w-3" /> View Slip
                    </a>
                  </div>
                )}
                <p className="text-[10px] text-slate-500">
                  Optional or required by hospital policy. Stored securely on AWS S3 and linked to this payout.
                </p>
              </div>

              {/* Payment Date */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={disbursementForm.paymentDate}
                  onChange={(e) =>
                    setDisbursementForm({ ...disbursementForm, paymentDate: e.target.value })
                  }
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayingSheet(null)}
                  disabled={disbursing || uploadingDisbursementSlip}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={disbursing || uploadingDisbursementSlip}
                >
                  {disbursing ? "Disbursing..." : "Confirm Payment & Issue Receipt"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: VIEW SHEET DETAILS & PATIENT ROSTER */}
      <Dialog open={!!selectedSheet} onOpenChange={() => setSelectedSheet(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span>Doctor Daily Sheet Breakdown</span>
              {selectedSheet && getStatusBadge(selectedSheet.status)}
            </DialogTitle>
            <DialogDescription>
              {selectedSheet?.doctor?.fullName || selectedSheet?.doctor?.name} |{" "}
              {selectedSheet && new Date(selectedSheet.date).toLocaleDateString()} (
              {selectedSheet?.sessionName})
            </DialogDescription>
          </DialogHeader>

          {selectedSheet && (
            <div className="space-y-4">
              {/* Calculation Summary Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block">Patients & Consultation Fee:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedSheet.totalPatients} Patients @ LKR {selectedSheet.consultationFee.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Gross Revenue:</span>
                  <span className="font-bold text-slate-900">
                    LKR {selectedSheet.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">
                    Hospital Commission ({selectedSheet.commissionRate}%):
                  </span>
                  <span className="font-bold text-rose-700">
                    - LKR {selectedSheet.hospitalCommission.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Doctor Net Payment:</span>
                  <span className="font-black text-emerald-800 text-sm">
                    LKR {selectedSheet.netDoctorPayment.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Disbursement details if paid */}
              {selectedSheet.status === "PAID" && (
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs space-y-1">
                  <div className="font-bold text-emerald-900">Payment Disbursement Details</div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Receipt Number:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedSheet.receiptNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Method & Reference:</span>
                    <span className="font-bold text-slate-800">
                      {selectedSheet.paymentMethod} (Ref: {selectedSheet.paymentReference})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Paid At:</span>
                    <span className="text-slate-800">
                      {selectedSheet.paidAt ? new Date(selectedSheet.paidAt).toLocaleString() : "-"}
                    </span>
                  </div>
                  {(selectedSheet.paymentSlipUrl || (selectedSheet.bankDetails as any)?.slipUrl) && (
                    <div className="flex justify-between items-center pt-1 border-t border-emerald-200">
                      <span className="text-slate-600">Payment Slip:</span>
                      <a
                        href={getSlipViewUrl(selectedSheet.paymentSlipUrl || (selectedSheet.bankDetails as any)?.slipUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> View Uploaded Slip
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Patient Roster */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Patient Consultation Roster ({selectedSheet.patientItems?.length || 0} Records)
                </h4>
                <div className="border rounded-md overflow-hidden max-h-56 overflow-y-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Patient Name</TableHead>
                        <TableHead>Token / Ref</TableHead>
                        <TableHead className="text-right">Consultation Fee</TableHead>
                        <TableHead className="text-right">Doc Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!selectedSheet.patientItems || selectedSheet.patientItems.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                            No individual patient records attached to this sheet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedSheet.patientItems.map((item, idx) => (
                          <TableRow key={item.id || idx}>
                            <TableCell className="text-slate-400">{idx + 1}</TableCell>
                            <TableCell className="font-semibold">{item.patientName}</TableCell>
                            <TableCell className="font-mono text-[11px] text-muted-foreground">
                              {item.tokenNumber || item.appointmentId || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              LKR {item.consultationFee.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-700">
                              LKR{" "}
                              {(
                                item.doctorShare ||
                                item.consultationFee * (1 - selectedSheet.commissionRate / 100)
                              ).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter className="flex justify-between items-center">
                {selectedSheet.status === "PAID" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-emerald-800 border-emerald-300"
                    onClick={() => {
                      triggerPrintReceipt(selectedSheet);
                    }}
                  >
                    <Printer className="w-4 h-4 mr-1.5" />
                    Print Voucher Receipt
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedSheet(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
