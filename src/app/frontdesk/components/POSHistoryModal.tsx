"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { History, Search, Printer } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { MergedReceiptTemplate } from "../../../components/printing/MergedReceiptTemplate";
import { triggerPrinterAutoCut } from "@/lib/printerAutoCut";

export function POSHistoryModal() {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [tokenData, setTokenData] = useState<any[] | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const performPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Receipt",
    onAfterPrint: () => {
      triggerPrinterAutoCut().catch(e => console.warn("Auto cut error:", e));
    }
  });

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/history?search=${search}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, search]);

  const handlePrint = (item: any, mode: "ALL" | "TOKEN" | "INVOICE" = "ALL") => {
    let rData: any = null;
    let tData: any[] | null = null;

    if (item.invoice && (mode === "ALL" || mode === "INVOICE")) {
      rData = {
        receiptId: item.invoice.receiptId || item.invoice.id,
        date: item.invoice.date || item.createdAt,
        items: item.invoice.items || (item.lineItems || []).map((li: any) => ({
          name: li.description,
          qty: li.quantity,
          price: li.unitPrice,
          total: li.total,
          department: li.department
        })),
        subtotal: item.invoice.subtotal || item.totalAmount,
        total: item.invoice.total || item.totalAmount,
        paymentMethod: item.paymentMethod || "CASH"
      };
    }

    if (item.token && (mode === "ALL" || mode === "TOKEN")) {
      tData = [{
        id: item.token.id,
        refNo: item.token.refNo || item.bookingReference,
        tokenNumber: item.token.tokenNumber,
        department: item.token.department,
        status: item.token.status || item.appointmentStatus,
        doctorName: item.token.doctorName || item.doctorName,
        patientName: item.Patient?.fullName || item.token.patientName || "Walk-in Patient",
        appointmentDate: item.token.appointmentDate || item.createdAt,
        roomNumber: item.token.roomNumber || item.roomNumber
      }];
    }

    setReceiptData(rData);
    setTokenData(tData);

    setTimeout(() => {
      performPrint();
    }, 150);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <History className="w-4 h-4 mr-2" />
        History
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-5xl sm:max-w-5xl md:max-w-6xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                POS Transaction History
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unified audit trail of Tokens, Invoices, and settled customer bills.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="relative my-3">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by Invoice ID, Token No, Booking Ref, Patient Name, or Phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <div className="flex-1 overflow-auto border rounded-lg shadow-inner">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted/70 sticky top-0 backdrop-blur-sm z-10 border-b">
              <tr className="text-xs font-semibold text-muted-foreground">
                <th className="p-2.5 text-left pl-4">Date / Time</th>
                <th className="p-2.5 text-left">Type</th>
                <th className="p-2.5 text-left">Token No</th>
                <th className="p-2.5 text-left">Invoice #</th>
                <th className="p-2.5 text-left">Patient Details</th>
                <th className="p-2.5 text-left">Doctor / Service</th>
                <th className="p-2.5 text-right">Amount (LKR)</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5 text-center pr-4">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Loading POS transactions...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No matching history records found.</td></tr>
              ) : history.map((item, idx) => {
                const isVisit = item.type === "VISIT";
                const isInvoice = item.type === "INVOICE";
                const isToken = item.type === "TOKEN";

                const formattedToken = item.tokenNumber
                  ? (item.department === "LAB" ? `LAB-${item.tokenNumber}` : `TKN-${item.tokenNumber}`)
                  : "—";

                const formattedInvoice = item.invoiceId
                  ? item.invoiceId.substring(0, 8).toUpperCase()
                  : "—";

                return (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-muted/30 transition-colors">
                    <td className="p-2.5 pl-4 text-xs text-muted-foreground whitespace-nowrap">
                      <div>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-[10px] opacity-75">{new Date(item.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      {isVisit && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200">
                          TOKEN + BILL
                        </span>
                      )}
                      {isInvoice && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200">
                          BILL ONLY
                        </span>
                      )}
                      {isToken && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200">
                          TOKEN ONLY
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-xs font-semibold whitespace-nowrap">
                      {formattedToken !== "—" ? (
                        <span className="px-1.5 py-0.5 rounded bg-muted font-bold text-foreground">
                          {formattedToken}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-xs whitespace-nowrap">
                      {formattedInvoice !== "—" ? (
                        <span className="text-primary font-medium">{formattedInvoice}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-2.5 text-xs">
                      <div className="font-medium text-foreground">{item.Patient?.fullName || "Walk-in Patient"}</div>
                      {item.Patient?.phone && <div className="text-[10px] text-muted-foreground">{item.Patient.phone}</div>}
                    </td>
                    <td className="p-2.5 text-xs">
                      {item.doctorName ? (
                        <div>
                          <div className="font-medium text-foreground">{item.doctorName}</div>
                          {item.roomNumber && <div className="text-[10px] text-muted-foreground">Room {item.roomNumber}</div>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{item.department || "Pharmacy POS"}</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right text-xs whitespace-nowrap">
                      {item.totalAmount !== null && item.totalAmount !== undefined ? (
                        <div>
                          <div className="font-bold text-foreground">LKR {Number(item.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          {item.paymentMethod && (
                            <span className="text-[10px] font-medium text-muted-foreground uppercase">{item.paymentMethod}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Unbilled</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        (item.invoiceStatus === 'PAID' || item.appointmentStatus === 'COMPLETED')
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : (item.appointmentStatus === 'WAITING' || item.appointmentStatus === 'BOOKED')
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.invoiceStatus || item.appointmentStatus || "PENDING"}
                      </span>
                    </td>
                    <td className="p-2.5 pr-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {isVisit && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 px-2 text-[11px] gap-1 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                              onClick={() => handlePrint(item, "ALL")}
                              title="Print Merged Token & Bill"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              All
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-1.5 text-[10px]"
                              onClick={() => handlePrint(item, "TOKEN")}
                              title="Print Token Only"
                            >
                              Token
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-1.5 text-[10px]"
                              onClick={() => handlePrint(item, "INVOICE")}
                              title="Print Bill Only"
                            >
                              Bill
                            </Button>
                          </>
                        )}
                        {isInvoice && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => handlePrint(item, "INVOICE")}
                            title="Print Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Bill
                          </Button>
                        )}
                        {isToken && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => handlePrint(item, "TOKEN")}
                            title="Print Token"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Token
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(receiptData || tokenData) && (
          <MergedReceiptTemplate 
            ref={printRef} 
            receiptData={receiptData} 
            tokens={tokenData || []} 
            cashierName={user?.fullName || "Unknown"}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
