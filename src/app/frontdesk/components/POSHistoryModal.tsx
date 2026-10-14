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
  const [tokenData, setTokenData] = useState<any[] | null>(null);
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

  const handlePrint = (item: any) => {
    if (item.type === "INVOICE") {
      const items = item.lineItems.map((li: any) => ({
        name: li.description,
        qty: li.quantity,
        price: li.unitPrice,
        total: li.total
      }));

      setReceiptData({
        receiptId: item.id,
        date: item.createdAt,
        items,
        subtotal: item.totalAmount, 
        total: item.totalAmount,
        paymentMethod: "CASH" // Fallback since payment method is on the payment record
      });
      setTokenData(null);
    } else {
      setTokenData([{
        id: item.id,
        refNo: item.bookingReference,
        tokenNumber: item.tokenNumber,
        department: item.department,
        status: item.status,
        doctorName: item.doctorName,
        patientName: item.Patient?.fullName || "Walk-in Patient",
        appointmentDate: item.createdAt,
        roomNumber: item.roomNumber
      }]);
      setReceiptData(null);
    }

    setTimeout(() => {
      performPrint();
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <History className="w-4 h-4 mr-2" />
        History
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl sm:max-w-5xl md:max-w-6xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>POS History</DialogTitle>
        </DialogHeader>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by ID, Token, or Phone..." 
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
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">ID / Token No</th>
                <th className="p-2 text-left">Patient/Phone</th>
                <th className="p-2 text-right">Total (LKR)</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No history found.</td></tr>
              ) : history.map((item, idx) => (
                <tr key={`${item.id}-${idx}`} className="border-b">
                  <td className="p-2">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${item.type === 'INVOICE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="p-2 font-mono text-xs">
                    {item.type === "INVOICE" ? item.id.substring(0,8).toUpperCase() : (item.department === "LAB" ? `LAB-${item.tokenNumber}` : `TKN-${item.tokenNumber}`)}
                  </td>
                  <td className="p-2">{item.Patient?.fullName || "Walk-in"} {item.Patient?.phone ? `(${item.Patient.phone})` : ""}</td>
                  <td className="p-2 text-right">{item.type === "INVOICE" ? item.totalAmount?.toFixed(2) : "-"}</td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase ${item.status === 'PAID' || item.status === 'BOOKED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => handlePrint(item)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
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
