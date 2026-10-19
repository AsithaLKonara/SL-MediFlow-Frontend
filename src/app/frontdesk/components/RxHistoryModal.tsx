"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { History, Search, Printer, Calendar, RefreshCw, FileText, X } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useReactToPrint } from "react-to-print";
import { PrescriptionReceipt } from "./PrintTemplates/PrescriptionReceipt";
import { triggerPrinterAutoCut } from "@/lib/printerAutoCut";

interface RxHistoryModalProps {
  trigger?: React.ReactNode;
}

export function RxHistoryModal({ trigger }: RxHistoryModalProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  
  const [selectedRxForPrint, setSelectedRxForPrint] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const performPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Prescription",
    onAfterPrint: () => {
      triggerPrinterAutoCut().catch(e => console.warn("Auto cut error:", e));
    }
  });

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedDate) params.append("date", selectedDate);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const url = `${process.env.NEXT_PUBLIC_API_URL}/prescriptions?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : (data.data || []));
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error("Failed to fetch prescription history", e);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [token, search, selectedDate, statusFilter]);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, fetchHistory]);

  const handlePrint = (rx: any) => {
    setSelectedRxForPrint(rx);
    setTimeout(() => {
      performPrint();
    }, 150);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DISPENSED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">DISPENSED</span>;
      case "PENDING":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">PENDING</span>;
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">IN POS</span>;
      case "EXPIRED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">EXPIRED</span>;
      case "CANCELLED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">CANCELLED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">{status}</span>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        trigger ? (trigger as any) : (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
            <History className="w-3.5 h-3.5" />
            History
          </Button>
        )
      } />

      <DialogContent className="w-[95vw] max-w-5xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <DialogTitle className="text-lg font-semibold">Prescription History & Archive</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchHistory}
              disabled={loading}
              className="h-8 px-2 text-xs text-muted-foreground"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 py-3">
          {/* Search */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Rx ID, Patient, or Doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date Picker */}
          <div className="sm:col-span-4 relative flex items-center gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            {selectedDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate("")}
                className="h-9 px-2 text-xs"
                title="Clear date filter"
              >
                All Dates
              </Button>
            )}
          </div>

          {/* Status Chips */}
          <div className="sm:col-span-3 flex items-center gap-1 overflow-x-auto">
            {["ALL", "DISPENSED", "PENDING", "EXPIRED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === st
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* History Table */}
        <div className="flex-1 overflow-auto border rounded-lg bg-card/50">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-muted/70 sticky top-0 backdrop-blur-xs z-10 border-b">
              <tr>
                <th className="p-2.5 text-left font-medium">Date & Time</th>
                <th className="p-2.5 text-left font-medium">Rx ID</th>
                <th className="p-2.5 text-left font-medium">Patient</th>
                <th className="p-2.5 text-left font-medium">Doctor</th>
                <th className="p-2.5 text-left font-medium">Items Prescribed</th>
                <th className="p-2.5 text-center font-medium">Payment</th>
                <th className="p-2.5 text-center font-medium">Rx Status</th>
                <th className="p-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading prescription archive...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 opacity-30 mx-auto mb-2" />
                    No prescriptions found for the selected criteria.
                  </td>
                </tr>
              ) : (
                history.map((rx) => {
                  const rxIdShort = `RX-${rx.id.slice(-6).toUpperCase()}`;
                  const medCount = rx.items?.length || 0;
                  const labCount = rx.labRequests?.reduce((acc: number, lr: any) => acc + (lr.tests?.length || 0), 0) || 0;
                  const medPreview = rx.items?.slice(0, 2).map((i: any) => i.drugName || i.medicine?.name).join(", ");
                  const labPreview = rx.labRequests?.flatMap((lr: any) => lr.tests).slice(0, 2).join(", ");

                  return (
                    <tr key={rx.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-2.5 whitespace-nowrap text-muted-foreground">
                        <div>{new Date(rx.createdAt).toLocaleDateString()}</div>
                        <div className="text-[11px] opacity-70">
                          {new Date(rx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="p-2.5 font-mono font-semibold text-primary">
                        {rxIdShort}
                      </td>
                      <td className="p-2.5 font-medium">
                        {rx.patientName || "Walk-in"}
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {rx.doctorName || "Doctor"}
                      </td>
                      <td className="p-2.5 max-w-[220px]">
                        {medCount > 0 && (
                          <div className="text-xs truncate" title={medPreview}>
                            💊 <span className="font-medium">{medCount} med(s):</span> {medPreview}{medCount > 2 ? "..." : ""}
                          </div>
                        )}
                        {labCount > 0 && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 truncate mt-0.5" title={labPreview}>
                            🧪 <span className="font-medium">{labCount} lab(s):</span> {labPreview}{labCount > 2 ? "..." : ""}
                          </div>
                        )}
                        {medCount === 0 && labCount === 0 && (
                          <span className="text-xs text-muted-foreground italic">Consultation advice only</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {rx.invoiceStatus === "PAID" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            PAID
                          </span>
                        ) : rx.invoiceStatus === "DRAFT" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            UNPAID
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {getStatusBadge(rx.status)}
                      </td>
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-primary hover:bg-primary/10"
                          onClick={() => handlePrint(rx)}
                          title="Print Prescription"
                        >
                          <Printer className="w-4 h-4 mr-1" />
                          Print
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Hidden Printable Component */}
        <div className="hidden">
          {selectedRxForPrint && (
            <PrescriptionReceipt
              ref={printRef}
              prescriptionId={selectedRxForPrint.id}
              patientName={selectedRxForPrint.patientName || "Walk-in Patient"}
              patientAge="N/A"
              patientPhone="N/A"
              doctorName={selectedRxForPrint.doctorName || "Doctor"}
              date={new Date(selectedRxForPrint.createdAt).toLocaleDateString()}
              medicines={(selectedRxForPrint.items || []).map((item: any) => ({
                name: item.drugName || item.medicine?.name || "Medicine",
                dosage: item.dosage,
                frequency: item.frequency,
                duration: item.duration,
                instructions: item.instructions,
                dispenseQty: item.dispenseQty || null,
              }))}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
