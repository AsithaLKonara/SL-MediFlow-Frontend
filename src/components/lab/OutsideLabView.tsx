"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Search,
  Filter,
  Clock,
  Truck,
  FileCheck2,
  DollarSign,
  ArrowRight,
  ExternalLink,
  UploadCloud,
  CheckCircle2,
  FileText,
  Phone,
  Sparkles,
  Settings2,
  ScanBarcode
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface OutsideLabItem {
  id: string;
  requestId: string;
  tokenNumber: string;
  bookingReference?: string | null;
  patient: {
    fullName: string;
    phone?: string;
    age?: number | string;
    gender?: string;
  };
  testName: string;
  category?: string;
  outsourcedCenter: string; // "Asiri Laboratories", "Ruhunu Hospital Diagnostics", etc.
  basePrice: number;
  hospitalCommission: number;
  totalPrice: number;
  profit?: number;
  status: "SAMPLE_COLLECTED" | "DISPATCHED" | "RESULT_RECEIVED" | "COMPLETED" | "SENT_TO_LAB" | "REPORT_RECEIVED" | "HANDED_OVER";
  requestedAt: string;
  reportUrl?: string | null;
  handedOverAt?: string | null;
  handedOverBy?: string | null;
}

interface OutsideLabViewProps {
  items: OutsideLabItem[];
  onOpenConfigModal: () => void;
  onUpdateStatus?: (itemId: string, newStatus: OutsideLabItem["status"], options?: { reportUrl?: string }) => void;
  initialSearch?: string;
}

export default function OutsideLabView({
  items,
  onOpenConfigModal,
  onUpdateStatus,
  initialSearch,
}: OutsideLabViewProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch || "");
  const [centerFilter, setCenterFilter] = useState<string>("ALL");
  const [localItems, setLocalItems] = useState<OutsideLabItem[]>(items);
  const [receivingItem, setReceivingItem] = useState<OutsideLabItem | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);

  // Sync with prop updates
  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  React.useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  // Aggregate Partner Metrics
  const partnerMetrics = useMemo(() => {
    let asiri = 0;
    let ruhunu = 0;
    let nawaloka = 0;
    let durdans = 0;
    let totalCommission = 0;
    let reportsExpected = localItems.length;
    let reportsReceived = 0;
    let handedOverCount = 0;

    localItems.forEach((item) => {
      const profit = item.profit !== undefined ? item.profit : (item.hospitalCommission || 0);
      totalCommission += profit;
      const c = (item.outsourcedCenter || "").toLowerCase();
      if (c.includes("asiri")) asiri++;
      else if (c.includes("ruhunu")) ruhunu++;
      else if (c.includes("nawaloka")) nawaloka++;
      else if (c.includes("durdans")) durdans++;

      if (item.status === "RESULT_RECEIVED" || item.status === "REPORT_RECEIVED" || item.status === "COMPLETED" || item.status === "HANDED_OVER") {
        reportsReceived++;
      }
      if (item.status === "COMPLETED" || item.status === "HANDED_OVER") {
        handedOverCount++;
      }
    });

    return {
      total: localItems.length,
      asiri,
      ruhunu,
      nawaloka,
      durdans,
      reportsExpected,
      reportsReceived,
      handedOverCount,
      totalCommission,
    };
  }, [localItems]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return localItems.filter((item) => {
      // Center filter
      if (centerFilter !== "ALL") {
        if (!item.outsourcedCenter.toLowerCase().includes(centerFilter.toLowerCase())) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.patient.fullName.toLowerCase().includes(q);
        const matchesPhone = item.patient.phone?.includes(q);
        const matchesToken = item.tokenNumber.toLowerCase().includes(q);
        const matchesBooking = item.bookingReference?.toLowerCase().includes(q);
        const matchesTest = item.testName.toLowerCase().includes(q);
        const matchesCenter = item.outsourcedCenter.toLowerCase().includes(q);
        const matchesId = item.id.toLowerCase().includes(q) || item.requestId.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesToken && !matchesBooking && !matchesTest && !matchesCenter && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [localItems, centerFilter, searchQuery]);

  const handleAdvanceStatus = (item: OutsideLabItem) => {
    if (item.status === "SAMPLE_COLLECTED") {
      // Advance to Dispatched / Sent
      const nextStatus: OutsideLabItem["status"] = "DISPATCHED";
      setLocalItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i))
      );
      if (onUpdateStatus) onUpdateStatus(item.id, nextStatus);
      toast.success(`Specimen for ${item.testName} marked as Sent to ${item.outsourcedCenter}!`);
      return;
    }

    if (item.status === "DISPATCHED" || item.status === "SENT_TO_LAB") {
      // Open modal to choose upload or mark done without upload
      setReceivingItem(item);
      return;
    }

    if (item.status === "RESULT_RECEIVED" || item.status === "REPORT_RECEIVED") {
      // Advance to Handed Over to Customer
      const nextStatus: OutsideLabItem["status"] = "COMPLETED";
      setLocalItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus, handedOverAt: new Date().toISOString() } : i))
      );
      if (onUpdateStatus) onUpdateStatus(item.id, nextStatus);
      toast.success(`Report for ${item.testName} successfully handed over to ${item.patient.fullName}!`);
      return;
    }

    if (item.status === "COMPLETED" || item.status === "HANDED_OVER") {
      // Reset
      const nextStatus: OutsideLabItem["status"] = "SAMPLE_COLLECTED";
      setLocalItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i))
      );
      if (onUpdateStatus) onUpdateStatus(item.id, nextStatus);
      toast.info(`Status reset for ${item.testName}`);
    }
  };

  const handleConfirmReceipt = (withoutReport: boolean) => {
    if (!receivingItem) return;
    setIsSubmittingReceipt(true);

    try {
      const nextStatus: OutsideLabItem["status"] = "RESULT_RECEIVED";
      const reportUrl = withoutReport ? null : (uploadedFile ? URL.createObjectURL(uploadedFile) : null);

      setLocalItems((prev) =>
        prev.map((i) => (i.id === receivingItem.id ? { ...i, status: nextStatus, reportUrl: reportUrl || i.reportUrl } : i))
      );

      if (onUpdateStatus) {
        onUpdateStatus(receivingItem.id, nextStatus, { reportUrl: reportUrl || undefined });
      }

      if (withoutReport) {
        toast.success(`Report marked as Received from ${receivingItem.outsourcedCenter} (Without upload)`);
      } else {
        toast.success(`Report received and file attached for ${receivingItem.patient.fullName}!`);
      }

      setReceivingItem(null);
      setUploadedFile(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update report receipt");
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  const getPartnerBadge = (center: string) => {
    const c = (center || "").toLowerCase();
    if (c.includes("asiri")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          Asiri Laboratories
        </span>
      );
    }
    if (c.includes("ruhunu")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
          Ruhunu Hospital Diagnostics
        </span>
      );
    }
    if (c.includes("nawaloka")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
          Nawaloka Pathology
        </span>
      );
    }
    if (c.includes("durdans")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
          Durdans Laboratory
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
        {center || "External Center"}
      </span>
    );
  };

  const getStatusBadge = (status: OutsideLabItem["status"]) => {
    switch (status) {
      case "SAMPLE_COLLECTED":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold">
            <Clock className="w-3 h-3 mr-1" /> Sample Collected
          </Badge>
        );
      case "DISPATCHED":
      case "SENT_TO_LAB":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 font-bold">
            <Truck className="w-3 h-3 mr-1" /> Sent to Lab
          </Badge>
        );
      case "RESULT_RECEIVED":
      case "REPORT_RECEIVED":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 font-bold">
            <FileText className="w-3 h-3 mr-1" /> Report Received
          </Badge>
        );
      case "COMPLETED":
      case "HANDED_OVER":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Handed Over to Customer
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6" data-testid="outside-lab-view">
      {/* PARTNER KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Asiri Laboratories
              </p>
              <p className="text-2xl font-black text-emerald-600 mt-1" data-testid="stat-asiri">
                {partnerMetrics.asiri}
              </p>
              <span className="text-[11px] text-muted-foreground">Active tests</span>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Ruhunu Diagnostics
              </p>
              <p className="text-2xl font-black text-indigo-600 mt-1" data-testid="stat-ruhunu">
                {partnerMetrics.ruhunu}
              </p>
              <span className="text-[11px] text-muted-foreground">Active tests</span>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Daily Expected Reports
              </p>
              <p className="text-2xl font-black text-blue-600 mt-1" data-testid="stat-reports">
                {partnerMetrics.reportsReceived} / {partnerMetrics.reportsExpected}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {partnerMetrics.handedOverCount} Handed Over
              </span>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <FileCheck2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Our Hospital Profit
              </p>
              <p className="text-2xl font-black text-emerald-600 mt-1" data-testid="stat-profit">
                LKR {partnerMetrics.totalCommission.toLocaleString()}
              </p>
              <span className="text-[10px] font-bold text-muted-foreground" data-testid="stat-commission">
                (Commission Margin)
              </span>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & CONTROL BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 border rounded-xl shadow-xs">
        {/* Partner Center Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["ALL", "Asiri", "Ruhunu", "Nawaloka", "Durdans"].map((center) => (
            <button
              key={center}
              type="button"
              onClick={() => setCenterFilter(center)}
              data-testid={`filter-center-${center.toLowerCase()}`}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                centerFilter === center
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {center === "ALL" ? "All Centers" : center}
            </button>
          ))}
        </div>

        {/* Search & Setup Button */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search outside tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
              data-testid="outside-search-input"
            />
          </div>

          <Button
            type="button"
            size="sm"
            onClick={onOpenConfigModal}
            data-testid="setup-commission-btn"
            className="gap-1.5 font-bold h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-sm whitespace-nowrap"
          >
            <Settings2 className="w-4 h-4" />
            Setup Commissions
          </Button>
        </div>
      </div>

      {/* OUTSIDE TESTS TABLE */}
      <Card className="border border-border/60 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/80 text-muted-foreground uppercase tracking-wider text-[11px] font-bold">
                <th className="p-3.5 pl-4">Token / Visit</th>
                <th className="p-3.5">Patient Details</th>
                <th className="p-3.5">Outsourced Test</th>
                <th className="p-3.5">Partner Center</th>
                <th className="p-3.5">Pricing Breakdown</th>
                <th className="p-3.5">Dispatch Tracking</th>
                <th className="p-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-blue-500" />
                    <p className="font-semibold text-sm">No outside lab requests found</p>
                    <p className="text-xs">Outsourced lab requests will appear here with partner dispatch tracking.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    data-testid={`outside-row-${item.id}`}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    {/* Token & Barcode */}
                    <td className="p-3.5 pl-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-muted text-foreground border">
                          #{item.tokenNumber}
                        </span>
                        {item.bookingReference && (
                          <span
                            data-testid={`barcode-${item.id}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                          >
                            <ScanBarcode className="w-3 h-3 text-blue-600" />
                            <span>{item.bookingReference}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Patient */}
                    <td className="p-3.5">
                      <span className="font-bold text-foreground block text-xs">
                        {item.patient.fullName}
                      </span>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {item.patient.age ? `${item.patient.age}y` : ""} {item.patient.gender ? `(${item.patient.gender})` : ""}
                        {item.patient.phone && ` • ${item.patient.phone}`}
                      </div>
                    </td>

                    {/* Test */}
                    <td className="p-3.5">
                      <span className="font-bold text-foreground block" data-testid={`test-name-${item.id}`}>
                        {item.testName}
                      </span>
                      {item.category && (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {item.category}
                        </span>
                      )}
                    </td>

                    {/* Partner Center */}
                    <td className="p-3.5">
                      <div data-testid={`partner-badge-${item.id}`}>
                        {getPartnerBadge(item.outsourcedCenter)}
                      </div>
                    </td>

                    {/* Financials Breakdown */}
                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        <div className="text-[11px] text-muted-foreground">
                          Partner Cost: <span className="font-semibold text-foreground">LKR {item.basePrice.toLocaleString()}</span>
                        </div>
                        <div className="text-[11px] text-emerald-600 font-bold" data-testid={`commission-val-${item.id}`}>
                          Profit/Margin: +LKR {item.hospitalCommission.toLocaleString()}
                        </div>
                        <div className="text-xs font-black text-blue-600 pt-0.5 border-t border-dashed">
                          Customer Fee: LKR {item.totalPrice.toLocaleString()}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      <div data-testid={`status-badge-${item.id}`}>
                        {getStatusBadge(item.status)}
                      </div>
                      {(item.status === "COMPLETED" || item.status === "HANDED_OVER") && item.handedOverAt && (
                        <span className="block text-[10px] text-emerald-600 font-medium mt-1">
                          Handed: {new Date(item.handedOverAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 pr-4 text-right">
                      {item.status === "SAMPLE_COLLECTED" && (
                        <Button
                          size="sm"
                          onClick={() => handleAdvanceStatus(item)}
                          data-testid={`advance-status-btn-${item.id}`}
                          className="h-8 text-xs font-bold gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                        >
                          <Truck className="w-3.5 h-3.5 mr-1" />
                          Send to Lab
                        </Button>
                      )}

                      {(item.status === "DISPATCHED" || item.status === "SENT_TO_LAB") && (
                        <Button
                          size="sm"
                          onClick={() => handleAdvanceStatus(item)}
                          data-testid={`advance-status-btn-${item.id}`}
                          className="h-8 text-xs font-bold gap-1 bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          Receive Report
                        </Button>
                      )}

                      {(item.status === "RESULT_RECEIVED" || item.status === "REPORT_RECEIVED") && (
                        <Button
                          size="sm"
                          onClick={() => handleAdvanceStatus(item)}
                          data-testid={`advance-status-btn-${item.id}`}
                          className="h-8 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Hand Over to Customer
                        </Button>
                      )}

                      {(item.status === "COMPLETED" || item.status === "HANDED_OVER") && (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Handed Over
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAdvanceStatus(item)}
                            title="Reset workflow status"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* REPORT RECEIPT MODAL DIALOG (Option to mark as done without uploading OR upload report) */}
      {receivingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Receive Outsource Lab Report
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {receivingItem.outsourcedCenter} • Token #{receivingItem.tokenNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReceivingItem(null);
                  setUploadedFile(null);
                }}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <div className="bg-muted/40 rounded-xl p-3 border space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Patient:</span>
                  <span className="font-bold text-foreground">{receivingItem.patient.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Test:</span>
                  <span className="font-bold text-foreground">{receivingItem.testName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">External Lab:</span>
                  <span className="font-bold text-purple-600">{receivingItem.outsourcedCenter}</span>
                </div>
              </div>

              {/* ACTION OPTION 1: Mark as Done without uploading */}
              <div className="p-4 rounded-xl border border-border/80 bg-background/50 hover:border-primary/50 transition-all space-y-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-foreground">
                      Physical Paper Report Received
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Mark this test report as received without uploading a digital PDF. The printed hardcopy from {receivingItem.outsourcedCenter} is ready for customer handover.
                    </p>
                    <Button
                      type="button"
                      disabled={isSubmittingReceipt}
                      onClick={() => handleConfirmReceipt(true)}
                      data-testid="mark-received-no-upload-btn"
                      className="mt-3 w-full font-bold text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Mark as Received (Without Uploading Report)
                    </Button>
                  </div>
                </div>
              </div>

              {/* ACTION OPTION 2: Optional File Upload */}
              <div className="p-4 rounded-xl border border-dashed border-border/80 bg-background/50 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 mt-0.5">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-foreground">
                      Or Attach Digital Report (Optional)
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      If you received an electronic PDF/scan from {receivingItem.outsourcedCenter}, you can attach it here.
                    </p>

                    <div className="mt-3 space-y-2">
                      <Input
                        type="file"
                        accept=".pdf,image/*"
                        data-testid="outsource-file-input"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setUploadedFile(f);
                        }}
                        className="text-xs h-9 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary file:text-primary-foreground"
                      />

                      {uploadedFile && (
                        <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selected: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}

                      <Button
                        type="button"
                        disabled={!uploadedFile || isSubmittingReceipt}
                        onClick={() => handleConfirmReceipt(false)}
                        data-testid="upload-and-receive-btn"
                        className="w-full font-bold text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                      >
                        <UploadCloud className="w-4 h-4 mr-1.5" />
                        Upload & Mark Received
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-muted/20 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setReceivingItem(null);
                  setUploadedFile(null);
                }}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
