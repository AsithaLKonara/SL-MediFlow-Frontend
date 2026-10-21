"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Building2,
  DollarSign,
  Percent,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";

export interface CatalogTestItem {
  id: string;
  name: string;
  code: string;
  price: number;
  category?: string;
  isOutsideTest?: boolean;
  hospitalCommission?: number | null;
  outsourcedCenter?: string | null;
}

interface OutsideLabConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogTests: CatalogTestItem[];
  onSuccess?: () => void;
  preselectedTestId?: string;
}

export const OUTSIDE_CENTERS = [
  "Asiri Laboratories",
  "Ruhunu Hospital Diagnostics",
  "Nawaloka Pathology",
  "Durdans Laboratory",
  "Lanka Hospitals Diagnostics",
  "Other Reference Lab"
];

export default function OutsideLabConfigModal({
  isOpen,
  onClose,
  catalogTests,
  onSuccess,
  preselectedTestId,
}: OutsideLabConfigModalProps) {
  const { token } = useAuth();
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [isOutsideTest, setIsOutsideTest] = useState(true);
  const [outsourcedCenter, setOutsourcedCenter] = useState<string>("Asiri Laboratories");
  const [customCenter, setCustomCenter] = useState<string>("");
  const [basePrice, setBasePrice] = useState<string>("3500");
  const [commissionType, setCommissionType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [commissionValue, setCommissionValue] = useState<string>("500");
  const [isSaving, setIsSaving] = useState(false);

  // Set initial selected test
  useEffect(() => {
    if (isOpen) {
      const targetId = preselectedTestId || (catalogTests.length > 0 ? catalogTests[0].id : "");
      setSelectedTestId(targetId);
    }
  }, [isOpen, preselectedTestId, catalogTests]);

  // When selected test changes, populate fields
  useEffect(() => {
    if (!selectedTestId) return;
    const test = catalogTests.find((t) => t.id === selectedTestId);
    if (test) {
      setIsOutsideTest(test.isOutsideTest ?? true);
      setBasePrice(test.price ? test.price.toString() : "3500");
      if (test.outsourcedCenter) {
        if (OUTSIDE_CENTERS.includes(test.outsourcedCenter)) {
          setOutsourcedCenter(test.outsourcedCenter);
        } else {
          setOutsourcedCenter("Other Reference Lab");
          setCustomCenter(test.outsourcedCenter);
        }
      } else {
        setOutsourcedCenter("Asiri Laboratories");
      }

      if (test.hospitalCommission !== undefined && test.hospitalCommission !== null) {
        setCommissionType("FLAT");
        setCommissionValue(test.hospitalCommission.toString());
      } else {
        setCommissionType("FLAT");
        setCommissionValue("500");
      }
    }
  }, [selectedTestId, catalogTests]);

  // Calculations
  const calculatedCommission = useMemo(() => {
    const base = parseFloat(basePrice) || 0;
    const val = parseFloat(commissionValue) || 0;
    if (commissionType === "PERCENT") {
      return (base * val) / 100;
    }
    return val;
  }, [basePrice, commissionType, commissionValue]);

  const totalPatientPrice = useMemo(() => {
    const base = parseFloat(basePrice) || 0;
    return base + calculatedCommission;
  }, [basePrice, calculatedCommission]);

  const calculatedProfit = useMemo(() => {
    return Math.max(0, totalPatientPrice - (parseFloat(basePrice) || 0));
  }, [totalPatientPrice, basePrice]);

  const effectiveCenter = outsourcedCenter === "Other Reference Lab" && customCenter.trim()
    ? customCenter.trim()
    : outsourcedCenter;

  const handleSave = async () => {
    if (!selectedTestId) {
      toast.error("Please select a lab test to configure.");
      return;
    }

    try {
      setIsSaving(true);
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");

      const payload = {
        isOutsideTest,
        outsourceCost: parseFloat(basePrice) || 0,
        price: totalPatientPrice,
        commissionType,
        hospitalCommission: parseFloat(commissionValue) || 0,
        outsourcedCenter: isOutsideTest ? effectiveCenter : null,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/tests/${selectedTestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update outside test configuration");
      }

      toast.success(
        isOutsideTest
          ? `Configured as Outside Test (${effectiveCenter}) with LKR ${calculatedCommission.toFixed(2)} hospital commission.`
          : "Updated test to In-House internal processing."
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      data-testid="outside-lab-config-modal"
    >
      <div className="bg-card text-card-foreground border rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Outside Lab & Commission Setup</h2>
              <p className="text-xs text-muted-foreground">
                Configure partner centers (Asiri, Nawaloka, Durdans) and hospital markup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="close-config-modal"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6 space-y-4">
          {/* Select Lab Test */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">
              Select Diagnostic Test to Configure
            </label>
            <select
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              data-testid="select-catalog-test"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {catalogTests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code}) - {t.isOutsideTest ? `[Outside: ${t.outsourcedCenter || "External"}]` : "[In-House]"}
                </option>
              ))}
            </select>
          </div>

          {/* Flow Mode Checkbox / Switch */}
          <div className="p-3 rounded-xl border bg-muted/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-foreground block">
                Outsource to External Reference Lab
              </span>
              <span className="text-[11px] text-muted-foreground">
                Specimen will be routed to outside partners rather than processed in-house.
              </span>
            </div>
            <input
              type="checkbox"
              checked={isOutsideTest}
              onChange={(e) => setIsOutsideTest(e.target.checked)}
              data-testid="checkbox-is-outside"
              className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
            />
          </div>

          {isOutsideTest && (
            <>
              {/* Partner Center Dropdown */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  External Reference Center Partner
                </label>
                <select
                  value={outsourcedCenter}
                  onChange={(e) => setOutsourcedCenter(e.target.value)}
                  data-testid="select-outsourced-center"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {OUTSIDE_CENTERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {outsourcedCenter === "Other Reference Lab" && (
                  <input
                    type="text"
                    value={customCenter}
                    onChange={(e) => setCustomCenter(e.target.value)}
                    placeholder="Enter Custom Partner Lab Name..."
                    className="w-full px-3 py-2 mt-2 rounded-lg border bg-background text-sm outline-none"
                  />
                )}
              </div>

              {/* Pricing Breakdown Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Partner Base Cost (LKR)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                    <input
                      type="number"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      data-testid="input-base-price"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm font-semibold outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Amount charged by external lab</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Hospital Commission / Markup
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={commissionType}
                      onChange={(e: any) => setCommissionType(e.target.value)}
                      className="px-2 py-2 rounded-lg border bg-background text-xs font-semibold outline-none"
                    >
                      <option value="FLAT">Flat (LKR)</option>
                      <option value="PERCENT">% Markup</option>
                    </select>
                    <input
                      type="number"
                      value={commissionValue}
                      onChange={(e) => setCommissionValue(e.target.value)}
                      data-testid="input-commission-value"
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-semibold outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">AMAZ Hospital commission retained</span>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Partner Center:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300" data-testid="preview-partner-name">
                    {effectiveCenter}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Base Partner Cost:</span>
                  <span className="font-semibold">LKR {(parseFloat(basePrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Hospital Commission:</span>
                  <span className="font-bold text-emerald-600" data-testid="preview-commission-amount">
                    + LKR {calculatedCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {commissionType === "PERCENT" ? `(${commissionValue}%)` : ""}
                  </span>
                </div>
                <div className="border-t border-blue-500/20 pt-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-foreground">Customer Price:</span>
                  <span className="font-black text-blue-600 text-base" data-testid="preview-total-price">
                    LKR {totalPatientPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-emerald-500/30">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">Our Calculated Profit:</span>
                  <span className="font-black text-emerald-600 text-sm" data-testid="preview-profit-amount">
                    LKR {calculatedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border hover:bg-muted text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="save-outside-config-btn"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
