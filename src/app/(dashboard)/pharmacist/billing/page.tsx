"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Printer } from "lucide-react";

interface BillItem {
  name: string;
  qty: number;
  unitPrice: number;
}

let billCounter = 1001;

export default function PharmacistBillingPage() {
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [items, setItems] = useState<BillItem[]>([{ name: "", qty: 1, unitPrice: 0 }]);
  const [generating, setGenerating] = useState(false);
  const [generatedBill, setGeneratedBill] = useState<{ id: string; items: BillItem[]; total: number; patientName: string; patientId: string; issuedAt: string } | null>(null);

  const addItem = () => setItems(prev => [...prev, { name: "", qty: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof BillItem, value: string | number) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const total = items.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !patientName) { toast.error("Enter patient ID and name."); return; }
    if (items.some(i => !i.name || i.qty <= 0 || i.unitPrice <= 0)) { toast.error("Fill in all bill items."); return; }
    setGenerating(true);
    setTimeout(() => {
      const bill = {
        id: `BILL-${billCounter++}`,
        items: [...items],
        total,
        patientName,
        patientId,
        issuedAt: new Date().toISOString(),
      };
      setGeneratedBill(bill);
      setGenerating(false);
      toast.success(`Bill ${bill.id} generated for ${patientName}. Total: $${total.toFixed(2)}`);
    }, 800);
  };

  const handlePrint = () => { toast.info("Print functionality will be connected to the print service."); };
  const handleNewBill = () => { setGeneratedBill(null); setPatientId(""); setPatientName(""); setItems([{ name: "", qty: 1, unitPrice: 0 }]); };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Pharmacy Billing</h2>
        <p className="text-muted-foreground mt-1">Generate itemised pharmacy bills for medication dispensing.</p>
      </div>

      {!generatedBill ? (
        <Card className="shadow-sm max-w-3xl">
          <CardHeader>
            <CardTitle>New Pharmacy Bill</CardTitle>
            <CardDescription>Enter patient details and list the medications dispensed.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-6">
              {/* Patient Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Patient ID *</label>
                  <Input placeholder="PAT-2026-XXX" value={patientId} onChange={e => setPatientId(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Patient Name *</label>
                  <Input placeholder="Full name" value={patientName} onChange={e => setPatientName(e.target.value)} />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Medications Dispensed *</label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                </div>
                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
                  <span>Drug Name</span><span>Qty</span><span>Unit Price ($)</span><span />
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
                    <Input placeholder="e.g., Amlodipine 5mg" value={item.name} onChange={e => updateItem(idx, "name", e.target.value)} />
                    <Input type="number" min="1" value={item.qty} onChange={e => updateItem(idx, "qty", parseInt(e.target.value))} />
                    <Input type="number" min="0" step="0.01" placeholder="0.00" value={item.unitPrice || ""} onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value))} />
                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => removeItem(idx)} disabled={items.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-end">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-right min-w-[200px]">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-3xl font-bold text-primary mt-1">${total.toFixed(2)}</p>
                </div>
              </div>

              <Button type="submit" disabled={generating} className="bg-primary hover:bg-primary/90 text-white w-full">
                {generating ? "Generating Bill..." : "Generate Bill"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Generated Bill Receipt */
        <Card className="shadow-sm max-w-2xl border-2 border-primary/20">
          <CardHeader className="bg-primary/5 border-b">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">{generatedBill.id}</p>
                <CardTitle className="mt-1">Pharmacy Bill — {generatedBill.patientName}</CardTitle>
                <CardDescription>Patient ID: {generatedBill.patientId} · {new Date(generatedBill.issuedAt).toLocaleString()}</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">PAID</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b pb-2">
                  <th className="pb-3">Drug</th>
                  <th className="pb-3 text-right">Qty</th>
                  <th className="pb-3 text-right">Unit Price</th>
                  <th className="pb-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {generatedBill.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2.5 font-medium">{item.name}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{item.qty}</td>
                    <td className="py-2.5 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-semibold">${(item.qty * item.unitPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td colSpan={3} className="pt-3 text-right font-bold text-lg">Total</td>
                  <td className="pt-3 text-right font-bold text-xl text-primary">${generatedBill.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            <div className="flex gap-3">
              <Button onClick={handlePrint} variant="outline" className="gap-2"><Printer className="w-4 h-4" /> Print Receipt</Button>
              <Button onClick={handleNewBill} className="bg-primary hover:bg-primary/90 text-white">New Bill</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
