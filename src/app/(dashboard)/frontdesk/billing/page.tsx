"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Receipt, CreditCard, Banknote, Building, QrCode, CheckCircle2 } from "lucide-react";

export default function CentralizedBillingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "BANK" | "QR" | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchInvoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // Allow searching by Visit ID directly
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/invoices?visitId=${searchQuery}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
        setPaymentMethod(null);
      } else {
        toast.error("No active draft invoice found for this Visit ID.");
        setInvoice(null);
      }
    } catch (e) {
      toast.error("Failed to connect to billing engine.");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!invoice || !paymentMethod) return;
    setProcessing(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/invoices/${invoice.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: invoice.totalAmount, method: paymentMethod })
      });

      if (res.ok) {
        const updated = await res.json();
        setInvoice(updated);
        toast.success("Invoice successfully paid and closed!");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to process payment");
      }
    } catch (e) {
      toast.error("Network error during payment processing");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Receipt className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Centralized Cashier</h2>
          <p className="text-muted-foreground mt-1">Settle aggregated Visit invoices (Consultations, Pharmacy, Labs).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Col: Search & Actions */}
        <div className="md:col-span-4 space-y-6">
          <Card className="shadow-md border-t-4 border-t-primary">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Lookup Visit Invoice</CardTitle>
              <CardDescription>Enter a Visit ID (e.g. V-2026-000521) to pull all accumulated charges.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={fetchInvoice} className="flex gap-2">
                <Input 
                  placeholder="Visit ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-card text-card-foreground border-border font-mono uppercase"
                  autoFocus
                />
                <Button type="submit" disabled={loading} className="shrink-0 bg-primary text-white">
                  <Search className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Invoice Details & Payment */}
        <div className="md:col-span-8">
          {!invoice ? (
            <Card className="h-full min-h-[400px] flex items-center justify-center border-dashed bg-muted/10 shadow-none">
              <div className="text-center text-muted-foreground space-y-4">
                <Receipt className="w-16 h-16 mx-auto opacity-20" />
                <p>Search for a Visit ID to view the aggregated invoice.</p>
              </div>
            </Card>
          ) : (
            <Card className="shadow-lg border-border animate-in slide-in-from-bottom-4">
              <CardHeader className="border-b bg-muted/30 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      Invoice 
                      <span className="font-mono text-sm bg-background px-2 py-1 rounded border text-muted-foreground">
                        {invoice.id.split('-')[0].toUpperCase()}
                      </span>
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-4">
                      <span>Visit: <strong className="text-foreground">{invoice.visitId}</strong></span>
                      {invoice.patientId && <span>Patient: <strong className="text-foreground">{invoice.patientId}</strong></span>}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={
                    invoice.status === "PAID" 
                      ? "bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 text-sm uppercase font-bold" 
                      : "bg-amber-500/10 text-amber-600 border-amber-500/20 px-3 py-1 text-sm uppercase font-bold"
                  }>
                    {invoice.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-6">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Itemized Charges</h4>
                  
                  <div className="space-y-3 mb-8">
                    {invoice.lineItems?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                        <div>
                          <p className="font-medium text-foreground">{item.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px] uppercase">{item.department}</Badge>
                            {item.quantity > 1 && <span className="text-xs text-muted-foreground">{item.quantity} x LKR {item.unitPrice.toFixed(2)}</span>}
                          </div>
                        </div>
                        <div className="font-semibold text-right">
                          LKR {item.total.toFixed(2)}
                        </div>
                      </div>
                    ))}
                    
                    {(!invoice.lineItems || invoice.lineItems.length === 0) && (
                      <p className="text-sm text-muted-foreground italic">No charges found on this invoice.</p>
                    )}
                  </div>

                  <div className="border-t-2 border-dashed pt-4 flex flex-col items-end gap-1">
                    <div className="flex justify-between w-full sm:w-1/2 text-muted-foreground text-sm">
                      <span>Subtotal</span>
                      <span>LKR {invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full sm:w-1/2 font-bold text-2xl text-primary mt-2">
                      <span>Total Due</span>
                      <span>LKR {invoice.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {invoice.status === "DRAFT" && (
                  <div className="bg-muted/30 p-6 border-t mt-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Settle Invoice</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                      <Button variant={paymentMethod === "CASH" ? "default" : "outline"} className="h-14" onClick={() => setPaymentMethod("CASH")}>
                        <Banknote className="w-4 h-4 mr-2" /> Cash
                      </Button>
                      <Button variant={paymentMethod === "CARD" ? "default" : "outline"} className="h-14" onClick={() => setPaymentMethod("CARD")}>
                        <CreditCard className="w-4 h-4 mr-2" /> Card
                      </Button>
                      <Button variant={paymentMethod === "BANK" ? "default" : "outline"} className="h-14" onClick={() => setPaymentMethod("BANK")}>
                        <Building className="w-4 h-4 mr-2" /> Bank
                      </Button>
                    </div>
                    <Button 
                      className="w-full h-14 text-lg font-bold" 
                      disabled={!paymentMethod}
                      isLoading={processing}
                      loadingText="Processing Payment..."
                      onClick={handlePay}
                    >
                      Collect LKR {invoice.totalAmount.toFixed(2)}
                    </Button>
                  </div>
                )}

                {invoice.status === "PAID" && (
                  <div className="bg-green-500/5 p-6 border-t border-green-500/20 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-green-700">Payment Completed</h3>
                    <p className="text-sm text-green-600/80 mt-1">This visit's invoice has been successfully settled.</p>
                    <div className="mt-6 flex justify-center gap-4">
                      <Button variant="outline" className="border-green-500/30 text-green-700 hover:bg-green-500/10">Print Receipt</Button>
                      <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setInvoice(null); setSearchQuery(""); }}>Next Patient</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
