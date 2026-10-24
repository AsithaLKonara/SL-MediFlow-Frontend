"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Calendar,
  RefreshCw,
  Settings2,
  ArrowLeft,
  FlaskConical,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import OutsideLabView, { OutsideLabItem } from "@/components/lab/OutsideLabView";
import OutsideLabConfigModal, { CatalogTestItem } from "@/components/lab/OutsideLabConfigModal";

function FrontdeskOutsourceLabInner() {
  const router = useRouter();
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || searchParams.get("barcode") || searchParams.get("token") || "";

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [items, setItems] = useState<OutsideLabItem[]>([]);
  const [catalogTests, setCatalogTests] = useState<CatalogTestItem[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Outsource Daily Tests & Catalog
  const fetchDailyReports = async () => {
    setIsLoading(true);
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    if (!activeToken) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch Catalog Tests for configuration modal
      try {
        const catRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/catalog`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (catRes.ok) {
          const catData = await catRes.json();
          if (Array.isArray(catData)) {
            setCatalogTests(catData);
          }
        }
      } catch (e) {
        console.error("Error loading catalog:", e);
      }

      // 2. Fetch daily outsource reports
      const searchParam = initialSearch ? `&search=${encodeURIComponent(initialSearch.trim())}` : "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/lab/outsource/daily?date=${selectedDate}${searchParam}`,
        {
          headers: { Authorization: `Bearer ${activeToken}` },
        }
      );

      let fetchedItems: OutsideLabItem[] = [];

      if (res.ok) {
        const data = await res.json();
        const payload = data?.data || data;
        const rawItems = Array.isArray(payload?.items)
          ? payload.items
          : (Array.isArray(payload) ? payload : (Array.isArray(data?.items) ? data.items : []));

        if (rawItems && rawItems.length > 0) {
          fetchedItems = rawItems.map((item: any) => ({
            id: item.id,
            requestId: item.requestId || item.id,
            tokenNumber: item.tokenNumber || "LAB-01",
            bookingReference: item.bookingReference || null,
            patient: {
              fullName: item.patient?.fullName || "Patient",
              phone: item.patient?.phone || "",
              age: item.patient?.age,
              gender: item.patient?.gender,
            },
            testName: item.testName || "Outsource Test",
            category: item.category,
            outsourcedCenter: item.outsourcedCenter || "Asiri Laboratories",
            basePrice: item.basePrice || item.outsourceCost || 0,
            hospitalCommission: item.hospitalCommission || item.hospitalMarkup || 0,
            totalPrice: item.totalPrice || item.customerPrice || ((item.basePrice || item.outsourceCost || 0) + (item.hospitalCommission || item.hospitalMarkup || 0)),
            profit: item.profit !== undefined ? item.profit : (item.hospitalCommission || item.hospitalMarkup || 0),
            status: item.status || "SAMPLE_COLLECTED",
            requestedAt: item.requestedAt || new Date().toISOString(),
            reportUrl: item.reportUrl,
            handedOverAt: item.handedOverAt,
            handedOverBy: item.handedOverBy,
          }));
        }
      }

      // Fallback: If not searching and no records found from the daily endpoint, check generic requests
      if (!initialSearch && fetchedItems.length === 0 && !res.ok) {
        const reqRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/requests`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          if (Array.isArray(reqData)) {
            reqData.forEach((lr: any) => {
              (lr.items || []).forEach((item: any) => {
                const lt = item.LabTest;
                if (lt?.isOutsideTest) {
                  fetchedItems.push({
                    id: item.id || `${lr.id}-${lt.id}`,
                    requestId: lr.id,
                    tokenNumber: lr.Visit?.tokenNumber || "LAB-01",
                    bookingReference: lr.Visit?.bookingReference,
                    patient: {
                      fullName: lr.Patient?.fullName || "Patient",
                      phone: lr.Patient?.phone,
                      age: lr.Patient?.ageFallback,
                      gender: lr.Patient?.gender,
                    },
                    testName: lt.name,
                    category: lt.category,
                    outsourcedCenter: lt.outsourcedCenter || "Asiri Laboratories",
                    basePrice: lt.outsourceCost || item.price || 3500,
                    hospitalCommission: lt.hospitalCommission || 500,
                    totalPrice: item.price || (lt.outsourceCost || 3500) + (lt.hospitalCommission || 500),
                    profit: lt.hospitalCommission || 500,
                    status: (lr.outsourceStatus as any) || (lr.status === "COMPLETED" ? "COMPLETED" : "SAMPLE_COLLECTED"),
                    requestedAt: lr.requestedAt,
                    reportUrl: lr.reportUrl,
                    handedOverAt: lr.handedOverAt,
                    handedOverBy: lr.handedOverBy,
                  });
                }
              });
            });
          }
        }
      }

      setItems(fetchedItems);
    } catch (err) {
      console.error("Failed to load daily outsource reports:", err);
      toast.error("Failed to load outsource reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyReports();
  }, [token, selectedDate, initialSearch]);

  const handleUpdateStatus = async (
    itemId: string,
    newStatus: OutsideLabItem["status"],
    options?: { reportUrl?: string }
  ) => {
    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              status: newStatus,
              reportUrl: options?.reportUrl !== undefined ? options.reportUrl : i.reportUrl,
              handedOverAt: newStatus === "COMPLETED" || newStatus === "HANDED_OVER" ? new Date().toISOString() : i.handedOverAt,
            }
          : i
      )
    );

    const target = items.find((i) => i.id === itemId);
    if (!target) return;

    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    if (!activeToken) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/lab/outsource/${target.requestId || target.id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({
            status: newStatus,
            reportUrl: options?.reportUrl,
            handedOverBy: user?.fullName || "Front Desk Staff",
          }),
        }
      );

      if (!res.ok) {
        console.warn("Backend status update non-200, keeping optimistic state");
      }
    } catch (err) {
      console.error("Failed to sync status update with backend:", err);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6" data-testid="frontdesk-outsource-lab-page">
      {/* HEADER SECTION WITH BACK BUTTON */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/frontdesk")}
            className="border-neutral-800 bg-neutral-900 hover:bg-neutral-800 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded-xl border border-cyan-500/20">
                <FlaskConical className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                Outsourced Laboratory Management
              </h1>
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10 text-xs">
                Frontdesk Operations
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Process external diagnostic tests, track courier specimen dispatch to Asiri / Ruhunu labs, and manage patient report delivery.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Daily Date Selector */}
          <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-xl border border-border">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              data-testid="date-filter-picker"
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchDailyReports}
            disabled={isLoading}
            data-testid="refresh-daily-btn"
            className="h-9 px-3 gap-1.5 font-bold text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsConfigModalOpen(true)}
            data-testid="open-config-btn"
            className="h-9 px-3 gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-sm"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Commission Setup
          </Button>
        </div>
      </div>

      {/* EMBEDDED OUTSIDE LAB WORKSPACE */}
      <OutsideLabView
        items={items}
        onOpenConfigModal={() => setIsConfigModalOpen(true)}
        onUpdateStatus={handleUpdateStatus}
        initialSearch={initialSearch}
      />

      {/* PRICING & COMMISSION CONFIGURATION MODAL */}
      <OutsideLabConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        catalogTests={catalogTests}
        onSuccess={() => {
          fetchDailyReports();
        }}
      />
    </div>
  );
}

export default function FrontdeskOutsourceLabPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading Outsource Lab Portal...</div>}>
      <FrontdeskOutsourceLabInner />
    </Suspense>
  );
}
