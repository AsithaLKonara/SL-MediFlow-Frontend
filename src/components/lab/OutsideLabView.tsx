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
  Settings2
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
  outsourcedCenter: string; // "Asiri Laboratories", "Nawaloka Pathology", "Durdans Laboratory", etc.
  basePrice: number;
  hospitalCommission: number;
  totalPrice: number;
  status: "SAMPLE_COLLECTED" | "DISPATCHED" | "RESULT_RECEIVED" | "COMPLETED";
  requestedAt: string;
  reportUrl?: string | null;
}

interface OutsideLabViewProps {
  items: OutsideLabItem[];
  onOpenConfigModal: () => void;
  onUpdateStatus?: (itemId: string, newStatus: OutsideLabItem["status"]) => void;
}

export default function OutsideLabView({
  items,
  onOpenConfigModal,
  onUpdateStatus,
}: OutsideLabViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [centerFilter, setCenterFilter] = useState<string>("ALL");
  const [localItems, setLocalItems] = useState<OutsideLabItem[]>(items);

  // Sync with prop updates
  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Aggregate Partner Metrics
  const partnerMetrics = useMemo(() => {
    let asiri = 0;
    let nawaloka = 0;
    let durdans = 0;
    let totalCommission = 0;

    localItems.forEach((item) => {
      totalCommission += item.hospitalCommission || 0;
      const c = (item.outsourcedCenter || "").toLowerCase();
      if (c.includes("asiri")) asiri++;
      else if (c.includes("nawaloka")) nawaloka++;
      else if (c.includes("durdans")) durdans++;
    });

    return {
      total: localItems.length,
      asiri,
      nawaloka,
      durdans,
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
        const matchesTest = item.testName.toLowerCase().includes(q);
        const matchesCenter = item.outsourcedCenter.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesToken && !matchesTest && !matchesCenter) {
          return false;
        }
      }

      return true;
    });
  }, [localItems, centerFilter, searchQuery]);

  const handleAdvanceStatus = (item: OutsideLabItem) => {
    let nextStatus: OutsideLabItem["status"] = "DISPATCHED";
    if (item.status === "SAMPLE_COLLECTED") nextStatus = "DISPATCHED";
    else if (item.status === "DISPATCHED") nextStatus = "RESULT_RECEIVED";
    else if (item.status === "RESULT_RECEIVED") nextStatus = "COMPLETED";
    else nextStatus = "SAMPLE_COLLECTED";

    setLocalItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i))
    );

    if (onUpdateStatus) {
      onUpdateStatus(item.id, nextStatus);
    }
    toast.success(`Updated status for ${item.testName} to ${nextStatus.replace(/_/g, " ")}`);
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
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 font-bold">
            <Truck className="w-3 h-3 mr-1" /> Dispatched to Lab
          </Badge>
        );
      case "RESULT_RECEIVED":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 font-bold">
            <FileText className="w-3 h-3 mr-1" /> Result Received
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Completed & Attached
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
                Nawaloka Pathology
              </p>
              <p className="text-2xl font-black text-blue-600 mt-1" data-testid="stat-nawaloka">
                {partnerMetrics.nawaloka}
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Durdans Laboratory
              </p>
              <p className="text-2xl font-black text-purple-600 mt-1" data-testid="stat-durdans">
                {partnerMetrics.durdans}
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Hospital Commission
              </p>
              <p className="text-2xl font-black text-foreground mt-1" data-testid="stat-commission">
                LKR {partnerMetrics.totalCommission.toLocaleString()}
              </p>
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
          {["ALL", "Asiri", "Nawaloka", "Durdans"].map((center) => (
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
                    {/* Token */}
                    <td className="p-3.5 pl-4">
                      <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-muted text-foreground border">
                        #{item.tokenNumber}
                      </span>
                      {item.bookingReference && (
                        <span className="block text-[10px] font-mono text-muted-foreground mt-1 truncate max-w-[90px]">
                          {item.bookingReference}
                        </span>
                      )}
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
                          Base: <span className="font-semibold text-foreground">LKR {item.basePrice.toLocaleString()}</span>
                        </div>
                        <div className="text-[11px] text-emerald-600 font-bold" data-testid={`commission-val-${item.id}`}>
                          Comm: +LKR {item.hospitalCommission.toLocaleString()}
                        </div>
                        <div className="text-xs font-black text-blue-600 pt-0.5 border-t border-dashed">
                          Bill: LKR {item.totalPrice.toLocaleString()}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      <div data-testid={`status-badge-${item.id}`}>
                        {getStatusBadge(item.status)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 pr-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdvanceStatus(item)}
                        data-testid={`advance-status-btn-${item.id}`}
                        className="h-8 text-xs font-bold gap-1 bg-background hover:bg-muted"
                      >
                        {item.status === "SAMPLE_COLLECTED" && "Dispatch"}
                        {item.status === "DISPATCHED" && "Mark Received"}
                        {item.status === "RESULT_RECEIVED" && "Complete"}
                        {item.status === "COMPLETED" && "Reset"}
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
