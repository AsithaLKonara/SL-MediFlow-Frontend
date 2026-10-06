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

export function POSHistoryModal() {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const performPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Receipt",
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

  const handlePrint = (invoice: any) => {
    // Format invoice data into receiptData expected by MergedReceiptTemplate
    const items = invoice.lineItems.map((li: any) => ({
      name: li.description,
      qty: li.quantity,
      price: li.unitPrice,
      total: li.total
    }));

    setReceiptData({
      receiptId: invoice.id,
      date: invoice.createdAt,
      items,
      subtotal: invoice.totalAmount, // Assuming subtotal = totalAmount since discount isn't present
      total: invoice.totalAmount
    });

    // Wait a tick for state to update and template to render, then print
    setTimeout(() => {
      performPrint();
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* @ts-expect-error asChild is a valid prop for standard Radix but Base UI typings might miss it */}
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4 mr-2" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>POS History</DialogTitle>
        </DialogHeader>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by Invoice ID or Patient Phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex-1 overflow-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Invoice ID</th>
                <th className="p-2 text-left">Patient/Phone</th>
                <th className="p-2 text-right">Total (LKR)</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No history found.</td></tr>
              ) : history.map(inv => (
                <tr key={inv.id} className="border-b">
                  <td className="p-2">{new Date(inv.createdAt).toLocaleString()}</td>
                  <td className="p-2 font-mono text-xs">{inv.id.substring(0,8).toUpperCase()}</td>
                  <td className="p-2">{inv.Patient?.fullName || "Walk-in"} {inv.Patient?.phone ? `(${inv.Patient.phone})` : ""}</td>
                  <td className="p-2 text-right">{inv.totalAmount.toFixed(2)}</td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => handlePrint(inv)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {receiptData && (
          <MergedReceiptTemplate 
            ref={printRef} 
            receiptData={receiptData} 
            tokens={[]} 
            cashierName={user?.fullName || "Unknown"}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
