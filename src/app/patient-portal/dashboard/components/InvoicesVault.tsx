"use client";

import React from "react";
import { Receipt, Calendar, CreditCard, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface InvoiceLineItem {
  id: string;
  description: string;
  itemType?: string;
  department?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  total?: number;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  paymentMethod?: string;
  method?: string;
  status: string;
  paidAt?: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber?: string;
  bookingReference?: string;
  visitId?: string;
  totalAmount?: number;
  subtotal?: number;
  discount?: number;
  discountAmount?: number;
  netAmount?: number;
  paidAmount?: number;
  status: "PAID" | "PENDING" | "CANCELLED" | "PARTIAL" | "DRAFT";
  createdAt: string;
  lineItems?: InvoiceLineItem[];
  payments?: PaymentRecord[];
}

interface InvoicesVaultProps {
  invoices: InvoiceRecord[];
}

export const InvoicesVault: React.FC<InvoicesVaultProps> = ({ invoices }) => {
  if (!invoices || invoices.length === 0) {
    return (
      <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700/60 mx-auto flex items-center justify-center text-zinc-400 mb-3">
          <Receipt className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-zinc-200">No Billing Invoices on File</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          Receipts and payment history from hospital frontdesk & pharmacy checkouts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map((inv) => {
        const isPaid = inv.status === "PAID";
        const dateStr = new Date(inv.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        const invoiceNum = inv.invoiceNumber || inv.id.slice(0, 8).toUpperCase();
        const barcode = inv.bookingReference || inv.visitId;
        const paymentMethod = inv.payments?.[0]?.paymentMethod || inv.payments?.[0]?.method || "CASH";
        const subtotal = Number(inv.subtotal || inv.totalAmount || 0);
        const discount = Number(inv.discount || inv.discountAmount || 0);
        const netTotal = Number(inv.netAmount || (subtotal - discount) || 0);

        return (
          <Card key={inv.id} className="bg-zinc-900/80 backdrop-blur-md border-zinc-800/80 text-white shadow-xl overflow-hidden">
            <CardHeader className="bg-zinc-900/90 border-b border-zinc-800/80 p-4 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <span>Invoice #{invoiceNum}</span>
                      {barcode && (
                        <Badge variant="outline" className="border-zinc-700 text-zinc-400 font-mono text-[11px]">
                          Barcode: {barcode}
                        </Badge>
                      )}
                    </CardTitle>
                    <span className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      isPaid
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    }`}
                  >
                    {isPaid && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                    {inv.status}
                  </Badge>

                  <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-xs">
                    <CreditCard className="w-3 h-3 mr-1 inline" />
                    {paymentMethod}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Line Items */}
              {inv.lineItems && inv.lineItems.length > 0 && (
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-12 bg-zinc-900/60 p-2 text-[11px] font-semibold text-zinc-400 border-b border-zinc-800">
                    <div className="col-span-7">Item Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-3 text-right">Amount (LKR)</div>
                  </div>

                  {inv.lineItems.map((li) => {
                    const itemCat = li.itemType || li.department || "SERVICE";
                    const total = Number(li.totalPrice ?? li.total ?? (li.quantity * li.unitPrice));

                    return (
                      <div
                        key={li.id}
                        className="grid grid-cols-12 p-2 text-xs border-b border-zinc-800/50 last:border-0 text-zinc-300"
                      >
                        <div className="col-span-7 font-medium text-zinc-200">
                          {li.description}
                          <span className="text-[10px] text-zinc-500 ml-1.5 uppercase font-mono">
                            [{itemCat}]
                          </span>
                        </div>
                        <div className="col-span-2 text-center text-zinc-400">{li.quantity}</div>
                        <div className="col-span-3 text-right font-mono text-zinc-200">
                          {total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-64 space-y-1 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal:</span>
                    <span className="font-mono">
                      LKR {subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount:</span>
                      <span className="font-mono">
                        - LKR {discount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-white border-t border-zinc-800 pt-1.5">
                    <span>Net Total:</span>
                    <span className="font-mono text-orange-400">
                      LKR {netTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
