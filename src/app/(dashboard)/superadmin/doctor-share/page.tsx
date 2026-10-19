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
  Banknote,
  CreditCard,
  Printer,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Eye,
  AlertCircle,
  Building,
  CheckCheck,
  DollarSign,
  ArrowRightLeft,
  Calendar,
  Wallet,
  UploadCloud,
  FileText,
  ExternalLink,
  Paperclip,
  Trash2,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { useReactToPrint } from "react-to-print";
import {
  DoctorPaymentReceiptTemplate,
  DoctorDailySheetData
} from "@/components/printing/DoctorPaymentReceiptTemplate";

export default function SuperadminDoctorSharePage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0] || ""
  );
  const [filterDoctorId, setFilterDoctorId] = useState<string>("ALL");
  const [doctors, setDoctors] = useState<any[]>([]);

  // Active Daily Sheets
  const [sheets, setSheets] = useState<DoctorDailySheetData[]>([]);

  // Unified Payment History
  const [history, setHistory] = useState<DoctorDailySheetData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilterMethod, setHistoryFilterMethod] = useState("ALL");
  const [historyFilterDoctor, setHistoryFilterDoctor] = useState("ALL");
  const [historySearchTerm, setHistorySearchTerm] = useState("");

  // Cash Payout Modal
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [cashTargetSheet, setCashTargetSheet] = useState<DoctorDailySheetData | null>(null);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cashRemarks, setCashRemarks] = useState<string>("");
  const [disbursingCash, setDisbursingCash] = useState(false);

  // Bank Transfer Payout Modal
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankTargetSheet, setBankTargetSheet] = useState<DoctorDailySheetData | null>(null);
  const [bankAmount, setBankAmount] = useState<number>(0);
  const [bankReference, setBankReference] = useState<string>("");
  const [bankRemarks, setBankRemarks] = useState<string>("");
  const [bankDetailsForm, setBankDetailsForm] = useState({
    bankName: "",
    bankBranch: "",
    bankAccountNumber: "",
    bankAccountName: ""
  });
  const [bankSlipFile, setBankSlipFile] = useState<File | null>(null);
  const [bankSlipUrl, setBankSlipUrl] = useState<string>("");
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [disbursingBank, setDisbursingBank] = useState(false);

  // Doctor Bank Details Edit Modal
  const [bankEditModalOpen, setBankEditModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [doctorBankForm, setDoctorBankForm] = useState({
    bankName: "",
    bankBranch: "",
    bankAccountNumber: "",
    bankAccountName: ""
  });
  const [savingBank, setSavingBank] = useState(false);

  // View Details Modal
  const [viewSheet, setViewSheet] = useState<DoctorDailySheetData | null>(null);

  // Printing state
  const [printSheet, setPrintSheet] = useState<DoctorDailySheetData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Doctor_Share_Receipt_${printSheet?.receiptNumber || "voucher"}`,
    onAfterPrint: () => setPrintSheet(null)
  });

  const triggerPrint = (sheet: DoctorDailySheetData) => {
    setPrintSheet(sheet);
    setTimeout(() => {
      handlePrint();
    }, 200);
  };

  useEffect(() => {
    if (token) {
      loadInitialData();
    }
  }, [token, selectedDate]);

  useEffect(() => {
    if (activeTab === "history" && token) {
      fetchPaymentHistory();
    }
  }, [activeTab, token]);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchDoctors(), fetchFrontdeskDoctorShares()]);
    setLoading(false);
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${API}/users?role=Doctor`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDoctors(data.data || []);
      }
    } catch (err) {
      console.error("fetchDoctors error:", err);
    }
  };

  const fetchFrontdeskDoctorShares = async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append("date", selectedDate);
      if (filterDoctorId && filterDoctorId !== "ALL") params.append("doctorId", filterDoctorId);

      const res = await fetch(`${API}/fund-office/frontdesk/doctor-shares?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSheets(data.data || []);
      } else {
        toast.error(data.error || "Failed to load doctor share records");
      }
    } catch (err: any) {
      console.error("fetchFrontdeskDoctorShares error:", err);
      toast.error("Network error while loading doctor shares");
    } finally {
      setRefreshing(false);
    }
  };

  const fetchPaymentHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (historyFilterDoctor && historyFilterDoctor !== "ALL") {
        params.append("doctorId", historyFilterDoctor);
      }
      if (historyFilterMethod && historyFilterMethod !== "ALL") {
        params.append("paymentMethod", historyFilterMethod);
      }

      const res = await fetch(`${API}/fund-office/payment-history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.data || []);
      }
    } catch (err) {
      console.error("fetchPaymentHistory error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Open Cash Payout Modal
  const openCashPayout = (sheet: DoctorDailySheetData) => {
    const remainingCash = Math.max(0, (sheet.cashDoctorShare || 0) - (sheet.cashDisbursed || 0));
    setCashTargetSheet(sheet);
    setCashAmount(remainingCash);
    setCashRemarks(`Front Desk Cash Payout for Dr. ${sheet.doctor?.fullName || "Doctor"}`);
    setCashModalOpen(true);
  };

  // Submit Cash Payout
  const submitCashPayout = async () => {
    if (!cashTargetSheet) return;
    if (cashAmount <= 0) {
      toast.error("Please enter a valid cash amount to disburse");
      return;
    }

    const remainingCash = Math.max(0, (cashTargetSheet.cashDoctorShare || 0) - (cashTargetSheet.cashDisbursed || 0));
    if (cashAmount > remainingCash + 0.01) {
      toast.error(`Cannot disburse more than the available cash share (Max: LKR ${remainingCash.toLocaleString()})`);
      return;
    }

    setDisbursingCash(true);
    try {
      const res = await fetch(`${API}/fund-office/daily-sheets/${cashTargetSheet.id}/disburse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          disbursementType: "CASH",
          cashAmount,
          remarks: cashRemarks
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Cash payout of LKR ${cashAmount.toLocaleString()} completed!`);
        setCashModalOpen(false);
        await fetchFrontdeskDoctorShares();
        if (data.data) {
          triggerPrint(data.data);
        }
      } else {
        toast.error(data.error || "Failed to process cash disbursement");
      }
    } catch (err: any) {
      toast.error("Network error processing cash payout");
    } finally {
      setDisbursingCash(false);
    }
  };

  // Open Bank Transfer Payout Modal
  const openBankTransfer = (sheet: DoctorDailySheetData) => {
    const remainingBank = Math.max(0, (sheet.bankDoctorShare || 0) - (sheet.bankDisbursed || 0));
    setBankTargetSheet(sheet);
    setBankAmount(remainingBank);
    setBankReference(sheet.paymentReference || "");
    setBankSlipFile(null);
    setBankSlipUrl(sheet.paymentSlipUrl || (sheet.bankDetails as any)?.slipUrl || "");
    setBankRemarks(`Bank Transfer payout for Dr. ${sheet.doctor?.fullName || "Doctor"}`);
    setBankDetailsForm({
      bankName: sheet.doctor?.bankName || (sheet.bankDetails as any)?.bankName || "",
      bankBranch: sheet.doctor?.bankBranch || (sheet.bankDetails as any)?.bankBranch || "",
      bankAccountNumber: sheet.doctor?.bankAccountNumber || (sheet.bankDetails as any)?.bankAccountNumber || "",
      bankAccountName: sheet.doctor?.bankAccountName || (sheet.bankDetails as any)?.bankAccountName || sheet.doctor?.fullName || ""
    });
    setBankModalOpen(true);
  };

  // Helper to ensure private S3 slips open via secure pre-signed redirect
  const getSlipViewUrl = (url?: string) => {
    if (!url) return "#";
    if (url.includes("X-Amz-Signature") || url.includes("Signature=")) return url;
    return `${API}/fund-office/view-slip?url=${encodeURIComponent(url)}`;
  };

  // Upload Payment Slip to S3
  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size exceeds 15MB limit");
      return;
    }

    setBankSlipFile(file);
    setUploadingSlip(true);
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
        setBankSlipUrl(data.presignedUrl || data.fileUrl);
        toast.success("Payment slip uploaded successfully!");
      } else {
        toast.error(data.error || "Failed to upload payment slip");
      }
    } catch (err: any) {
      toast.error("Network error uploading payment slip");
    } finally {
      setUploadingSlip(false);
    }
  };

  // Submit Bank Transfer Payout
  const submitBankTransfer = async () => {
    if (!bankTargetSheet) return;
    if (bankAmount <= 0) {
      toast.error("Please enter a valid bank transfer amount");
      return;
    }

    setDisbursingBank(true);
    try {
      const res = await fetch(`${API}/fund-office/daily-sheets/${bankTargetSheet.id}/disburse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          disbursementType: "BANK_TRANSFER",
          bankAmount,
          paymentReference: bankReference.trim() || undefined,
          paymentSlipUrl: bankSlipUrl.trim() || undefined,
          bankDetails: {
            ...bankDetailsForm,
            slipUrl: bankSlipUrl.trim() || undefined
          },
          remarks: bankRemarks
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Bank transfer payout of LKR ${bankAmount.toLocaleString()} recorded!`);
        setBankModalOpen(false);
        await fetchFrontdeskDoctorShares();
        if (data.data) {
          triggerPrint(data.data);
        }
      } else {
        toast.error(data.error || "Failed to record bank disbursement");
      }
    } catch (err: any) {
      toast.error("Network error recording bank transfer");
    } finally {
      setDisbursingBank(false);
    }
  };

  // Open Edit Doctor Bank Details Modal
  const openDoctorBankEdit = (doc: any) => {
    setEditingDoctor(doc);
    setDoctorBankForm({
      bankName: doc?.bankName || "",
      bankBranch: doc?.bankBranch || "",
      bankAccountNumber: doc?.bankAccountNumber || "",
      bankAccountName: doc?.bankAccountName || doc?.fullName || ""
    });
    setBankEditModalOpen(true);
  };

  // Save Doctor Bank Details
  const saveDoctorBankDetails = async () => {
    if (!editingDoctor) return;
    setSavingBank(true);
    try {
      const res = await fetch(`${API}/fund-office/doctors/${editingDoctor.id}/bank-details`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(doctorBankForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Doctor bank details updated successfully");
        setBankEditModalOpen(false);
        await fetchFrontdeskDoctorShares();
      } else {
        toast.error(data.error || "Failed to update bank details");
      }
    } catch (err: any) {
      toast.error("Network error updating bank details");
    } finally {
      setSavingBank(false);
    }
  };

  // Calculation Metrics
  const totalEligibleShare = sheets.reduce((sum, s) => sum + (s.netDoctorPayment || 0), 0);
  const totalCashAvailable = sheets.reduce((sum, s) => sum + Math.max(0, (s.cashDoctorShare || 0) - (s.cashDisbursed || 0)), 0);
  const totalBankPending = sheets.reduce((sum, s) => sum + Math.max(0, (s.bankDoctorShare || 0) - (s.bankDisbursed || 0)), 0);
  const totalDisbursedToday = sheets.reduce((sum, s) => sum + (s.cashDisbursed || 0) + (s.bankDisbursed || 0), 0);

  // Filtered History
  const filteredHistory = history.filter((h) => {
    if (historySearchTerm) {
      const term = historySearchTerm.toLowerCase();
      const docName = h.doctor?.fullName?.toLowerCase() || "";
      const rcp = h.receiptNumber?.toLowerCase() || "";
      const ref = h.paymentReference?.toLowerCase() || "";
      if (!docName.includes(term) && !rcp.includes(term) && !ref.includes(term)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex-1 p-6 h-[calc(100vh-56px)] overflow-y-auto bg-background animate-in fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hidden printable receipt template */}
        <DoctorPaymentReceiptTemplate ref={printRef} sheet={printSheet} />

        {/* Page Header with Back Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/superadmin/finance")}
              className="shrink-0 mt-0.5"
              title="Back to Finance Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Stethoscope className="h-7 w-7 text-emerald-600" />
                  Doctor Share Disbursements & Payouts
                </h1>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Super Admin & Finance
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Disburse and track doctor consultation fee shares. Cash collections are issued as cash vouchers; card and bank collections are routed to bank transfer.
              </p>
            </div>
          </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40 bg-background dark:bg-card border-border text-foreground"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFrontdeskDoctorShares}
            disabled={refreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-slate-700 dark:border-l-slate-400 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-muted-foreground">
              Total Doctor Share
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              LKR {totalEligibleShare.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Total calculated share across {sheets.length} doctors today
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 shadow-sm bg-emerald-50/20 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-emerald-800 dark:text-emerald-400">
              Available Cash Share (Drawer)
              <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              LKR {totalCashAvailable.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Collected as Cash • Safe to issue at Front Desk
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600 shadow-sm bg-blue-50/20 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-blue-800 dark:text-blue-400">
              Bank Transfer Share (Card/QR)
              <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              LKR {totalBankPending.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-blue-800 dark:text-blue-300">
              Collected via POS/Card • Issued via Bank Transfer
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600 shadow-sm bg-purple-50/20 dark:bg-purple-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-purple-800 dark:text-purple-400">
              Total Disbursed Today
              <CheckCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              LKR {totalDisbursedToday.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Cash Vouchers + Bank Transfers issued
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("active")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "active"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wallet className="h-4 w-4" />
          Active Doctor Shares ({sheets.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "history"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4" />
          Shared Payment History Ledger
        </button>
      </div>

      {/* TAB 1: ACTIVE DOCTOR SHARES */}
      {activeTab === "active" && (
        <Card className="shadow-sm">
          <CardHeader className="py-4 px-6 border-b border-border bg-muted/40 dark:bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Doctor Daily Shares for {selectedDate}</CardTitle>
              <CardDescription>
                Review consultation earnings and disburse payments directly from the front desk
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Select value={filterDoctorId} onValueChange={(val) => val && setFilterDoctorId(val)}>
                <SelectTrigger className="w-56 bg-background dark:bg-card border-border text-foreground">
                  <SelectValue placeholder="All Doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Doctors</SelectItem>
                  {doctors.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      Dr. {doc.fullName} ({doc.specialty || "General"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                <p>Loading doctor share rosters...</p>
              </div>
            ) : sheets.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-foreground">No doctor consultation sheets found for {selectedDate}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Once consultations are completed or synced by Fund Office, they will automatically appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50 dark:bg-muted/20 border-b border-border">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>Doctor</TableHead>
                      <TableHead className="text-center">Patients Treated</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                      <TableHead className="text-right">Hospital Comm.</TableHead>
                      <TableHead className="text-right font-bold">Net Doctor Share</TableHead>
                      <TableHead className="text-center">💵 Cash Share (Drawer)</TableHead>
                      <TableHead className="text-center">💳 Bank Transfer Share</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border">
                    {sheets.map((sheet) => {
                      const remainingCash = Math.max(0, (sheet.cashDoctorShare || 0) - (sheet.cashDisbursed || 0));
                      const remainingBank = Math.max(0, (sheet.bankDoctorShare || 0) - (sheet.bankDisbursed || 0));
                      const isFullyDisbursed = sheet.status === "PAID" || (remainingCash === 0 && remainingBank === 0 && (sheet.cashDisbursed || 0) + (sheet.bankDisbursed || 0) > 0);

                      return (
                        <TableRow key={sheet.id} className="hover:bg-muted/50 dark:hover:bg-muted/20 border-b border-border">
                          <TableCell>
                            <div>
                              <p className="font-bold text-foreground">Dr. {sheet.doctor?.fullName || "Doctor"}</p>
                              <p className="text-xs text-muted-foreground">{sheet.doctor?.specialty || "Consultant"}</p>
                              {sheet.doctor?.bankAccountNumber ? (
                                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1 mt-0.5">
                                  <Building className="h-3 w-3" />
                                  {sheet.doctor.bankName} • {sheet.doctor.bankAccountNumber}
                                </p>
                              ) : (
                                <button
                                  onClick={() => openDoctorBankEdit(sheet.doctor)}
                                  className="text-[11px] text-amber-600 dark:text-amber-400 underline hover:text-amber-700 flex items-center gap-1 mt-0.5"
                                >
                                  + Add Bank Details
                                </button>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <span className="font-semibold text-foreground">{sheet.totalPatients}</span>
                            <div className="flex items-center justify-center gap-1 text-[10px] mt-0.5">
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                {sheet.patientItems?.filter((p) => (p.collectionMethod || "CASH") === "CASH").length || 0} Cash
                              </span>
                              <span>•</span>
                              <span className="text-blue-700 dark:text-blue-400 font-medium">
                                {sheet.patientItems?.filter((p) => (p.collectionMethod || "CASH") !== "CASH").length || 0} Card
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right font-medium">
                            LKR {sheet.totalRevenue.toLocaleString()}
                          </TableCell>

                          <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">
                            - LKR {(sheet.hospitalCommission || 0).toLocaleString()}
                            <span className="text-[10px] block text-muted-foreground font-normal">
                              ({sheet.commissionRate}%)
                            </span>
                          </TableCell>

                          <TableCell className="text-right font-black text-foreground text-base">
                            LKR {sheet.netDoctorPayment.toLocaleString()}
                          </TableCell>

                          {/* Cash Share Column */}
                          <TableCell className="text-center">
                            <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
                              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                LKR {(sheet.cashDoctorShare || 0).toLocaleString()}
                              </p>
                              {(sheet.cashDisbursed || 0) > 0 ? (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                                  ✓ Disbursed: LKR {sheet.cashDisbursed?.toLocaleString()}
                                </p>
                              ) : (
                                <p className="text-[10px] text-muted-foreground mt-0.5">Ready for cash payout</p>
                              )}
                            </div>
                          </TableCell>

                          {/* Bank Share Column */}
                          <TableCell className="text-center">
                            <div className="bg-blue-50 dark:bg-blue-950/40 rounded-lg p-2 border border-blue-200 dark:border-blue-800/60">
                              <p className="text-xs font-bold text-blue-800 dark:text-blue-300">
                                LKR {(sheet.bankDoctorShare || 0).toLocaleString()}
                              </p>
                              {(sheet.bankDisbursed || 0) > 0 ? (
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                                  ✓ Transferred: LKR {sheet.bankDisbursed?.toLocaleString()}
                                </p>
                              ) : (
                                <p className="text-[10px] text-muted-foreground mt-0.5">Card/Online receipts</p>
                              )}
                            </div>
                          </TableCell>

                          {/* Status Badge */}
                          <TableCell className="text-center">
                            {isFullyDisbursed ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-semibold">
                                ✓ PAID
                              </Badge>
                            ) : sheet.status === "APPROVED" ? (
                              <Badge className="bg-blue-600 hover:bg-blue-600 text-white">
                                APPROVED
                              </Badge>
                            ) : sheet.status === "VERIFIED" ? (
                              <Badge variant="outline" className="text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40">
                                VERIFIED
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-foreground">
                                DRAFT
                              </Badge>
                            )}
                          </TableCell>

                          {/* Action Buttons */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Cash Payout Button */}
                              {remainingCash > 0 && (
                                <Button
                                  size="sm"
                                  onClick={() => openCashPayout(sheet)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2.5 flex items-center gap-1"
                                >
                                  <Banknote className="h-3.5 w-3.5" />
                                  Issue Cash
                                </Button>
                              )}

                              {/* Bank Transfer Button */}
                              {remainingBank > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openBankTransfer(sheet)}
                                  className="border-blue-600 text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-500 dark:hover:bg-blue-950/50 text-xs h-8 px-2.5 flex items-center gap-1"
                                >
                                  <CreditCard className="h-3.5 w-3.5" />
                                  Bank Transfer
                                </Button>
                              )}

                              {/* Details / View Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewSheet(sheet)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                title="View Patient Roster"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {/* Print Receipt / Voucher */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => triggerPrint(sheet)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-500"
                                title="Print Official Voucher"
                              >
                                <Printer className="h-4 w-4" />
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
      )}

      {/* TAB 2: SHARED PAYMENT HISTORY LEDGER */}
      {activeTab === "history" && (
        <Card className="shadow-sm">
          <CardHeader className="py-4 px-6 border-b border-border bg-muted/40 dark:bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Synchronized Payment History Ledger</CardTitle>
              <CardDescription>
                Unified record of all doctor share disbursements across Front Desk and Super Admin
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search receipt #, doctor..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="pl-8 bg-background dark:bg-card border-border text-foreground h-9"
                />
              </div>

              <Select value={historyFilterMethod} onValueChange={(val) => val && setHistoryFilterMethod(val)}>
                <SelectTrigger className="w-36 bg-background dark:bg-card border-border text-foreground h-9">
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
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                <p>Loading payment ledger...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-foreground">No payment records found</p>
                <p className="text-xs text-muted-foreground mt-1">Disbursements made will be permanently recorded here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50 dark:bg-muted/20 border-b border-border">
                    <TableRow className="border-border hover:bg-transparent">
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
                  <TableBody className="divide-y divide-border">
                    {filteredHistory.map((item) => {
                      const isCash = (item.cashDisbursed || 0) > 0;
                      const isBank = (item.bankDisbursed || 0) > 0;
                      const roleBadgeColor = item.disbursedByRole === "SUPERADMIN" ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800" : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/50 dark:hover:bg-muted/20 border-b border-border">
                          <TableCell className="font-mono font-bold text-foreground text-xs">
                            {item.receiptNumber || `DOC-RCP-${item.id.slice(0, 8).toUpperCase()}`}
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {item.paidAt ? new Date(item.paidAt).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            }) : new Date(item.date).toLocaleDateString()}
                          </TableCell>

                          <TableCell>
                            <p className="font-semibold text-foreground text-sm">Dr. {item.doctor?.fullName || "Doctor"}</p>
                            <p className="text-xs text-muted-foreground">{item.doctor?.specialty || "Doctor"}</p>
                          </TableCell>

                          <TableCell className="text-center font-semibold text-foreground">
                            {item.totalPatients}
                          </TableCell>

                          <TableCell className="text-right text-foreground font-medium">
                            LKR {item.totalRevenue.toLocaleString()}
                          </TableCell>

                          <TableCell className="text-right font-black text-foreground text-sm">
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
                              <p className="font-mono text-foreground font-semibold">{item.paymentReference}</p>
                            )}
                            {(item.doctor?.bankAccountNumber || (item.bankDetails as any)?.bankAccountNumber) && (
                              <p className="text-muted-foreground text-[11px] mt-0.5">
                                {(item.bankDetails as any)?.bankName || item.doctor?.bankName} • {(item.bankDetails as any)?.bankAccountNumber || item.doctor?.bankAccountNumber}
                              </p>
                            )}
                            {(item.paymentSlipUrl || (item.bankDetails as any)?.slipUrl) && (
                              <a
                                href={getSlipViewUrl(item.paymentSlipUrl || (item.bankDetails as any)?.slipUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline mt-1 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800"
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
                                onClick={() => triggerPrint(item)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-500"
                                title="Print Official Voucher"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewSheet(item)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
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
      )}

      {/* MODAL 1: ISSUE CASH PAYOUT */}
      <Dialog open={cashModalOpen} onOpenChange={setCashModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
              <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Issue Cash Share from Front Desk
            </DialogTitle>
            <DialogDescription>
              Disburse cash voucher to Dr. {cashTargetSheet?.doctor?.fullName} from drawer cash collections.
            </DialogDescription>
          </DialogHeader>

          {cashTargetSheet && (
            <div className="space-y-4 py-2">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-emerald-800 dark:text-emerald-300 font-medium">Doctor Name:</span>
                  <span className="font-bold text-emerald-950 dark:text-emerald-100">Dr. {cashTargetSheet.doctor?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-800 dark:text-emerald-300 font-medium">Total Cash Collections:</span>
                  <span className="font-semibold text-emerald-950 dark:text-emerald-100">
                    LKR {(cashTargetSheet.cashRevenue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-800 dark:text-emerald-300 font-medium">Eligible Cash Share:</span>
                  <span className="font-bold text-emerald-950 dark:text-emerald-100">
                    LKR {(cashTargetSheet.cashDoctorShare || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-emerald-300 dark:border-emerald-800 pt-1">
                  <span className="text-emerald-900 dark:text-emerald-200 font-bold">Max Allowed Cash Payout:</span>
                  <span className="font-black text-emerald-900 dark:text-emerald-200 text-sm">
                    LKR {Math.max(0, (cashTargetSheet.cashDoctorShare || 0) - (cashTargetSheet.cashDisbursed || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Cash Amount to Disburse (LKR) *
                </label>
                <Input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                  className="font-bold text-base text-foreground bg-background dark:bg-card border-border"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Must not exceed drawer cash collections. Card collections cannot be paid out in cash.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Voucher / Drawer Remarks
                </label>
                <Input
                  value={cashRemarks}
                  onChange={(e) => setCashRemarks(e.target.value)}
                  placeholder="e.g. Front desk morning shift payout"
                  className="bg-background dark:bg-card border-border text-foreground"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCashModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitCashPayout}
              disabled={disbursingCash}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              {disbursingCash ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Confirm & Print Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ISSUE BANK TRANSFER PAYOUT */}
      <Dialog open={bankModalOpen} onOpenChange={setBankModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-400">
              <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Issue Bank Transfer Doctor Payout
            </DialogTitle>
            <DialogDescription>
              Record bank transfer disbursement for Dr. {bankTargetSheet?.doctor?.fullName} from card/online collections.
            </DialogDescription>
          </DialogHeader>

          {bankTargetSheet && (
            <div className="space-y-4 py-2">
              <div className="bg-blue-50 dark:bg-blue-950/40 rounded-lg p-3 border border-blue-200 dark:border-blue-800/60 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-blue-800 dark:text-blue-300 font-medium">Doctor:</span>
                  <span className="font-bold text-blue-950 dark:text-blue-100">Dr. {bankTargetSheet.doctor?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800 dark:text-blue-300 font-medium">Card/Bank Collections:</span>
                  <span className="font-semibold text-blue-950 dark:text-blue-100">
                    LKR {(bankTargetSheet.cardRevenue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-blue-300 dark:border-blue-800 pt-1">
                  <span className="text-blue-900 dark:text-blue-200 font-bold">Doctor Bank Share Payable:</span>
                  <span className="font-black text-blue-900 dark:text-blue-200 text-sm">
                    LKR {Math.max(0, (bankTargetSheet.bankDoctorShare || 0) - (bankTargetSheet.bankDisbursed || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Bank Account Fields */}
              <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/40 dark:bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Doctor Bank Account Information
                  </span>
                  <span className="text-[10px] text-muted-foreground">Editable on the fly</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-0.5">Bank Name</label>
                    <Input
                      value={bankDetailsForm.bankName}
                      onChange={(e) => setBankDetailsForm({ ...bankDetailsForm, bankName: e.target.value })}
                      placeholder="e.g. Commercial Bank"
                      className="bg-background dark:bg-card border-border text-foreground h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-0.5">Branch</label>
                    <Input
                      value={bankDetailsForm.bankBranch}
                      onChange={(e) => setBankDetailsForm({ ...bankDetailsForm, bankBranch: e.target.value })}
                      placeholder="e.g. Tissamaharama"
                      className="bg-background dark:bg-card border-border text-foreground h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-0.5">Account Number</label>
                    <Input
                      value={bankDetailsForm.bankAccountNumber}
                      onChange={(e) => setBankDetailsForm({ ...bankDetailsForm, bankAccountNumber: e.target.value })}
                      placeholder="e.g. 8001234567"
                      className="bg-background dark:bg-card border-border text-foreground h-8 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-0.5">Account Holder Name</label>
                    <Input
                      value={bankDetailsForm.bankAccountName}
                      onChange={(e) => setBankDetailsForm({ ...bankDetailsForm, bankAccountName: e.target.value })}
                      placeholder="e.g. Dr. John Doe"
                      className="bg-background dark:bg-card border-border text-foreground h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Transfer Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Transfer Amount (LKR) *
                  </label>
                  <Input
                    type="number"
                    value={bankAmount}
                    onChange={(e) => setBankAmount(parseFloat(e.target.value) || 0)}
                    className="font-bold text-foreground bg-background dark:bg-card border-border"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Payment Reference / Txn ID <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <Input
                    value={bankReference}
                    onChange={(e) => setBankReference(e.target.value)}
                    placeholder="e.g. TXN-998822 / REF-001 (optional)"
                    className="font-mono bg-background dark:bg-card border-border text-foreground"
                  />
                </div>
              </div>

              {/* Payment Slip Upload Box */}
              <div className="border border-dashed border-blue-300 dark:border-blue-800 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <UploadCloud className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Upload Payment Slip (Image or PDF)
                  </label>
                  {uploadingSlip && (
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Uploading to S3...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleSlipUpload}
                    disabled={uploadingSlip}
                    className="bg-background dark:bg-card border-border text-foreground text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-100 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-200 cursor-pointer"
                  />
                  {bankSlipUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBankSlipFile(null);
                        setBankSlipUrl("");
                      }}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Remove slip"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {bankSlipUrl && (
                  <div className="flex items-center justify-between bg-background dark:bg-card border border-blue-200 dark:border-blue-800 rounded p-2 text-xs">
                    <span className="text-foreground font-medium truncate max-w-[280px] flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      {bankSlipFile?.name || "Payment Slip Attached"}
                    </span>
                    <a
                      href={getSlipViewUrl(bankSlipUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold inline-flex items-center gap-1 hover:underline text-[11px]"
                    >
                      <ExternalLink className="h-3 w-3" /> View Slip
                    </a>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Optional or required by hospital policy. Stored securely on AWS S3 and attached to the doctor payout ledger.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Remarks</label>
                <Input
                  value={bankRemarks}
                  onChange={(e) => setBankRemarks(e.target.value)}
                  placeholder="Optional bank transfer remarks"
                  className="bg-background dark:bg-card border-border text-foreground"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBankModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitBankTransfer}
              disabled={disbursingBank || uploadingSlip}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            >
              {disbursingBank ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Confirm Transfer & Print Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: DOCTOR BANK DETAILS EDIT */}
      <Dialog open={bankEditModalOpen} onOpenChange={setBankEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Update Doctor Bank Account
            </DialogTitle>
            <DialogDescription>
              Save bank transfer coordinates for Dr. {editingDoctor?.fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Bank Name</label>
              <Input
                value={doctorBankForm.bankName}
                onChange={(e) => setDoctorBankForm({ ...doctorBankForm, bankName: e.target.value })}
                placeholder="e.g. Commercial Bank of Ceylon"
                className="bg-background dark:bg-card border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Branch</label>
              <Input
                value={doctorBankForm.bankBranch}
                onChange={(e) => setDoctorBankForm({ ...doctorBankForm, bankBranch: e.target.value })}
                placeholder="e.g. Tissamaharama"
                className="bg-background dark:bg-card border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Account Number</label>
              <Input
                value={doctorBankForm.bankAccountNumber}
                onChange={(e) => setDoctorBankForm({ ...doctorBankForm, bankAccountNumber: e.target.value })}
                placeholder="e.g. 1000234567"
                className="font-mono font-bold bg-background dark:bg-card border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Account Holder Name</label>
              <Input
                value={doctorBankForm.bankAccountName}
                onChange={(e) => setDoctorBankForm({ ...doctorBankForm, bankAccountName: e.target.value })}
                placeholder="e.g. Dr. John Doe"
                className="bg-background dark:bg-card border-border text-foreground"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBankEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveDoctorBankDetails}
              disabled={savingBank}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {savingBank ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Save Bank Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: VIEW SHEET DETAILS / PATIENT ROSTER */}
      <Dialog open={!!viewSheet} onOpenChange={(open) => !open && setViewSheet(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Consultation Details & Patient Roster
            </DialogTitle>
            <DialogDescription>
              Dr. {viewSheet?.doctor?.fullName} • {viewSheet?.date ? new Date(viewSheet.date).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>

          {viewSheet && (
            <div className="space-y-4 py-2">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block">Total Revenue</span>
                  <span className="font-bold text-foreground text-sm">LKR {viewSheet.totalRevenue.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Hospital Commission</span>
                  <span className="font-bold text-red-600 dark:text-red-400 text-sm">LKR {(viewSheet.hospitalCommission || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Net Doctor Share</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">LKR {viewSheet.netDoctorPayment.toLocaleString()}</span>
                </div>
              </div>

              {/* Patient Items Table */}
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  Patients Treated ({viewSheet.patientItems?.length || 0})
                </h4>
                <div className="border border-border rounded-md overflow-hidden">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/50 dark:bg-muted/30 border-b border-border">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="py-2">#</TableHead>
                        <TableHead className="py-2">Patient Name</TableHead>
                        <TableHead className="py-2">Token #</TableHead>
                        <TableHead className="py-2 text-center">Collection</TableHead>
                        <TableHead className="py-2 text-right">Fee (LKR)</TableHead>
                        <TableHead className="py-2 text-right">Doc Share (LKR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border">
                      {viewSheet.patientItems && viewSheet.patientItems.length > 0 ? (
                        viewSheet.patientItems.map((item, idx) => {
                          const isCard = (item.collectionMethod || "CASH") !== "CASH";
                          return (
                            <TableRow key={item.id || idx} className="hover:bg-muted/30 border-b border-border">
                              <TableCell className="py-1.5 text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="py-1.5 font-medium text-foreground">{item.patientName}</TableCell>
                              <TableCell className="py-1.5 font-mono text-muted-foreground">{item.tokenNumber || "-"}</TableCell>
                              <TableCell className="py-1.5 text-center">
                                <Badge variant="outline" className={`text-[10px] ${isCard ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"}`}>
                                  {item.collectionMethod || "CASH"}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-1.5 text-right font-medium text-foreground">{item.consultationFee.toLocaleString()}</TableCell>
                              <TableCell className="py-1.5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                                {(item.doctorShare || 0).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                            No patient items recorded
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Payment Slip Attachment if present */}
              {(viewSheet.paymentSlipUrl || (viewSheet.bankDetails as any)?.slipUrl) && (
                <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="font-semibold text-foreground">Payment Slip Attached</p>
                      <p className="text-[11px] text-blue-600 dark:text-blue-300">Bank transfer receipt uploaded & verified</p>
                    </div>
                  </div>
                  <a
                    href={getSlipViewUrl(viewSheet.paymentSlipUrl || (viewSheet.bankDetails as any)?.slipUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-xs shadow-sm"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Slip
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewSheet(null)}>
              Close
            </Button>
            {viewSheet && (
              <Button
                onClick={() => triggerPrint(viewSheet)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Print Voucher
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
