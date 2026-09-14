"use client";

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, Banknote, Printer, CheckCircle } from "lucide-react";
import Link from "next/link";

interface PaymentItem {
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

interface PaymentRecord {
  id: string;
  patientId: string;
  patientName: string;
  type: string;
  description: string;
  items: PaymentItem[];
  amount: number;
  status: string;
  createdAt: string;
}

export default function ProcessPaymentPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = use(params);

  const [record, setRecord] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment form state
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetch("/api/cashier/payments").then(r => r.json()).then(d => {
      const found = d.data.find((x: PaymentRecord) => x.id === paymentId);
      if (found) {
        setRecord(found);
        if (found.status === "COMPLETED") setCompleted(true);
      }
      setLoading(false);
    });
  }, [paymentId]);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    if (method === "CASH") {
      const tendered = parseFloat(cashTendered);
      if (isNaN(tendered) || tendered < record.amount) {
        toast.error("Tendered amount must be greater than or equal to total.");
        return;
      }
    }

    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setCompleted(true);
      toast.success(`Payment successful. Receipt generated for ${record.id}.`);
    }, 1200);
  };

  const changeDue = method === "CASH" && parseFloat(cashTendered) >= (record?.amount ?? 0) 
    ? parseFloat(cashTendered) - (record?.amount ?? 0) 
    : 0;

  if (loading || !record) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/cashier/payments">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Payments
          </Button>
        </Link>
        <div className="h-6 w-px bg-border" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#3A3435]">Process Payment</h2>
          <p className="text-muted-foreground text-sm">Patient: {record.patientName} ({record.patientId})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Bill Details */}
        <Card className="shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground font-mono mb-1">{record.id}</p>
                <CardTitle className="text-xl">{record.description}</CardTitle>
                <CardDescription className="mt-1">Generated: {new Date(record.createdAt).toLocaleString()}</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary">{record.type}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b pb-2">
                  <th className="pb-3">Item Description</th>
                  <th className="pb-3 text-right">Qty</th>
                  <th className="pb-3 text-right">Unit Price</th>
                  <th className="pb-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {record.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-3 font-medium">{item.name}</td>
                    <td className="py-3 text-right text-muted-foreground">{item.qty}</td>
                    <td className="py-3 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-3 text-right font-semibold">${item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="mt-6 pt-4 border-t flex justify-between items-end">
              <p className="text-muted-foreground font-medium">Total Amount Due</p>
              <p className="text-4xl font-bold text-primary">${record.amount.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Right: Payment Gateway / Receipt */}
        <div>
          {!completed ? (
            <Card className="shadow-sm border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Select payment type to settle this bill.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePay} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div 
                      className={`border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${method === "CASH" ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-primary/50 text-muted-foreground"}`}
                      onClick={() => setMethod("CASH")}
                    >
                      <Banknote className="w-8 h-8" />
                      <span className="font-semibold text-sm">CASH</span>
                    </div>
                    <div 
                      className={`border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${method === "CARD" ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-primary/50 text-muted-foreground"}`}
                      onClick={() => setMethod("CARD")}
                    >
                      <CreditCard className="w-8 h-8" />
                      <span className="font-semibold text-sm">CARD</span>
                    </div>
                  </div>

                  {method === "CASH" && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Cash Tendered ($)</label>
                        <Input 
                          type="number" step="0.01" min={record.amount} required 
                          className="text-lg font-mono" placeholder="0.00"
                          value={cashTendered} onChange={e => setCashTendered(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">Change Due:</p>
                        <p className="text-2xl font-bold font-mono">${changeDue.toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  {method === "CARD" && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                      <div className="p-4 rounded-lg border bg-blue-50/50 text-blue-800 text-sm flex items-start gap-3">
                        <CreditCard className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>Ask patient to insert or tap card on the terminal. Amount <strong>${record.amount.toFixed(2)}</strong> will be sent automatically.</p>
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={processing} className="w-full bg-primary hover:bg-primary/90 text-white text-lg h-12">
                    {processing ? "Processing..." : `Complete Payment of $${record.amount.toFixed(2)}`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm border-2 border-green-200">
              <CardHeader className="bg-green-50/50 border-b border-green-100 text-center pb-6">
                <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl text-green-800">Payment Successful</CardTitle>
                <CardDescription className="text-green-700 mt-1">Receipt ID: RCPT-{record.id.split("-")[2]}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 text-center">
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">Amount Paid</p>
                  <p className="text-4xl font-bold text-[#3A3435]">${record.amount.toFixed(2)}</p>
                  <Badge variant="outline" className="mt-2 text-xs">{method} PAYMENT</Badge>
                </div>
                <div className="pt-4 border-t flex flex-col gap-3">
                  <Button onClick={() => toast.info("Printing receipt...")} className="w-full gap-2 text-base h-12">
                    <Printer className="w-5 h-5" /> Print Official Receipt
                  </Button>
                  <Link href="/cashier/payments">
                    <Button variant="outline" className="w-full">Return to Queue</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
